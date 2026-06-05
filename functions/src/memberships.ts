import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

if (!getApps().length) {
  initializeApp()
}

type GroupRole = 'owner' | 'leader' | 'viewer'
type MembershipStatus = 'active' | 'inactive'

type UpdateMembershipInput = {
  groupId: string
  targetUserId: string
  role: GroupRole
  status: MembershipStatus
  requesterUid: string
}

export const updateGroupMembership = onCall(
  {
    region: 'us-east1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (request) => {
    const requesterUid = request.auth?.uid
    if (!requesterUid) {
      throw new HttpsError('unauthenticated', 'Inicia sesion antes de cambiar membresias.')
    }

    const groupId = stringFromCallable(request.data?.groupId)
    const targetUserId = stringFromCallable(request.data?.targetUserId)
    const role = roleFromCallable(request.data?.role)
    const status = statusFromCallable(request.data?.status)

    if (!groupId || !targetUserId || !role || !status) {
      throw new HttpsError('invalid-argument', 'Falta grupo, usuario, rol o estado.')
    }

    await updateGroupMembershipRecord(getFirestore(), {
      groupId,
      targetUserId,
      role,
      status,
      requesterUid,
    })

    return { updated: true }
  },
)

export async function updateGroupMembershipRecord(
  db: Pick<FirebaseFirestore.Firestore, 'doc' | 'collection' | 'runTransaction'>,
  input: UpdateMembershipInput,
) {
  await db.runTransaction(async (transaction) => {
    const groupRef = db.doc(`groups/${input.groupId}`)
    const requesterRef = db.doc(`groups/${input.groupId}/memberships/${input.requesterUid}`)
    const targetRef = db.doc(`groups/${input.groupId}/memberships/${input.targetUserId}`)
    const mirrorRef = db.doc(`users/${input.targetUserId}/groupMemberships/${input.groupId}`)

    const [group, requester, target] = await Promise.all([
      transaction.get(groupRef),
      transaction.get(requesterRef),
      transaction.get(targetRef),
    ])

    if (!group.exists) {
      throw new HttpsError('not-found', 'No se encontro el grupo.')
    }

    if (!isActiveOwner(requester)) {
      throw new HttpsError(
        'permission-denied',
        'Solo owner activo puede administrar membresias.',
      )
    }

    if (!target.exists) {
      throw new HttpsError('not-found', 'No se encontro la membresia.')
    }

    if (input.role === 'owner') {
      throw new HttpsError(
        'failed-precondition',
        'Esta fase no asigna nuevos owners. Usa leader o viewer.',
      )
    }

    if (isActiveOwner(target)) {
      const activeOwners = await transaction.get(
        db
          .collection(`groups/${input.groupId}/memberships`)
          .where('role', '==', 'owner')
          .where('status', '==', 'active'),
      )

      if (activeOwners.size <= 1) {
        throw new HttpsError(
          'failed-precondition',
          'No se puede dejar el grupo sin owner activo.',
        )
      }
    }

    const nextMembership = {
      groupId: input.groupId,
      userId: input.targetUserId,
      role: input.role,
      displayName: stringField(target, 'displayName'),
      email: stringField(target, 'email'),
      joinedAt: stringField(target, 'joinedAt'),
      status: input.status,
      updatedAt: FieldValue.serverTimestamp(),
    }

    transaction.set(targetRef, nextMembership, { merge: true })
    transaction.set(
      mirrorRef,
      {
        ...nextMembership,
        groupName: stringField(group, 'name') || input.groupId,
      },
      { merge: true },
    )
  })
}

function isActiveOwner(snapshot: Pick<FirebaseFirestore.DocumentSnapshot, 'exists' | 'get'>) {
  return snapshot.exists && snapshot.get('role') === 'owner' && snapshot.get('status') === 'active'
}

function stringField(snapshot: Pick<FirebaseFirestore.DocumentSnapshot, 'get'>, field: string) {
  const value = snapshot.get(field)
  return typeof value === 'string' ? value : ''
}

function stringFromCallable(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function roleFromCallable(value: unknown): GroupRole | '' {
  return value === 'owner' || value === 'leader' || value === 'viewer' ? value : ''
}

function statusFromCallable(value: unknown): MembershipStatus | '' {
  return value === 'active' || value === 'inactive' ? value : ''
}
