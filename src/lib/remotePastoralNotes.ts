import type { User } from 'firebase/auth'
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore'
import type { TimelineEntryType } from '@/domain/types'
import { firebaseRuntime } from '@/lib/firebase'

export type RemotePastoralNote = {
  id: string
  memberId: string
  date: string
  type: TimelineEntryType
  body: string
  createdBy: string
  createdAt?: string
  updatedAt?: string
}

export type RemotePastoralNoteInput = {
  date: string
  type: TimelineEntryType
  body: string
}

export type RemotePastoralNotesState = {
  notes: RemotePastoralNote[]
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

export function subscribeRemotePastoralNotes(
  groupId: string,
  memberId: string,
  callback: (state: RemotePastoralNotesState) => void,
): Unsubscribe {
  const notesQuery = query(
    collection(requireDb(), 'groups', groupId, 'members', memberId, 'pastoralNotes'),
    orderBy('date', 'desc'),
  )

  return onSnapshot(
    notesQuery,
    (snapshot) => {
      callback({
        notes: snapshot.docs.map((noteSnapshot) =>
          mapRemotePastoralNote(memberId, noteSnapshot.id, noteSnapshot.data()),
        ),
        error: '',
      })
    },
    (error) => {
      callback({
        notes: [],
        error: error.message || 'No se pudo cargar la bitacora remota.',
      })
    },
  )
}

export async function createRemotePastoralNote(
  user: User,
  groupId: string,
  memberId: string,
  input: RemotePastoralNoteInput,
) {
  const note = normalizePastoralNoteInput(memberId, input)

  await addDoc(collection(requireDb(), 'groups', groupId, 'members', note.memberId, 'pastoralNotes'), {
    ...note,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

function normalizePastoralNoteInput(memberId: string, input: RemotePastoralNoteInput) {
  const normalizedMemberId = memberId.trim()
  const date = input.date.trim()
  const body = input.body.trim()

  if (!normalizedMemberId) {
    throw new Error('Selecciona una persona para registrar la bitacora.')
  }

  if (!date) {
    throw new Error('Selecciona una fecha para la bitacora.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('La fecha debe tener formato YYYY-MM-DD.')
  }

  if (!body) {
    throw new Error('Escribe el comentario pastoral.')
  }

  return {
    memberId: normalizedMemberId,
    date,
    type: input.type,
    body,
  }
}

function mapRemotePastoralNote(
  memberId: string,
  id: string,
  data: DocumentData,
): RemotePastoralNote {
  return {
    id,
    memberId: stringOrFallback(data.memberId, memberId),
    date: stringOrFallback(data.date, ''),
    type: timelineEntryTypeOrFallback(data.type),
    body: stringOrFallback(data.body, ''),
    createdBy: stringOrFallback(data.createdBy, ''),
    createdAt: stringOrUndefined(data.createdAt),
    updatedAt: stringOrUndefined(data.updatedAt),
  }
}

function timelineEntryTypeOrFallback(value: unknown): TimelineEntryType {
  return value === 'prayer' || value === 'care' || value === 'milestone' ? value : 'note'
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function stringOrUndefined(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}
