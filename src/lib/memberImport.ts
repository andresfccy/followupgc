import { z } from 'zod'
import type {
  ChurchMemberImportRow,
  ImportResult,
  ImportPreview,
  ImportValidationError,
  Member,
} from '@/domain/types'

export type ParseImportFile = (file: File) => Promise<ImportPreview>

export type ConfirmImport = (preview: ImportPreview) => ImportResult

export type ChurchMemberImportSourceRow = {
  Nombre?: unknown
  Apellidos?: unknown
  Documento?: unknown
  Genero?: unknown
  Género?: unknown
  Cumpleaños?: unknown
  'En Grupo Desde'?: unknown
  'Rol en Grupo'?: unknown
  'Asistencias Semestre'?: unknown
  Servidor?: unknown
  'Esta Sirviendo'?: unknown
}

const importRowSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellidos es requerido'),
  documentId: z.string().min(1, 'Documento es requerido'),
  gender: z.enum(['F', 'M']).optional(),
  birthday: z.string().regex(/^\d{2}-\d{2}$/, 'Cumpleaños debe tener formato MM-dd').optional(),
  joinedGroupAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'En Grupo Desde debe tener formato yyyy-MM-dd')
    .optional(),
  groupRole: z.string().optional(),
  semesterAttendances: z.number().int().nonnegative().optional(),
  isServer: z.boolean().optional(),
  isServing: z.boolean().optional(),
})

export async function parseImportFile(file: File): Promise<ImportPreview> {
  void file
  throw new Error('XLSX parsing is not implemented yet')
}

export function buildImportPreview(
  rows: ChurchMemberImportSourceRow[],
  existingMembers: Member[],
): ImportPreview {
  const errors: ImportValidationError[] = []
  const validRows: ChurchMemberImportRow[] = []
  const existingDocumentIds = new Set(
    existingMembers.map((member) => member.documentId).filter((documentId): documentId is string => Boolean(documentId)),
  )

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const normalized = normalizeChurchMemberImportRow(row)
    const parsed = importRowSchema.safeParse(normalized)

    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map((issue) => ({
          rowNumber,
          field: issue.path.join('.') || undefined,
          message: issue.message,
          severity: 'error' as const,
        })),
      )
      return
    }

    validRows.push(parsed.data)
  })

  const validDocumentIds = new Set(validRows.map((row) => row.documentId))
  const updateCount = [...validDocumentIds].filter((documentId) =>
    existingDocumentIds.has(documentId),
  ).length
  const createCount = validDocumentIds.size - updateCount

  return {
    validRows,
    errors,
    summary: {
      totalRows: rows.length,
      validRows: validRows.length,
      invalidRows: rows.length - validRows.length,
      createCount,
      updateCount,
    },
  }
}

function normalizeChurchMemberImportRow(
  row: ChurchMemberImportSourceRow,
): Partial<ChurchMemberImportRow> {
  return {
    firstName: normalizeText(row.Nombre),
    lastName: normalizeText(row.Apellidos),
    documentId: normalizeDocumentId(row.Documento),
    gender: normalizeGender(row.Género ?? row.Genero),
    birthday: normalizeBirthday(row.Cumpleaños),
    joinedGroupAt: normalizeDate(row['En Grupo Desde']),
    groupRole: normalizeOptionalText(row['Rol en Grupo']),
    semesterAttendances: normalizeNumber(row['Asistencias Semestre']),
    isServer: normalizeBoolean(row.Servidor),
    isServing: normalizeBoolean(row['Esta Sirviendo']),
  }
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value)
  return text || undefined
}

function normalizeDocumentId(value: unknown) {
  return normalizeText(value)
}

function normalizeGender(value: unknown) {
  const gender = normalizeText(value).toUpperCase()
  return gender === 'F' || gender === 'M' ? gender : undefined
}

function normalizeBirthday(value: unknown) {
  const birthday = normalizeText(value)
  if (!birthday) return undefined

  const match = birthday.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!match) return birthday

  const month = match[1].padStart(2, '0')
  const day = match[2].padStart(2, '0')
  return `${month}-${day}`
}

function normalizeDate(value: unknown) {
  return normalizeOptionalText(value)
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function normalizeBoolean(value: unknown) {
  const text = normalizeText(value).toLowerCase()
  if (!text) return undefined
  if (text === 'si' || text === 'sí') return true
  if (text === 'no') return false
  return undefined
}
