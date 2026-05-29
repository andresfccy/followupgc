import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { firebaseRuntime } from '@/lib/firebase'

export type ExcelImportRunStatus =
  | 'uploaded'
  | 'processing'
  | 'preview_ready'
  | 'failed'
  | 'cancelled'

export type ExcelImportRunSummary = {
  totalRows: number
  validRows: number
  invalidRows: number
  membersToCreate: number
  membersToUpdate: number
  skipped: number
  warnings: number
  errors: number
}

export type RemoteImportValidationError = {
  rowNumber: number
  field?: string
  message: string
  severity: 'error' | 'warning'
}

export type ExcelImportRun = {
  id: string
  groupId: string
  startedBy: string
  source: 'church-xlsx'
  fileName?: string
  storagePath: string
  status: ExcelImportRunStatus
  startedAt?: string
  updatedAt?: string
  completedAt?: string
  summary?: ExcelImportRunSummary
  errors?: RemoteImportValidationError[]
  previewRowCount?: number
}

export type ExcelImportPreviewRow = {
  rowNumber: number
  action: 'create' | 'update'
  firstName: string
  lastName: string
  fullName: string
  documentIdHash: string
  gender?: 'F' | 'M'
  birthday?: string
  joinedAt?: string
  groupRole?: string
  semesterAttendances?: number
  isServer?: boolean
  isServing?: boolean
}

const missingFirebaseConfigMessage =
  'Firebase Storage no esta configurado. Revisa las variables VITE_FIREBASE_* del proyecto Firebase.'

function requireDb() {
  if (!firebaseRuntime.db) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.db
}

function requireStorage() {
  if (!firebaseRuntime.storage) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.storage
}

export async function createExcelImportRun(user: User, groupId: string, file: File) {
  const db = requireDb()
  const importRunRef = doc(collection(db, 'groups', groupId, 'importRuns'))
  const storagePath = `imports/${groupId}/${importRunRef.id}/source.xlsx`

  await setDoc(importRunRef, {
    groupId,
    startedBy: user.uid,
    source: 'church-xlsx',
    fileName: file.name,
    storagePath,
    status: 'uploaded',
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    importRunId: importRunRef.id,
    storagePath,
  }
}

export async function uploadExcelImportFile(storagePath: string, file: File) {
  await uploadBytes(ref(requireStorage(), storagePath), file, {
    contentType:
      file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function subscribeExcelImportRun(
  groupId: string,
  importRunId: string,
  callback: (state: { run: ExcelImportRun | null; rows: ExcelImportPreviewRow[] }) => void,
): Unsubscribe {
  const db = requireDb()
  const runRef = doc(db, 'groups', groupId, 'importRuns', importRunId)
  const rowsQuery = query(collection(runRef, 'previewRows'))
  let currentRun: ExcelImportRun | null = null
  let currentRows: ExcelImportPreviewRow[] = []

  const emit = () => callback({ run: currentRun, rows: currentRows })
  const unsubscribeRun = onSnapshot(runRef, (snapshot) => {
    currentRun = snapshot.exists() ? mapImportRun(snapshot.id, snapshot.data()) : null
    emit()
  })
  const unsubscribeRows = onSnapshot(rowsQuery, (snapshot) => {
    currentRows = snapshot.docs
      .map((rowSnapshot) => mapPreviewRow(rowSnapshot.data()))
      .sort((a, b) => a.rowNumber - b.rowNumber)
    emit()
  })

  return () => {
    unsubscribeRun()
    unsubscribeRows()
  }
}

function mapImportRun(id: string, data: DocumentData): ExcelImportRun {
  return {
    id,
    groupId: String(data.groupId ?? ''),
    startedBy: String(data.startedBy ?? ''),
    source: 'church-xlsx',
    fileName: stringOrUndefined(data.fileName),
    storagePath: String(data.storagePath ?? ''),
    status: statusOrUploaded(data.status),
    startedAt: stringOrUndefined(data.startedAt),
    updatedAt: stringOrUndefined(data.updatedAt),
    completedAt: stringOrUndefined(data.completedAt),
    summary: mapSummary(data.summary),
    errors: Array.isArray(data.errors)
      ? data.errors.map(mapValidationError).filter((error): error is RemoteImportValidationError => Boolean(error))
      : undefined,
    previewRowCount: numberOrUndefined(data.previewRowCount),
  }
}

function mapPreviewRow(data: DocumentData): ExcelImportPreviewRow {
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
    semesterAttendances: numberOrUndefined(data.semesterAttendances),
    isServer: booleanOrUndefined(data.isServer),
    isServing: booleanOrUndefined(data.isServing),
  }
}

function mapSummary(value: unknown): ExcelImportRunSummary | undefined {
  if (!value || typeof value !== 'object') return undefined
  const data = value as Record<string, unknown>

  return {
    totalRows: Number(data.totalRows ?? 0),
    validRows: Number(data.validRows ?? 0),
    invalidRows: Number(data.invalidRows ?? 0),
    membersToCreate: Number(data.membersToCreate ?? 0),
    membersToUpdate: Number(data.membersToUpdate ?? 0),
    skipped: Number(data.skipped ?? 0),
    warnings: Number(data.warnings ?? 0),
    errors: Number(data.errors ?? 0),
  }
}

function mapValidationError(value: unknown): RemoteImportValidationError | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>

  return {
    rowNumber: Number(data.rowNumber ?? 0),
    field: stringOrUndefined(data.field),
    message: String(data.message ?? ''),
    severity: data.severity === 'warning' ? 'warning' : 'error',
  }
}

function statusOrUploaded(value: unknown): ExcelImportRunStatus {
  return value === 'processing' ||
    value === 'preview_ready' ||
    value === 'failed' ||
    value === 'cancelled'
    ? value
    : 'uploaded'
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanOrUndefined(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}
