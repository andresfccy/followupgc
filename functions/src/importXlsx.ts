import { createHash } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { logger } from 'firebase-functions'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import * as XLSX from 'xlsx'

initializeApp()

type ImportStatus = 'uploaded' | 'processing' | 'preview_ready' | 'failed' | 'cancelled'
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

const expectedColumns = ['Nombre', 'Apellidos', 'Documento'] as const
const maxPreviewRowsPerDocument = 400

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
            totalRows: rows.length,
            validRows: normalizedRows.length,
            invalidRows: rows.length - normalizedRows.length,
            membersToCreate,
            membersToUpdate,
            skipped: rows.length - normalizedRows.length,
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

async function replacePreviewRows(
  importRunRef: FirebaseFirestore.DocumentReference,
  rows: PreviewRow[],
) {
  const oldRows = await importRunRef.collection('previewRows').limit(500).get()
  const batch = getFirestore().batch()
  let operations = 0

  for (const doc of oldRows.docs) {
    batch.delete(doc.ref)
    operations += 1
  }

  rows.slice(0, maxPreviewRowsPerDocument).forEach((row) => {
    batch.set(importRunRef.collection('previewRows').doc(String(row.rowNumber)), cleanUndefined(row))
    operations += 1
  })

  if (operations) {
    await batch.commit()
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
