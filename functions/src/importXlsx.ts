import { createHash } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import * as XLSX from 'xlsx'

initializeApp()

type ImportStatus =
  | 'uploaded'
  | 'processing'
  | 'preview_ready'
  | 'importing'
  | 'imported'
  | 'failed'
  | 'cancelled'
type ImportSeverity = 'error' | 'warning'
type Gender = 'F' | 'M'

type ImportValidationError = {
  rowNumber: number
  field?: string
  message: string
  severity: ImportSeverity
}

type PreviewRow = {
  rowNumber: number
  action: 'create' | 'update'
  firstName: string
  lastName: string
  fullName: string
  documentIdHash: string
  gender?: Gender
  birthday?: string
  joinedAt?: string
  groupRole?: string
  semesterAttendances?: number
  isServer?: boolean
  isServing?: boolean
  warnings?: ImportValidationError[]
}

type NormalizedRow = Omit<PreviewRow, 'action' | 'documentIdHash'> & {
  documentId: string
}

type ParsedImportRows = {
  totalRows: number
  normalizedRows: NormalizedRow[]
  errors: ImportValidationError[]
}

const expectedColumns = ['Nombre', 'Apellidos', 'Documento'] as const
const maxBatchOperations = 450

export const processChurchXlsxImport = onObjectFinalized(
  {
    region: 'us-east1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const objectName = event.data.name ?? ''
    const match = objectName.match(/^imports\/([^/]+)\/([^/]+)\/source\.xlsx$/)

    if (!match) {
      logger.debug('Ignoring storage object outside import path.', { objectName })
      return
    }

    const [, groupId, importRunId] = match
    const db = getFirestore()
    const importRunRef = db.doc(`groups/${groupId}/importRuns/${importRunId}`)

    await importRunRef.set(
      {
        status: 'processing' satisfies ImportStatus,
        updatedAt: FieldValue.serverTimestamp(),
        storagePath: objectName,
      },
      { merge: true },
    )

    try {
      const [buffer] = await getStorage().bucket(event.data.bucket).file(objectName).download()
      const { totalRows, normalizedRows, errors } = parseImportRows(buffer)

      const existingDocumentHashes = await findExistingDocumentHashes(groupId, normalizedRows)
      const previewRows: PreviewRow[] = normalizedRows.map(({ documentId, ...row }) => {
        const documentIdHash = hashDocumentId(documentId)

        return {
          ...row,
          documentIdHash,
          action: existingDocumentHashes.has(documentIdHash) ? 'update' : 'create',
        }
      })
      const membersToCreate = previewRows.filter((row) => row.action === 'create').length
      const membersToUpdate = previewRows.filter((row) => row.action === 'update').length
      const errorCount = errors.filter((error) => error.severity === 'error').length
      const warningCount = errors.filter((error) => error.severity === 'warning').length

      await replacePreviewRows(importRunRef, previewRows)
      await importRunRef.set(
        {
          status: 'preview_ready' satisfies ImportStatus,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          summary: {
            totalRows,
            validRows: normalizedRows.length,
            invalidRows: totalRows - normalizedRows.length,
            membersToCreate,
            membersToUpdate,
            skipped: totalRows - normalizedRows.length,
            warnings: warningCount,
            errors: errorCount,
          },
          errors: errors.map(cleanUndefined),
          previewRowCount: previewRows.length,
        },
        { merge: true },
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo procesar el XLSX.'
      logger.error('XLSX import processing failed.', { groupId, importRunId, message })
      await importRunRef.set(
        {
          status: 'failed' satisfies ImportStatus,
          updatedAt: FieldValue.serverTimestamp(),
          completedAt: FieldValue.serverTimestamp(),
          errors: [
            {
              rowNumber: 0,
              message,
              severity: 'error' satisfies ImportSeverity,
            },
          ],
        },
        { merge: true },
      )
    }
  },
)

export const confirmChurchXlsxImport = onCall(
  {
    region: 'us-east1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Inicia sesion antes de confirmar la importacion.')
    }

    const groupId = stringFromCallable(request.data?.groupId)
    const importRunId = stringFromCallable(request.data?.importRunId)

    if (!groupId || !importRunId) {
      throw new HttpsError('invalid-argument', 'Falta el grupo o el importRun.')
    }

    const db = getFirestore()
    const importRunRef = db.doc(`groups/${groupId}/importRuns/${importRunId}`)

    await assertCanConfirmImport(db, groupId, uid)

    let importStarted = false

    try {
      const importRun = await markImportRunImporting(importRunRef, uid)
      importStarted = true
      const storagePath = stringFromCallable(importRun.storagePath)

      if (!storagePath) {
        throw new HttpsError('failed-precondition', 'El importRun no tiene archivo fuente.')
      }

      const [buffer] = await getStorage().bucket().file(storagePath).download()
      const parsedRows = parseImportRows(buffer)
      const blockingErrors = parsedRows.errors.filter((error) => error.severity === 'error')

      if (blockingErrors.length) {
        throw new HttpsError(
          'failed-precondition',
          'El archivo fuente ya no coincide con un preview valido.',
        )
      }

      const previewRows = await readPreviewRows(importRunRef)
      assertPreviewMatchesParsedRows(previewRows, parsedRows.normalizedRows)

      const existingMembers = await findExistingMemberRefsByHash(groupId, previewRows)
      const result = await writeImportedMembers({
        db,
        groupId,
        importRunId,
        rows: parsedRows.normalizedRows,
        previewRows,
        existingMembers,
      })

      await importRunRef.set(
        {
          status: 'imported' satisfies ImportStatus,
          importedAt: FieldValue.serverTimestamp(),
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          result,
        },
        { merge: true },
      )

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo confirmar la importacion.'
      if (error instanceof HttpsError) {
        if (importStarted) {
          await markImportRunFailed(importRunRef, message)
        }
        throw error
      }

      logger.error('XLSX import confirmation failed.', { groupId, importRunId, message })
      if (importStarted) {
        await markImportRunFailed(importRunRef, message)
      }
      throw new HttpsError('internal', message)
    }
  },
)

function parseImportRows(buffer: Buffer): ParsedImportRows {
  const workbook = XLSX.read(buffer, { cellDates: true, type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('El archivo XLSX no tiene hojas.')
  }

  const sheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  })

  validateRequiredColumns(rows)

  const errors: ImportValidationError[] = []
  const normalizedRows: NormalizedRow[] = []
  const seenDocumentIds = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const result = normalizeRow(row, rowNumber)

    if ('errors' in result) {
      errors.push(...result.errors)
      return
    }

    const previousRow = seenDocumentIds.get(result.row.documentId)
    if (previousRow) {
      errors.push({
        rowNumber,
        field: 'Documento',
        message: `Documento duplicado en el archivo. Ya aparece en la fila ${previousRow}.`,
        severity: 'error',
      })
      return
    }

    seenDocumentIds.set(result.row.documentId, rowNumber)
    normalizedRows.push(result.row)
    errors.push(...result.warnings)
  })

  return {
    totalRows: rows.length,
    normalizedRows,
    errors,
  }
}

function validateRequiredColumns(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    throw new Error('El archivo XLSX no tiene filas para importar.')
  }

  const columns = new Set(Object.keys(rows[0]))
  const missing = expectedColumns.filter((column) => !columns.has(column))

  if (missing.length) {
    throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}.`)
  }
}

function normalizeRow(
  row: Record<string, unknown>,
  rowNumber: number,
): { row: NormalizedRow; warnings: ImportValidationError[] } | { errors: ImportValidationError[] } {
  const errors: ImportValidationError[] = []
  const warnings: ImportValidationError[] = []
  const firstName = normalizeText(row.Nombre)
  const lastName = normalizeText(row.Apellidos)
  const documentId = normalizeText(row.Documento)
  const gender = normalizeGender(row.Género ?? row.Genero)
  const birthday = normalizeBirthday(row.Cumpleaños)
  const joinedAt = normalizeDate(row['En Grupo Desde'])
  const semesterAttendances = normalizeNumber(row['Asistencias Semestre'])

  if (!firstName) {
    errors.push(requiredError(rowNumber, 'Nombre'))
  }

  if (!lastName) {
    errors.push(requiredError(rowNumber, 'Apellidos'))
  }

  if (!documentId) {
    errors.push(requiredError(rowNumber, 'Documento'))
  }

  if (gender === 'invalid') {
    errors.push(formatError(rowNumber, 'Género', 'Genero debe ser F/M, Femenino o Masculino.'))
  }

  if (birthday === 'invalid') {
    errors.push(formatError(rowNumber, 'Cumpleaños', 'Cumpleaños debe ser una fecha no ambigua.'))
  }

  if (joinedAt === 'invalid') {
    errors.push(formatError(rowNumber, 'En Grupo Desde', 'En Grupo Desde debe ser una fecha valida.'))
  }

  if (semesterAttendances === 'invalid') {
    errors.push(
      formatError(rowNumber, 'Asistencias Semestre', 'Asistencias Semestre debe ser numerico.'),
    )
  }

  if (errors.length) {
    return { errors }
  }

  const normalizedGender = gender === 'invalid' ? undefined : gender
  const normalizedSemesterAttendances =
    semesterAttendances === 'invalid' ? undefined : semesterAttendances

  return {
    row: {
      rowNumber,
      firstName,
      lastName,
      fullName: [firstName, lastName].join(' ').trim(),
      documentId,
      gender: normalizedGender,
      birthday,
      joinedAt,
      groupRole: normalizeOptionalText(row['Rol en Grupo']),
      semesterAttendances: normalizedSemesterAttendances,
      isServer: normalizeBoolean(row.Servidor),
      isServing: normalizeBoolean(row['Esta Sirviendo']),
    },
    warnings,
  }
}

async function findExistingDocumentHashes(groupId: string, rows: NormalizedRow[]) {
  const hashes = [...new Set(rows.map((row) => hashDocumentId(row.documentId)))]
  const existing = new Set<string>()
  const db = getFirestore()

  for (let index = 0; index < hashes.length; index += 30) {
    const chunk = hashes.slice(index, index + 30)
    if (!chunk.length) continue

    const membersSnapshot = await db
      .collection(`groups/${groupId}/members`)
      .where('documentIdHash', 'in', chunk)
      .get()

    membersSnapshot.docs.forEach((doc) => {
      const value = doc.get('documentIdHash')
      if (typeof value === 'string') {
        existing.add(value)
      }
    })
  }

  return existing
}

async function findExistingMemberRefsByHash(groupId: string, rows: PreviewRow[]) {
  const hashes = [...new Set(rows.map((row) => row.documentIdHash))]
  const existing = new Map<string, FirebaseFirestore.DocumentReference>()
  const db = getFirestore()

  for (let index = 0; index < hashes.length; index += 30) {
    const chunk = hashes.slice(index, index + 30)
    if (!chunk.length) continue

    const membersSnapshot = await db
      .collection(`groups/${groupId}/members`)
      .where('documentIdHash', 'in', chunk)
      .get()

    membersSnapshot.docs.forEach((doc) => {
      const value = doc.get('documentIdHash')
      if (typeof value === 'string') {
        existing.set(value, doc.ref)
      }
    })
  }

  return existing
}

async function assertCanConfirmImport(
  db: FirebaseFirestore.Firestore,
  groupId: string,
  uid: string,
) {
  const membership = await db.doc(`groups/${groupId}/memberships/${uid}`).get()
  const role = membership.get('role')
  const status = membership.get('status')

  if (!membership.exists || status !== 'active' || !['owner', 'leader'].includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'Solo owner o leader activos pueden confirmar importaciones.',
    )
  }
}

async function markImportRunImporting(
  importRunRef: FirebaseFirestore.DocumentReference,
  uid: string,
) {
  return getFirestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(importRunRef)

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'No se encontro el importRun.')
    }

    const data = snapshot.data() ?? {}
    const status = data.status
    const summary = data.summary as { errors?: unknown } | undefined

    if (status === 'imported') {
      throw new HttpsError('failed-precondition', 'Esta importacion ya fue confirmada.')
    }

    if (status !== 'preview_ready') {
      throw new HttpsError('failed-precondition', 'El preview no esta listo para confirmar.')
    }

    if (Number(summary?.errors ?? 0) > 0) {
      throw new HttpsError('failed-precondition', 'Corrige los errores del preview antes de importar.')
    }

    transaction.set(
      importRunRef,
      {
        status: 'importing' satisfies ImportStatus,
        confirmedBy: uid,
        confirmedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    return data
  })
}

async function markImportRunFailed(
  importRunRef: FirebaseFirestore.DocumentReference,
  message: string,
) {
  await importRunRef.set(
    {
      status: 'failed' satisfies ImportStatus,
      updatedAt: FieldValue.serverTimestamp(),
      errors: [
        {
          rowNumber: 0,
          message,
          severity: 'error' satisfies ImportSeverity,
        },
      ],
    },
    { merge: true },
  )
}

async function readPreviewRows(importRunRef: FirebaseFirestore.DocumentReference) {
  const snapshot = await importRunRef.collection('previewRows').get()

  return snapshot.docs
    .map((doc) => previewRowFromData(doc.data()))
    .sort((a, b) => a.rowNumber - b.rowNumber)
}

function assertPreviewMatchesParsedRows(previewRows: PreviewRow[], normalizedRows: NormalizedRow[]) {
  if (previewRows.length !== normalizedRows.length) {
    throw new HttpsError(
      'failed-precondition',
      'El preview no coincide con el archivo fuente. Genera un nuevo preview.',
    )
  }

  const normalizedByRow = new Map(normalizedRows.map((row) => [row.rowNumber, row]))

  previewRows.forEach((previewRow) => {
    const normalizedRow = normalizedByRow.get(previewRow.rowNumber)
    const documentIdHash = normalizedRow ? hashDocumentId(normalizedRow.documentId) : ''

    if (
      !normalizedRow ||
      previewRow.documentIdHash !== documentIdHash ||
      previewRow.fullName !== normalizedRow.fullName
    ) {
      throw new HttpsError(
        'failed-precondition',
        'El preview cambio frente al archivo fuente. Genera un nuevo preview.',
      )
    }
  })
}

async function writeImportedMembers({
  db,
  groupId,
  importRunId,
  rows,
  previewRows,
  existingMembers,
}: {
  db: FirebaseFirestore.Firestore
  groupId: string
  importRunId: string
  rows: NormalizedRow[]
  previewRows: PreviewRow[]
  existingMembers: Map<string, FirebaseFirestore.DocumentReference>
}) {
  const rowsByNumber = new Map(rows.map((row) => [row.rowNumber, row]))
  const membersCollection = db.collection(`groups/${groupId}/members`)
  let created = 0
  let updated = 0
  let batch = db.batch()
  let operations = 0

  previewRows.forEach((previewRow) => {
    const row = rowsByNumber.get(previewRow.rowNumber)
    const currentMemberRef = existingMembers.get(previewRow.documentIdHash)

    if (!row) {
      throw new HttpsError(
        'failed-precondition',
        `La fila ${previewRow.rowNumber} no existe en el archivo fuente.`,
      )
    }

    if (previewRow.action === 'update' && !currentMemberRef) {
      throw new HttpsError(
        'failed-precondition',
        `La fila ${previewRow.rowNumber} ya no tiene miembro existente para actualizar.`,
      )
    }

    if (previewRow.action === 'create' && currentMemberRef) {
      throw new HttpsError(
        'failed-precondition',
        `La fila ${previewRow.rowNumber} ahora coincide con un miembro existente. Genera un nuevo preview.`,
      )
    }
  })

  async function commitIfNeeded(force = false) {
    if (operations === 0 || (!force && operations < maxBatchOperations)) return
    await batch.commit()
    batch = db.batch()
    operations = 0
  }

  for (const previewRow of previewRows) {
    const row = rowsByNumber.get(previewRow.rowNumber)
    if (!row) continue

    const currentMemberRef = existingMembers.get(previewRow.documentIdHash)
    const isUpdate = Boolean(currentMemberRef)
    const memberRef = currentMemberRef ?? membersCollection.doc()
    const now = FieldValue.serverTimestamp()
    const publicMember = cleanUndefined({
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: row.fullName,
      gender: row.gender,
      joinedAt: row.joinedAt,
      groupRole: row.groupRole,
      semesterAttendances: row.semesterAttendances,
      isServer: row.isServer,
      isServing: row.isServing,
      status: isUpdate ? undefined : 'active',
      documentIdHash: previewRow.documentIdHash,
      importedFrom: 'church-xlsx',
      lastImportRunId: importRunId,
      lastImportedAt: now,
      createdAt: isUpdate ? undefined : now,
      updatedAt: now,
    })
    const privateProfile = cleanUndefined({
      documentId: row.documentId,
      birthday: row.birthday,
      createdAt: isUpdate ? undefined : now,
      updatedAt: now,
    })

    batch.set(memberRef, publicMember, { merge: true })
    batch.set(memberRef.collection('private').doc('profile'), privateProfile, { merge: true })
    operations += 2

    if (isUpdate) {
      updated += 1
    } else {
      created += 1
    }

    await commitIfNeeded()
  }

  await commitIfNeeded(true)

  return {
    created,
    updated,
    skipped: 0,
  }
}

async function replacePreviewRows(
  importRunRef: FirebaseFirestore.DocumentReference,
  rows: PreviewRow[],
) {
  const db = getFirestore()
  let oldRows = await importRunRef.collection('previewRows').limit(maxBatchOperations).get()
  while (!oldRows.empty) {
    const deleteBatch = db.batch()

    oldRows.docs.forEach((doc) => {
      deleteBatch.delete(doc.ref)
    })

    await deleteBatch.commit()
    oldRows = await importRunRef.collection('previewRows').limit(maxBatchOperations).get()
  }

  let batch = db.batch()
  let operations = 0

  for (const row of rows) {
    batch.set(importRunRef.collection('previewRows').doc(String(row.rowNumber)), cleanUndefined(row))
    operations += 1

    if (operations >= maxBatchOperations) {
      await batch.commit()
      batch = db.batch()
      operations = 0
    }
  }

  if (operations) {
    await batch.commit()
  }
}

function previewRowFromData(data: FirebaseFirestore.DocumentData): PreviewRow {
  return {
    rowNumber: Number(data.rowNumber ?? 0),
    action: data.action === 'update' ? 'update' : 'create',
    firstName: String(data.firstName ?? ''),
    lastName: String(data.lastName ?? ''),
    fullName: String(data.fullName ?? ''),
    documentIdHash: String(data.documentIdHash ?? ''),
    gender: data.gender === 'F' || data.gender === 'M' ? data.gender : undefined,
    birthday: stringOrUndefined(data.birthday),
    joinedAt: stringOrUndefined(data.joinedAt),
    groupRole: stringOrUndefined(data.groupRole),
    semesterAttendances:
      typeof data.semesterAttendances === 'number' ? data.semesterAttendances : undefined,
    isServer: typeof data.isServer === 'boolean' ? data.isServer : undefined,
    isServing: typeof data.isServing === 'boolean' ? data.isServing : undefined,
  }
}

function cleanUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  )
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function stringFromCallable(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value)
  return text || undefined
}

function normalizeGender(value: unknown): Gender | 'invalid' | undefined {
  const text = normalizeText(value).toLowerCase()
  if (!text) return undefined
  if (['f', 'femenino', 'mujer', 'female'].includes(text)) return 'F'
  if (['m', 'masculino', 'hombre', 'male'].includes(text)) return 'M'
  return 'invalid'
}

function normalizeBirthday(value: unknown) {
  return normalizeDateLike(value, false)
}

function normalizeDate(value: unknown) {
  return normalizeDateLike(value, true)
}

function normalizeDateLike(value: unknown, includeYear: boolean) {
  const text = normalizeText(value)
  if (!text) return undefined

  const date = new Date(text)
  if (!Number.isNaN(date.getTime()) && /^\d{4}-\d{1,2}-\d{1,2}/.test(text)) {
    return includeYear ? toIsoDate(date) : toMonthDay(date)
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
  if (!slashMatch) return 'invalid'

  const first = Number(slashMatch[1])
  const second = Number(slashMatch[2])
  const year = slashMatch[3] ? normalizeYear(slashMatch[3]) : undefined

  if (first > 12 || second > 31 || first < 1 || second < 1) return 'invalid'
  if (includeYear && !year) return 'invalid'

  const month = String(first).padStart(2, '0')
  const day = String(second).padStart(2, '0')

  return includeYear ? `${year}-${month}-${day}` : `${month}-${day}`
}

function normalizeYear(value: string) {
  if (value.length === 2) return `20${value}`
  if (value.length === 4) return value
  return undefined
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toMonthDay(date: Date) {
  return date.toISOString().slice(5, 10)
}

function normalizeNumber(value: unknown): number | 'invalid' | undefined {
  const text = normalizeText(value)
  if (!text) return undefined
  const number = Number(text)
  if (!Number.isFinite(number) || !Number.isInteger(number) || number < 0) return 'invalid'
  return number
}

function normalizeBoolean(value: unknown) {
  const text = normalizeText(value).toLowerCase()
  if (!text) return false
  if (['si', 'sí', 'true', 'x', '1'].includes(text)) return true
  if (['no', 'false', '0'].includes(text)) return false
  return false
}

function hashDocumentId(documentId: string) {
  return createHash('sha256').update(documentId.trim()).digest('hex')
}

function requiredError(rowNumber: number, field: string): ImportValidationError {
  return {
    rowNumber,
    field,
    message: `${field} es requerido.`,
    severity: 'error',
  }
}

function formatError(rowNumber: number, field: string, message: string): ImportValidationError {
  return {
    rowNumber,
    field,
    message,
    severity: 'error',
  }
}
