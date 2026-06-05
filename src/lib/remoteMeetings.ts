import type { User } from 'firebase/auth'
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import type { SessionStatus } from '@/domain/types'
import { firebaseRuntime } from '@/lib/firebase'

export type RemoteMeeting = {
  id: string
  date: string
  status: SessionStatus
  title: string
  comment?: string
  createdBy: string
  createdAt?: string
  updatedAt?: string
}

export type RemoteMeetingInput = {
  date: string
  status: SessionStatus
  title: string
  comment?: string
}

export type RemoteMeetingsState = {
  meetings: RemoteMeeting[]
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

function requireFunctions() {
  if (!firebaseRuntime.functions) {
    throw new Error(missingFirebaseConfigMessage)
  }

  return firebaseRuntime.functions
}

export function subscribeRemoteMeetings(
  groupId: string,
  callback: (state: RemoteMeetingsState) => void,
): Unsubscribe {
  const meetingsQuery = query(
    collection(requireDb(), 'groups', groupId, 'meetings'),
    orderBy('date', 'desc'),
  )

  return onSnapshot(
    meetingsQuery,
    (snapshot) => {
      callback({
        meetings: snapshot.docs.map((meetingSnapshot) =>
          mapRemoteMeeting(meetingSnapshot.id, meetingSnapshot.data()),
        ),
        error: '',
      })
    },
    (error) => {
      callback({
        meetings: [],
        error: error.message || 'No se pudieron cargar las reuniones remotas.',
      })
    },
  )
}

export async function createRemoteMeeting(user: User, groupId: string, input: RemoteMeetingInput) {
  const meeting = normalizeMeetingInput(input)

  await addDoc(collection(requireDb(), 'groups', groupId, 'meetings'), {
    ...meeting,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateRemoteMeeting(
  groupId: string,
  meetingId: string,
  input: RemoteMeetingInput,
) {
  const meeting = normalizeMeetingInput(input)

  await updateDoc(doc(requireDb(), 'groups', groupId, 'meetings', meetingId), {
    ...meeting,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRemoteMeeting(groupId: string, meetingId: string) {
  const deleteMeeting = httpsCallable<
    { groupId: string; meetingId: string },
    { deleted: true }
  >(requireFunctions(), 'deleteMeeting')
  const result = await deleteMeeting({ groupId, meetingId })

  return result.data
}

function normalizeMeetingInput(input: RemoteMeetingInput) {
  const date = input.date.trim()
  const title = input.title.trim()
  const comment = input.comment?.trim()

  if (!date) {
    throw new Error('Selecciona una fecha para la reunion.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('La fecha debe tener formato YYYY-MM-DD.')
  }

  if (!title) {
    throw new Error('Escribe un titulo para la reunion.')
  }

  return {
    date,
    title,
    status: input.status,
    ...(comment ? { comment } : {}),
  }
}

function mapRemoteMeeting(id: string, data: DocumentData): RemoteMeeting {
  return {
    id,
    date: stringOrFallback(data.date, ''),
    status: data.status === 'cancelled' ? 'cancelled' : 'held',
    title: stringOrFallback(data.title, 'Grupo en casa'),
    comment: stringOrUndefined(data.comment),
    createdBy: stringOrFallback(data.createdBy, ''),
    createdAt: stringOrUndefined(data.createdAt),
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}
