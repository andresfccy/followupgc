import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import type { MemberGender, MemberStatus } from '@/domain/types'
import { firebaseRuntime } from '@/lib/firebase'

export type RemoteMember = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  gender?: MemberGender
  joinedAt?: string
  groupRole?: string
  semesterAttendances?: number
  isServer?: boolean
  isServing?: boolean
  status: MemberStatus
  importedFrom?: 'church-xlsx'
  lastImportRunId?: string
  createdAt?: string
  updatedAt?: string
}

export type RemoteMembersState = {
  members: RemoteMember[]
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

export function subscribeRemoteMembers(
  groupId: string,
  callback: (state: RemoteMembersState) => void,
): Unsubscribe {
  const membersQuery = query(
    collection(requireDb(), 'groups', groupId, 'members'),
    orderBy('fullName', 'asc'),
  )

  return onSnapshot(
    membersQuery,
    (snapshot) => {
      callback({
        members: snapshot.docs.map((doc) => mapRemoteMember(doc.id, doc.data())),
        error: '',
      })
    },
    (error) => {
      callback({
        members: [],
        error: error.message || 'No se pudieron cargar los miembros remotos.',
      })
    },
  )
}

function mapRemoteMember(id: string, data: DocumentData): RemoteMember {
  const firstName = stringOrFallback(data.firstName, 'Sin')
  const lastName = stringOrFallback(data.lastName, 'nombre')
  const fullName = stringOrFallback(data.fullName, `${firstName} ${lastName}`.trim())

  return {
    id,
    firstName,
    lastName,
    fullName,
    gender: data.gender === 'F' || data.gender === 'M' ? data.gender : undefined,
    joinedAt: stringOrUndefined(data.joinedAt),
    groupRole: stringOrUndefined(data.groupRole),
    semesterAttendances: numberOrUndefined(data.semesterAttendances),
    isServer: booleanOrUndefined(data.isServer),
    isServing: booleanOrUndefined(data.isServing),
    status: memberStatusOrActive(data.status),
    importedFrom: data.importedFrom === 'church-xlsx' ? 'church-xlsx' : undefined,
    lastImportRunId: stringOrUndefined(data.lastImportRunId),
    createdAt: stringOrUndefined(data.createdAt),
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function memberStatusOrActive(value: unknown): MemberStatus {
  return value === 'process' || value === 'inactive' ? value : 'active'
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

function numberOrUndefined(value: unknown) {
  return typeof value === 'number' ? value : undefined
}

function booleanOrUndefined(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}
