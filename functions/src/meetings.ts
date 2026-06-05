import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

if (!getApps().length) {
  initializeApp()
}

export const deleteMeeting = onCall(
  {
    region: 'us-east1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Inicia sesion antes de eliminar reuniones.')
    }

    const groupId = stringFromCallable(request.data?.groupId)
    const meetingId = stringFromCallable(request.data?.meetingId)

    if (!groupId || !meetingId) {
      throw new HttpsError('invalid-argument', 'Falta el grupo o la reunion.')
    }

    await deleteMeetingRecord(getFirestore(), { groupId, meetingId, uid })

    return { deleted: true }
  },
)

export async function deleteMeetingRecord(
  db: Pick<FirebaseFirestore.Firestore, 'doc'>,
  {
    groupId,
    meetingId,
    uid,
  }: {
    groupId: string
    meetingId: string
    uid: string
  },
) {
  await assertCanDeleteMeeting(db, groupId, uid)

  const meetingRef = db.doc(`groups/${groupId}/meetings/${meetingId}`)
  const meeting = await meetingRef.get()

  if (!meeting.exists) {
    throw new HttpsError('not-found', 'No se encontro la reunion.')
  }

  const childCollections = await meetingRef.listCollections()
  for (const childCollection of childCollections) {
    const childSnapshot = await childCollection.limit(1).get()
    if (!childSnapshot.empty) {
      throw new HttpsError(
        'failed-precondition',
        'No se puede eliminar una reunion con asistencia u otros registros asociados.',
      )
    }
  }

  await meetingRef.delete()
}

async function assertCanDeleteMeeting(db: Pick<FirebaseFirestore.Firestore, 'doc'>, groupId: string, uid: string) {
  const membership = await db.doc(`groups/${groupId}/memberships/${uid}`).get()
  const role = membership.get('role')
  const status = membership.get('status')

  if (!membership.exists || status !== 'active' || !['owner', 'leader'].includes(role)) {
    throw new HttpsError(
      'permission-denied',
      'Solo owner o leader activos pueden eliminar reuniones.',
    )
  }
}

function stringFromCallable(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}
