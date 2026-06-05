import { readFileSync } from 'node:fs'
import test, { after, before, beforeEach } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

const projectId = 'demo-followupgc-rules'
const now = '2026-05-29T00:00:00.000Z'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

after(async () => {
  await testEnv.cleanup()
})

test('signed-out users cannot read profiles, groups, memberships, or create groups', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })

  const db = testEnv.unauthenticatedContext().firestore()

  await assertFails(db.doc('users/owner-a').get())
  await assertFails(db.doc('groups/group-a').get())
  await assertFails(db.doc('groups/group-a/memberships/owner-a').get())
  await assertFails(
    db.doc('groups/group-b').set({
      name: 'Grupo B',
      createdBy: 'anonymous',
      createdAt: now,
      updatedAt: now,
    }),
  )
})

test('users can create, read, and update their own profile with allowed fields', async () => {
  const db = authedDb('alice')
  const profileRef = db.doc('users/alice')

  await assertSucceeds(
    profileRef.set({
      uid: 'alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      createdAt: now,
      updatedAt: now,
    }),
  )
  await assertSucceeds(profileRef.get())
  await assertSucceeds(
    profileRef.set(
      {
        uid: 'alice',
        displayName: 'Alice Updated',
        email: 'alice@example.com',
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('users cannot read or write another user profile', async () => {
  await seedProfile('bob')
  const aliceDb = authedDb('alice')

  await assertFails(aliceDb.doc('users/bob').get())
  await assertFails(
    aliceDb.doc('users/bob').set({
      uid: 'bob',
      displayName: 'Bob',
      email: 'bob@example.com',
      updatedAt: now,
    }),
  )
})

test('defaultGroupId is denied without active authoritative membership', async () => {
  await seedProfile('alice')
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })

  await assertFails(
    authedDb('alice').doc('users/alice').set(
      {
        uid: 'alice',
        defaultGroupId: 'group-a',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('defaultGroupId is allowed with active authoritative membership', async () => {
  await seedProfile('alice')
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'alice', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(
    authedDb('alice').doc('users/alice').set(
      {
        uid: 'alice',
        defaultGroupId: 'group-a',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('authenticated users can create a valid group and their initial owner membership', async () => {
  const db = authedDb('alice')
  const batch = db.batch()

  batch.set(db.doc('groups/group-a'), validGroup({ createdBy: 'alice' }))
  batch.set(
    db.doc('groups/group-a/memberships/alice'),
    validMembership({ groupId: 'group-a', uid: 'alice', role: 'owner' }),
  )

  await assertSucceeds(batch.commit())
})

test('users cannot create a group with createdBy set to another user', async () => {
  await assertFails(
    authedDb('alice').doc('groups/group-a').set(validGroup({ createdBy: 'bob' })),
  )
})

test('users cannot create an owner membership for another user during initial group setup', async () => {
  const db = authedDb('alice')
  const batch = db.batch()

  batch.set(db.doc('groups/group-a'), validGroup({ createdBy: 'alice' }))
  batch.set(
    db.doc('groups/group-a/memberships/bob'),
    validMembership({ groupId: 'group-a', uid: 'bob', role: 'owner' }),
  )

  await assertFails(batch.commit())
})

test('users cannot create self-owner membership later for an existing group without membership', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'alice',
    memberships: [],
  })

  await assertFails(
    authedDb('alice')
      .doc('groups/group-a/memberships/alice')
      .set(validMembership({ groupId: 'group-a', uid: 'alice', role: 'owner' })),
  )
})

test('active owner, leader, and viewer can read their group', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })

  await assertSucceeds(authedDb('owner-a').doc('groups/group-a').get())
  await assertSucceeds(authedDb('leader-a').doc('groups/group-a').get())
  await assertSucceeds(authedDb('viewer-a').doc('groups/group-a').get())
})

test('inactive users and users without membership cannot read a group', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })

  await assertFails(authedDb('inactive-a').doc('groups/group-a').get())
  await assertFails(authedDb('stranger-a').doc('groups/group-a').get())
})

test('only owner can update group settings', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'owner', status: 'inactive' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        name: 'Grupo actualizado',
        regularWeekday: 5,
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('leader-a').doc('groups/group-a').set(
      {
        name: 'Cambio no permitido',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('viewer-a').doc('groups/group-a').set(
      {
        regularWeekday: 2,
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('inactive-a').doc('groups/group-a').set(
      {
        name: 'Owner inactivo',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('stranger-a').doc('groups/group-a').set(
      {
        name: 'Sin membership',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('group settings update validates shape and keeps createdBy stable', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })

  await assertFails(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        name: '',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        regularWeekday: 9,
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        createdBy: 'other-user',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('owner-a').doc('groups/group-a').set(
      {
        name: 'Grupo actualizado',
        unexpected: true,
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('active group members can read memberships according to current rules', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })

  await assertSucceeds(authedDb('owner-a').doc('groups/group-a/memberships/leader-a').get())
  await assertSucceeds(authedDb('leader-a').doc('groups/group-a/memberships/viewer-a').get())
  await assertSucceeds(authedDb('viewer-a').doc('groups/group-a/memberships/owner-a').get())
})

test('fake user membership mirrors are denied without an authoritative membership', async () => {
  await seedProfile('alice')
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })

  await assertFails(
    authedDb('alice')
      .doc('users/alice/groupMemberships/group-a')
      .set(validUserMembershipMirror({ groupId: 'group-a', uid: 'alice', role: 'owner' })),
  )
})

test('user membership mirrors must match the authoritative role and status', async () => {
  await seedProfile('alice')
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'alice', role: 'viewer', status: 'active' },
    ],
  })

  await assertFails(
    authedDb('alice')
      .doc('users/alice/groupMemberships/group-a')
      .set(validUserMembershipMirror({ groupId: 'group-a', uid: 'alice', role: 'owner' })),
  )
  await assertSucceeds(
    authedDb('alice')
      .doc('users/alice/groupMemberships/group-a')
      .set(validUserMembershipMirror({ groupId: 'group-a', uid: 'alice', role: 'viewer' })),
  )
})

test('users cannot give themselves owner through a mirror record', async () => {
  await seedProfile('alice')
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'alice', role: 'leader', status: 'active' },
    ],
  })

  await assertFails(
    authedDb('alice')
      .doc('users/alice/groupMemberships/group-a')
      .set(validUserMembershipMirror({ groupId: 'group-a', uid: 'alice', role: 'owner' })),
  )
})

test('only owners can change membership roles or statuses', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/memberships/viewer-a')
      .set(validMembership({ groupId: 'group-a', uid: 'viewer-a', role: 'leader' })),
  )
  await assertFails(
    authedDb('leader-a')
      .doc('groups/group-a/memberships/leader-a')
      .set(validMembership({ groupId: 'group-a', uid: 'leader-a', role: 'owner' })),
  )
  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/memberships/viewer-a')
      .set(validMembership({ groupId: 'group-a', uid: 'viewer-a', role: 'owner' })),
  )
  await assertFails(
    authedDb('inactive-a')
      .doc('groups/group-a/memberships/inactive-a')
      .set(validMembership({ groupId: 'group-a', uid: 'inactive-a', role: 'owner' })),
  )
  await assertFails(
    authedDb('stranger-a')
      .doc('groups/group-a/memberships/stranger-a')
      .set(validMembership({ groupId: 'group-a', uid: 'stranger-a', role: 'owner' })),
  )
})

test('owner and leader can create, read, and update meetings', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/meeting-a')
      .set(validMeeting({ createdBy: 'owner-a' })),
  )
  await assertSucceeds(authedDb('leader-a').doc('groups/group-a/meetings/meeting-a').get())
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/meetings/meeting-a').set(
      {
        comment: 'No hubo reunion por actividad general.',
        status: 'cancelled',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('viewer, inactive, signed-out, and unaffiliated users cannot write meetings', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })

  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/meetings/meeting-viewer')
      .set(validMeeting({ createdBy: 'viewer-a' })),
  )
  await assertFails(
    authedDb('inactive-a')
      .doc('groups/group-a/meetings/meeting-inactive')
      .set(validMeeting({ createdBy: 'inactive-a' })),
  )
  await assertFails(
    authedDb('stranger-a')
      .doc('groups/group-a/meetings/meeting-stranger')
      .set(validMeeting({ createdBy: 'stranger-a' })),
  )
  await assertFails(
    testEnv
      .unauthenticatedContext()
      .firestore()
      .doc('groups/group-a/meetings/meeting-signed-out')
      .set(validMeeting({ createdBy: 'signed-out' })),
  )
})

test('viewer can read meetings but cannot update or delete them', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })
  await seedMeeting({ groupId: 'group-a', meetingId: 'meeting-a', createdBy: 'owner-a' })

  await assertSucceeds(authedDb('viewer-a').doc('groups/group-a/meetings/meeting-a').get())
  await assertFails(
    authedDb('viewer-a').doc('groups/group-a/meetings/meeting-a').set(
      {
        comment: 'Cambio no permitido',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(authedDb('viewer-a').doc('groups/group-a/meetings/meeting-a').delete())
})

test('meeting writes require the expected shape and direct delete is denied', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })
  await seedMeeting({ groupId: 'group-a', meetingId: 'meeting-a', createdBy: 'owner-a' })

  await assertFails(
    authedDb('owner-a').doc('groups/group-a/meetings/meeting-b').set({
      date: '06/04/2026',
      status: 'held',
      title: 'Grupo en casa',
      createdBy: 'owner-a',
      createdAt: now,
      updatedAt: now,
    }),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/meeting-c')
      .set({ ...validMeeting({ createdBy: 'other-user' }) }),
  )
  await assertFails(authedDb('owner-a').doc('groups/group-a/meetings/meeting-a').delete())
})

test('active members can read attendance and owner or leader can write it', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })
  await seedMeeting({ groupId: 'group-a', meetingId: 'meeting-a', createdBy: 'owner-a' })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/meeting-a/attendance/member-a')
      .set(validAttendance({ meetingId: 'meeting-a', memberId: 'member-a', recordedBy: 'owner-a' })),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/meetings/meeting-a/attendance/member-a').set(
      {
        status: 'excused',
        recordedBy: 'leader-a',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertSucceeds(
    authedDb('viewer-a').doc('groups/group-a/meetings/meeting-a/attendance/member-a').get(),
  )
})

test('viewer, inactive, signed-out, and unaffiliated users cannot write attendance', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })
  await seedMeeting({ groupId: 'group-a', meetingId: 'meeting-a', createdBy: 'owner-a' })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/meetings/meeting-a/attendance/member-a')
      .set(validAttendance({ meetingId: 'meeting-a', memberId: 'member-a', recordedBy: 'viewer-a' })),
  )
  await assertFails(
    authedDb('inactive-a')
      .doc('groups/group-a/meetings/meeting-a/attendance/member-a')
      .set(validAttendance({ meetingId: 'meeting-a', memberId: 'member-a', recordedBy: 'inactive-a' })),
  )
  await assertFails(
    authedDb('stranger-a')
      .doc('groups/group-a/meetings/meeting-a/attendance/member-a')
      .set(validAttendance({ meetingId: 'meeting-a', memberId: 'member-a', recordedBy: 'stranger-a' })),
  )
  await assertFails(
    testEnv
      .unauthenticatedContext()
      .firestore()
      .doc('groups/group-a/meetings/meeting-a/attendance/member-a')
      .set(validAttendance({ meetingId: 'meeting-a', memberId: 'member-a', recordedBy: 'signed-out' })),
  )
})

test('attendance writes require expected shape, held meeting, and existing member', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })
  await seedMeeting({ groupId: 'group-a', meetingId: 'held-meeting', createdBy: 'owner-a' })
  await seedMeeting({
    groupId: 'group-a',
    meetingId: 'cancelled-meeting',
    createdBy: 'owner-a',
    status: 'cancelled',
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertFails(
    authedDb('owner-a').doc('groups/group-a/meetings/held-meeting/attendance/member-a').set({
      ...validAttendance({ meetingId: 'held-meeting', memberId: 'member-a', recordedBy: 'owner-a' }),
      status: 'late',
    }),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/held-meeting/attendance/member-a')
      .set(validAttendance({ meetingId: 'other-meeting', memberId: 'member-a', recordedBy: 'owner-a' })),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/held-meeting/attendance/missing-member')
      .set(validAttendance({ meetingId: 'held-meeting', memberId: 'missing-member', recordedBy: 'owner-a' })),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/meetings/cancelled-meeting/attendance/member-a')
      .set(validAttendance({ meetingId: 'cancelled-meeting', memberId: 'member-a', recordedBy: 'owner-a' })),
  )
})

test('owner and leader can create and read importRuns', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/importRuns/import-owner')
      .set(validImportRun({ groupId: 'group-a', uid: 'owner-a', importRunId: 'import-owner' })),
  )
  await assertSucceeds(
    authedDb('leader-a')
      .doc('groups/group-a/importRuns/import-leader')
      .set(validImportRun({ groupId: 'group-a', uid: 'leader-a', importRunId: 'import-leader' })),
  )
  await assertSucceeds(authedDb('owner-a').doc('groups/group-a/importRuns/import-leader').get())
  await assertSucceeds(authedDb('leader-a').doc('groups/group-a/importRuns/import-owner').get())
})

test('viewer, inactive, signed-out, and unaffiliated users cannot create importRuns', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })

  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/importRuns/import-viewer')
      .set(validImportRun({ groupId: 'group-a', uid: 'viewer-a', importRunId: 'import-viewer' })),
  )
  await assertFails(
    authedDb('inactive-a')
      .doc('groups/group-a/importRuns/import-inactive')
      .set(
        validImportRun({ groupId: 'group-a', uid: 'inactive-a', importRunId: 'import-inactive' }),
      ),
  )
  await assertFails(
    authedDb('stranger-a')
      .doc('groups/group-a/importRuns/import-stranger')
      .set(
        validImportRun({ groupId: 'group-a', uid: 'stranger-a', importRunId: 'import-stranger' }),
      ),
  )
  await assertFails(
    testEnv
      .unauthenticatedContext()
      .firestore()
      .doc('groups/group-a/importRuns/import-signed-out')
      .set(
        validImportRun({
          groupId: 'group-a',
          uid: 'signed-out',
          importRunId: 'import-signed-out',
        }),
      ),
  )
})

test('clients cannot update importRuns or write previewRows', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })
  await seedImportRun({ groupId: 'group-a', uid: 'owner-a', importRunId: 'import-a' })

  await assertFails(
    authedDb('owner-a').doc('groups/group-a/importRuns/import-a').set(
      {
        status: 'preview_ready',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/importRuns/import-a/previewRows/2')
      .set({ rowNumber: 2 }),
  )
})

test('owner and leader can read previewRows, viewer cannot read previewRows', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })
  await seedImportRun({ groupId: 'group-a', uid: 'owner-a', importRunId: 'import-a' })
  await seedPreviewRow({ groupId: 'group-a', importRunId: 'import-a', rowId: '2' })

  await assertSucceeds(
    authedDb('owner-a').doc('groups/group-a/importRuns/import-a/previewRows/2').get(),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/importRuns/import-a/previewRows/2').get(),
  )
  await assertFails(
    authedDb('viewer-a').doc('groups/group-a/importRuns/import-a/previewRows/2').get(),
  )
})

test('owner and leader can create, read, and update public member docs', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a')
      .set(validPublicMember({ firstName: 'Ana', lastName: 'Lopez' })),
  )
  await assertSucceeds(authedDb('owner-a').doc('groups/group-a/members/member-a').get())
  await assertSucceeds(authedDb('leader-a').doc('groups/group-a/members/member-a').get())
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a').set(
      {
        groupRole: 'Anfitrion',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('viewer can read public member docs but cannot write them', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
    ],
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertSucceeds(authedDb('viewer-a').doc('groups/group-a/members/member-a').get())
  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/members/member-b')
      .set(validPublicMember({ firstName: 'Beto', lastName: 'Rios' })),
  )
})

test('inactive, signed-out, and unaffiliated users cannot read or write public members', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertFails(authedDb('inactive-a').doc('groups/group-a/members/member-a').get())
  await assertFails(authedDb('stranger-a').doc('groups/group-a/members/member-a').get())
  await assertFails(testEnv.unauthenticatedContext().firestore().doc('groups/group-a/members/member-a').get())
  await assertFails(
    authedDb('inactive-a')
      .doc('groups/group-a/members/member-b')
      .set(validPublicMember({ firstName: 'Beto', lastName: 'Rios' })),
  )
})

test('public member docs cannot contain full documentId', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })

  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a')
      .set({ ...validPublicMember({ firstName: 'Ana', lastName: 'Lopez' }), documentId: '123' }),
  )
})

test('owner and leader can read and write private profiles', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a/private/profile')
      .set(validPrivateProfile()),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a/private/profile').get(),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a/private/profile').set(
      {
        phone: '3000000000',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

test('viewer, inactive, signed-out, and unaffiliated users cannot access private profiles', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })
  await seedPrivateProfile({ groupId: 'group-a', memberId: 'member-a' })

  await assertFails(authedDb('viewer-a').doc('groups/group-a/members/member-a/private/profile').get())
  await assertFails(authedDb('inactive-a').doc('groups/group-a/members/member-a/private/profile').get())
  await assertFails(authedDb('stranger-a').doc('groups/group-a/members/member-a/private/profile').get())
  await assertFails(
    testEnv.unauthenticatedContext().firestore().doc('groups/group-a/members/member-a/private/profile').get(),
  )
  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/members/member-a/private/profile')
      .set(validPrivateProfile()),
  )
})

test('owner and leader can create, read, update, and delete pastoral notes', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })

  await assertSucceeds(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a/pastoralNotes/note-a')
      .set(validPastoralNote({ memberId: 'member-a', createdBy: 'owner-a' })),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').get(),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').set(
      {
        body: 'Seguimiento actualizado.',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
  await assertSucceeds(
    authedDb('leader-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').delete(),
  )
})

test('viewer, inactive, signed-out, and unaffiliated users cannot access pastoral notes', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })
  await seedPastoralNote({ groupId: 'group-a', memberId: 'member-a', noteId: 'note-a' })

  await assertFails(authedDb('viewer-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').get())
  await assertFails(authedDb('inactive-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').get())
  await assertFails(authedDb('stranger-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').get())
  await assertFails(
    testEnv.unauthenticatedContext().firestore().doc('groups/group-a/members/member-a/pastoralNotes/note-a').get(),
  )
  await assertFails(
    authedDb('viewer-a')
      .doc('groups/group-a/members/member-a/pastoralNotes/note-b')
      .set(validPastoralNote({ memberId: 'member-a', createdBy: 'viewer-a' })),
  )
})

test('pastoral notes require expected shape, existing member, and stable createdBy', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })
  await seedPublicMember({ groupId: 'group-a', memberId: 'member-a' })
  await seedPastoralNote({ groupId: 'group-a', memberId: 'member-a', noteId: 'note-a' })

  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a/pastoralNotes/note-b')
      .set(validPastoralNote({ memberId: 'other-member', createdBy: 'owner-a' })),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a/pastoralNotes/note-b')
      .set({ ...validPastoralNote({ memberId: 'member-a', createdBy: 'owner-a' }), type: 'alert' }),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/members/member-a/pastoralNotes/note-b')
      .set({ ...validPastoralNote({ memberId: 'member-a', createdBy: 'owner-a' }), body: '' }),
  )
  await assertFails(
    authedDb('owner-a')
      .doc('groups/group-a/members/missing-member/pastoralNotes/note-b')
      .set(validPastoralNote({ memberId: 'missing-member', createdBy: 'owner-a' })),
  )
  await assertFails(
    authedDb('leader-a').doc('groups/group-a/members/member-a/pastoralNotes/note-a').set(
      {
        createdBy: 'leader-a',
        updatedAt: now,
      },
      { merge: true },
    ),
  )
})

function authedDb(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

async function seedProfile(uid) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(`users/${uid}`).set({
      uid,
      displayName: uid,
      email: `${uid}@example.com`,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function seedGroup({ groupId, createdBy, memberships }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await db.doc(`groups/${groupId}`).set(validGroup({ createdBy }))

    for (const membership of memberships) {
      await db
        .doc(`groups/${groupId}/memberships/${membership.uid}`)
        .set(validMembership({ groupId, ...membership }))
    }
  })
}

async function seedImportRun({ groupId, uid, importRunId }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/importRuns/${importRunId}`)
      .set(validImportRun({ groupId, uid, importRunId }))
  })
}

async function seedPreviewRow({ groupId, importRunId, rowId }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/importRuns/${importRunId}/previewRows/${rowId}`)
      .set({
        rowNumber: Number(rowId),
        action: 'create',
        firstName: 'Ana',
        lastName: 'Lopez',
        fullName: 'Ana Lopez',
        documentIdHash: 'abc123',
      })
  })
}

async function seedPublicMember({ groupId, memberId }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/members/${memberId}`)
      .set(validPublicMember({ firstName: 'Ana', lastName: 'Lopez' }))
  })
}

async function seedPrivateProfile({ groupId, memberId }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/members/${memberId}/private/profile`)
      .set(validPrivateProfile())
  })
}

async function seedPastoralNote({ groupId, memberId, noteId }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/members/${memberId}/pastoralNotes/${noteId}`)
      .set(validPastoralNote({ memberId, createdBy: 'owner-a' }))
  })
}

async function seedMeeting({ groupId, meetingId, createdBy, status = 'held' }) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`groups/${groupId}/meetings/${meetingId}`)
      .set(validMeeting({ createdBy, status }))
  })
}

function validGroup({ createdBy }) {
  return {
    name: 'Grupo de prueba',
    regularWeekday: 3,
    createdBy,
    createdAt: now,
    updatedAt: now,
  }
}

function validMembership({ groupId, uid, role, status = 'active' }) {
  return {
    groupId,
    userId: uid,
    role,
    displayName: uid,
    email: `${uid}@example.com`,
    joinedAt: now,
    status,
  }
}

function validUserMembershipMirror({ groupId, uid, role, status = 'active' }) {
  return {
    groupId,
    userId: uid,
    groupName: 'Grupo de prueba',
    role,
    displayName: uid,
    email: `${uid}@example.com`,
    joinedAt: now,
    status,
    updatedAt: now,
  }
}

function validImportRun({ groupId, uid, importRunId }) {
  return {
    groupId,
    startedBy: uid,
    source: 'church-xlsx',
    fileName: 'miembros.xlsx',
    storagePath: `imports/${groupId}/${importRunId}/source.xlsx`,
    status: 'uploaded',
    startedAt: now,
    updatedAt: now,
  }
}

function validPublicMember({ firstName, lastName }) {
  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    gender: 'F',
    joinedAt: '2026-01-01',
    groupRole: 'Miembro',
    semesterAttendances: 3,
    isServer: false,
    isServing: true,
    status: 'active',
    documentIdHash: 'abc123',
    importedFrom: 'church-xlsx',
    lastImportRunId: 'import-a',
    lastImportedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

function validPrivateProfile() {
  return {
    documentId: '123456789',
    phone: '3000000000',
    birthday: '05-29',
    createdAt: now,
    updatedAt: now,
  }
}

function validMeeting({ createdBy, status = 'held' }) {
  return {
    date: '2026-06-05',
    status,
    title: 'Grupo en casa',
    comment: 'Tema semanal',
    createdBy,
    createdAt: now,
    updatedAt: now,
  }
}

function validAttendance({ meetingId, memberId, recordedBy, status = 'present' }) {
  return {
    meetingId,
    memberId,
    status,
    recordedBy,
    recordedAt: now,
    updatedAt: now,
  }
}

function validPastoralNote({ memberId, createdBy, type = 'note' }) {
  return {
    memberId,
    date: '2026-06-05',
    type,
    body: 'Conversacion pastoral y seguimiento.',
    createdBy,
    createdAt: now,
    updatedAt: now,
  }
}
