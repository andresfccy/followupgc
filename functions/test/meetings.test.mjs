import assert from 'node:assert/strict'
import test from 'node:test'
import { deleteMeetingRecord } from '../lib/meetings.js'

test('deleteMeetingRecord deletes an empty meeting for an active owner or leader', async () => {
  const db = fakeDb({
    memberships: {
      owner: { role: 'owner', status: 'active' },
      leader: { role: 'leader', status: 'active' },
    },
    meetings: {
      meetingOwner: { childCounts: [] },
      meetingLeader: { childCounts: [] },
    },
  })

  await deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingOwner', uid: 'owner' })
  await deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingLeader', uid: 'leader' })

  assert.equal(db.deletedMeetings.has('meetingOwner'), true)
  assert.equal(db.deletedMeetings.has('meetingLeader'), true)
})

test('deleteMeetingRecord rejects users without active owner or leader membership', async () => {
  const db = fakeDb({
    memberships: {
      viewer: { role: 'viewer', status: 'active' },
      inactive: { role: 'leader', status: 'inactive' },
    },
    meetings: {
      meetingA: { childCounts: [] },
    },
  })

  await assert.rejects(
    deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingA', uid: 'viewer' }),
    { code: 'permission-denied' },
  )
  await assert.rejects(
    deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingA', uid: 'inactive' }),
    { code: 'permission-denied' },
  )
  await assert.rejects(
    deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingA', uid: 'stranger' }),
    { code: 'permission-denied' },
  )
})

test('deleteMeetingRecord rejects missing meetings', async () => {
  const db = fakeDb({
    memberships: {
      owner: { role: 'owner', status: 'active' },
    },
    meetings: {},
  })

  await assert.rejects(
    deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'missing', uid: 'owner' }),
    { code: 'not-found' },
  )
})

test('deleteMeetingRecord rejects meetings with child records', async () => {
  const db = fakeDb({
    memberships: {
      owner: { role: 'owner', status: 'active' },
    },
    meetings: {
      meetingA: { childCounts: [1] },
    },
  })

  await assert.rejects(
    deleteMeetingRecord(db, { groupId: 'group-a', meetingId: 'meetingA', uid: 'owner' }),
    { code: 'failed-precondition' },
  )
  assert.equal(db.deletedMeetings.has('meetingA'), false)
})

function fakeDb({ memberships, meetings }) {
  const deletedMeetings = new Set()

  return {
    deletedMeetings,
    doc(path) {
      const parts = path.split('/')

      if (parts[2] === 'memberships') {
        return fakeSnapshotRef(memberships[parts[3]])
      }

      if (parts[2] === 'meetings') {
        const meetingId = parts[3]
        return fakeMeetingRef(meetingId, meetings[meetingId], deletedMeetings)
      }

      throw new Error(`Unexpected path: ${path}`)
    },
  }
}

function fakeSnapshotRef(data) {
  return {
    async get() {
      return {
        exists: Boolean(data),
        get(field) {
          return data?.[field]
        },
      }
    },
  }
}

function fakeMeetingRef(meetingId, meeting, deletedMeetings) {
  return {
    async get() {
      return { exists: Boolean(meeting) }
    },
    async listCollections() {
      return (meeting?.childCounts ?? []).map((count) => ({
        limit() {
          return {
            async get() {
              return { empty: count === 0 }
            },
          }
        },
      }))
    },
    async delete() {
      deletedMeetings.add(meetingId)
    },
  }
}
