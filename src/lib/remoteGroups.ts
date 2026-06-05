import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { Weekday } from '@/domain/types'
import { firebaseRuntime } from '@/lib/firebase'

export type GroupRole = 'owner' | 'leader' | 'viewer'

export type RemoteGroup = {
  id: string
  name: string
  regularWeekday?: Weekday
  createdBy: string
  createdAt: string
  updatedAt: string
  archivedAt?: string
}

export type GroupMembership = {
  groupId: string
  userId: string
  role: GroupRole
  displayName?: string
  email?: string
  joinedAt: string
  status: 'active' | 'inactive'
  updatedAt?: string
}

export type UserGroupMembership = GroupMembership & {
  groupName?: string
  updatedAt?: string
}

export type CreateRemoteGroupInput = {
  name: string
  regularWeekday?: Weekday
  makeDefault: boolean
}

export type RemoteGroupSettingsInput = {
  name: string
  regularWeekday: Weekday
}

export type RemoteGroupState = {
  group: RemoteGroup | null
  error: string
}

export type RemoteGroupMembershipsState = {
  memberships: GroupMembership[]
  error: string
}

export type UpdateRemoteMembershipInput = {
  targetUserId: string
  role: Exclude<GroupRole, 'owner'>
  status: GroupMembership['status']
}

const missingFirestoreMessage =
  'Firestore no esta configurado. Revisa las variables VITE_FIREBASE_* del proyecto Firebase.'

function requireDb() {
  if (!firebaseRuntime.db) {
    throw new Error(missingFirestoreMessage)
  }

  return firebaseRuntime.db
}

function requireFunctions() {
  if (!firebaseRuntime.functions) {
    throw new Error(missingFirestoreMessage)
  }

  return firebaseRuntime.functions
}

export async function createRemoteGroup(
  user: User,
  input: CreateRemoteGroupInput,
): Promise<UserGroupMembership> {
  const db = requireDb()
  const now = new Date().toISOString()
  const groupRef = doc(collection(db, 'groups'))
  const membershipRef = doc(db, 'groups', groupRef.id, 'memberships', user.uid)
  const userMembershipRef = doc(db, 'users', user.uid, 'groupMemberships', groupRef.id)
  const userRef = doc(db, 'users', user.uid)
  const groupName = input.name.trim()

  if (!groupName) {
    throw new Error('Escribe un nombre para el grupo remoto.')
  }

  const group: Omit<RemoteGroup, 'id'> = {
    name: groupName,
    createdBy: user.uid,
    createdAt: now,
    updatedAt: now,
    ...(typeof input.regularWeekday === 'number' ? { regularWeekday: input.regularWeekday } : {}),
  }
  const membership: GroupMembership = {
    groupId: groupRef.id,
    userId: user.uid,
    role: 'owner',
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    joinedAt: now,
    status: 'active',
  }
  const userMembership: UserGroupMembership = {
    ...membership,
    groupName,
    updatedAt: now,
  }

  const batch = writeBatch(db)
  batch.set(groupRef, group)
  batch.set(membershipRef, membership)
  batch.set(userMembershipRef, userMembership)
  batch.set(
    userRef,
    {
      uid: user.uid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      ...(input.makeDefault ? { defaultGroupId: groupRef.id } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  await batch.commit()

  return userMembership
}

export async function getUserGroupMemberships(userId: string): Promise<UserGroupMembership[]> {
  if (!firebaseRuntime.db) {
    return []
  }

  const snapshot = await getDocs(collection(firebaseRuntime.db, 'users', userId, 'groupMemberships'))

  return snapshot.docs.map(mapUserGroupMembership)
}

export function subscribeRemoteGroup(
  groupId: string,
  callback: (state: RemoteGroupState) => void,
): Unsubscribe {
  return onSnapshot(
    doc(requireDb(), 'groups', groupId),
    (snapshot) => {
      callback({
        group: snapshot.exists() ? mapRemoteGroup(snapshot.id, snapshot.data()) : null,
        error: '',
      })
    },
    (error) => {
      callback({
        group: null,
        error: error.message || 'No se pudo cargar la configuracion del grupo.',
      })
    },
  )
}

export function subscribeRemoteGroupMemberships(
  groupId: string,
  callback: (state: RemoteGroupMembershipsState) => void,
): Unsubscribe {
  return onSnapshot(
    collection(requireDb(), 'groups', groupId, 'memberships'),
    (snapshot) => {
      callback({
        memberships: snapshot.docs
          .map(mapGroupMembership)
          .sort((first, second) => {
            const roleOrder = roleSortValue(first.role) - roleSortValue(second.role)
            if (roleOrder !== 0) return roleOrder

            return membershipLabel(first).localeCompare(membershipLabel(second))
          }),
        error: '',
      })
    },
    (error) => {
      callback({
        memberships: [],
        error: error.message || 'No se pudieron cargar las membresias del grupo.',
      })
    },
  )
}

export async function setDefaultGroupId(userId: string, groupId: string): Promise<void> {
  const db = requireDb()

  await setDoc(
    doc(db, 'users', userId),
    {
      defaultGroupId: groupId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function updateRemoteGroupSettings(
  groupId: string,
  input: RemoteGroupSettingsInput,
): Promise<void> {
  const db = requireDb()
  const name = input.name.trim()

  if (!name) {
    throw new Error('Escribe un nombre para el grupo.')
  }

  if (!isWeekday(input.regularWeekday)) {
    throw new Error('Selecciona un dia regular valido.')
  }

  await updateDoc(doc(db, 'groups', groupId), {
    name,
    regularWeekday: input.regularWeekday,
    updatedAt: serverTimestamp(),
  })
}

export async function updateRemoteGroupMembership(
  groupId: string,
  input: UpdateRemoteMembershipInput,
): Promise<void> {
  const targetUserId = input.targetUserId.trim()

  if (!targetUserId) {
    throw new Error('Selecciona una membresia valida.')
  }

  if (input.role !== 'leader' && input.role !== 'viewer') {
    throw new Error('Esta fase solo permite asignar leader o viewer.')
  }

  if (!membershipStatusOrUndefined(input.status)) {
    throw new Error('Selecciona un estado valido.')
  }

  const updateMembership = httpsCallable<
    {
      groupId: string
      targetUserId: string
      role: Exclude<GroupRole, 'owner'>
      status: GroupMembership['status']
    },
    { updated: true }
  >(requireFunctions(), 'updateGroupMembership')

  await updateMembership({
    groupId,
    targetUserId,
    role: input.role,
    status: input.status,
  })
}

function mapRemoteGroup(id: string, data: DocumentData): RemoteGroup {
  return {
    id,
    name: stringOrUndefined(data.name) ?? 'FollowUpGC',
    regularWeekday: isWeekday(data.regularWeekday) ? data.regularWeekday : undefined,
    createdBy: stringOrUndefined(data.createdBy) ?? '',
    createdAt: stringOrUndefined(data.createdAt) ?? '',
    updatedAt: stringOrUndefined(data.updatedAt) ?? '',
    archivedAt: stringOrUndefined(data.archivedAt),
  }
}

function mapUserGroupMembership(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): UserGroupMembership {
  const data = snapshot.data()
  const groupId = stringOrUndefined(data.groupId) ?? snapshot.id

  return {
    groupId,
    userId: stringOrUndefined(data.userId) ?? '',
    groupName: stringOrUndefined(data.groupName),
    role: roleOrUndefined(data.role) ?? 'viewer',
    status: membershipStatusOrUndefined(data.status) ?? 'inactive',
    displayName: stringOrUndefined(data.displayName),
    email: stringOrUndefined(data.email),
    joinedAt: stringOrUndefined(data.joinedAt) ?? '',
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function mapGroupMembership(snapshot: QueryDocumentSnapshot<DocumentData>): GroupMembership {
  const data = snapshot.data()

  return {
    groupId: stringOrUndefined(data.groupId) ?? '',
    userId: stringOrUndefined(data.userId) ?? snapshot.id,
    role: roleOrUndefined(data.role) ?? 'viewer',
    status: membershipStatusOrUndefined(data.status) ?? 'inactive',
    displayName: stringOrUndefined(data.displayName),
    email: stringOrUndefined(data.email),
    joinedAt: stringOrUndefined(data.joinedAt) ?? '',
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function roleOrUndefined(value: unknown): GroupRole | undefined {
  return value === 'owner' || value === 'leader' || value === 'viewer' ? value : undefined
}

function membershipStatusOrUndefined(value: unknown): GroupMembership['status'] | undefined {
  return value === 'active' || value === 'inactive' ? value : undefined
}

function roleSortValue(role: GroupRole) {
  if (role === 'owner') return 0
  if (role === 'leader') return 1
  return 2
}

function membershipLabel(membership: GroupMembership) {
  return membership.displayName || membership.email || membership.userId
}

function isWeekday(value: unknown): value is Weekday {
  return (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6
  )
}
