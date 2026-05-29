import type { User } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
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

const missingFirestoreMessage =
  'Firestore no esta configurado. Revisa las variables VITE_FIREBASE_* del proyecto Firebase.'

function requireDb() {
  if (!firebaseRuntime.db) {
    throw new Error(missingFirestoreMessage)
  }

  return firebaseRuntime.db
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

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function roleOrUndefined(value: unknown): GroupRole | undefined {
  return value === 'owner' || value === 'leader' || value === 'viewer' ? value : undefined
}

function membershipStatusOrUndefined(value: unknown): GroupMembership['status'] | undefined {
  return value === 'active' || value === 'inactive' ? value : undefined
}
