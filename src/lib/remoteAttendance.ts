import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import type { AttendanceStatus } from '@/domain/types'
import { firebaseRuntime } from '@/lib/firebase'

export type RemoteAttendanceRecord = {
  id: string
  sessionId: string
  memberId: string
  status: AttendanceStatus
  comment?: string
  recordedBy: string
  recordedAt?: string
  updatedAt?: string
}

export type RemoteAttendanceState = {
  attendances: RemoteAttendanceRecord[]
  error: string
}

const missingFirebaseConfigMessage =
  'Firebase no esta configurado. Revisa las variables VITE_FIREBASE_* del proyecto Firebase.'

function requireDb() {
  if (!firebaseRuntime.db) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.db
}

export function subscribeRemoteAttendance(
  groupId: string,
  meetingId: string,
  callback: (state: RemoteAttendanceState) => void,
): Unsubscribe {
  const attendanceQuery = query(
    collection(requireDb(), 'groups', groupId, 'meetings', meetingId, 'attendance'),
    orderBy('memberId', 'asc'),
  )

  return onSnapshot(
    attendanceQuery,
    (snapshot) => {
      callback({
        attendances: snapshot.docs.map((attendanceSnapshot) =>
          mapRemoteAttendance(meetingId, attendanceSnapshot.id, attendanceSnapshot.data()),
        ),
        error: '',
      })
    },
    (error) => {
      callback({
        attendances: [],
        error: error.message || 'No se pudo cargar la asistencia remota.',
      })
    },
  )
}

export async function setRemoteAttendance(
  user: User,
  groupId: string,
  meetingId: string,
  memberId: string,
  status: AttendanceStatus,
) {
  const normalizedMeetingId = meetingId.trim()
  const normalizedMemberId = memberId.trim()

  if (!normalizedMeetingId || !normalizedMemberId) {
    throw new Error('Selecciona una reunion y una persona para registrar asistencia.')
  }

  await setDoc(
    doc(requireDb(), 'groups', groupId, 'meetings', normalizedMeetingId, 'attendance', normalizedMemberId),
    {
      meetingId: normalizedMeetingId,
      memberId: normalizedMemberId,
      status,
      recordedBy: user.uid,
      recordedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

function mapRemoteAttendance(
  sessionId: string,
  id: string,
  data: DocumentData,
): RemoteAttendanceRecord {
  return {
    id,
    sessionId,
    memberId: stringOrFallback(data.memberId, id),
    status: attendanceStatusOrFallback(data.status),
    comment: stringOrUndefined(data.comment),
    recordedBy: stringOrFallback(data.recordedBy, ''),
    recordedAt: stringOrUndefined(data.recordedAt),
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function attendanceStatusOrFallback(value: unknown): AttendanceStatus {
  return value === 'absent' || value === 'excused' ? value : 'present'
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}
