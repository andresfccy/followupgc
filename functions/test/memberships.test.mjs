import assert from 'node:assert/strict'
import test from 'node:test'
import { updateGroupMembershipRecord } from '../lib/memberships.js'

test('updateGroupMembershipRecord lets an active owner update role and status', async () => {
  const db = fakeDb({
    group: { name: 'Grupo Casa' },
    memberships: {
      owner: { role: 'owner', status: 'active', userId: 'owner', joinedAt: '2026-01-01' },
      leader: {
        role: 'leader',
        status: 'active',
        userId: 'leader',
        displayName: 'Leader A',
        email: 'leader@example.com',
        joinedAt: '2026-01-02',
      },
    },
  })

  await updateGroupMembershipRecord(db, {
    groupId: 'group-a',
    targetUserId: 'leader',
    role: 'viewer',
    status: 'inactive',
    requesterUid: 'owner',
  })

  assert.equal(db.writes.get('groups/group-a/memberships/leader').role, 'viewer')
  assert.equal(db.writes.get('groups/group-a/memberships/leader').status, 'inactive')
  assert.equal(db.writes.get('users/leader/groupMemberships/group-a').groupName, 'Grupo Casa')
  assert.equal(db.writes.get('users/leader/groupMemberships/group-a').role, 'viewer')
})

test('updateGroupMembershipRecord rejects non-owner requesters', async () => {
  const db = fakeDb({
    group: { name: 'Grupo Casa' },
    memberships: {
      leader: { role: 'leader', status: 'active', userId: 'leader', joinedAt: '2026-01-02' },
      viewer: { role: 'viewer', status: 'active', userId: 'viewer', joinedAt: '2026-01-03' },
    },
  })

  await assert.rejects(
    updateGroupMembershipRecord(db, {
      groupId: 'group-a',
      targetUserId: 'viewer',
      role: 'leader',
      status: 'active',
      requesterUid: 'leader',
    }),
    { code: 'permission-denied' },
  )
})

test('updateGroupMembershipRecord rejects missing memberships and owner assignment', async () => {
  const db = fakeDb({
    group: { name: 'Grupo Casa' },
    memberships: {
      owner: { role: 'owner', status: 'active', userId: 'owner', joinedAt: '2026-01-01' },
    },
  })

  await assert.rejects(
    updateGroupMembershipRecord(db, {
      groupId: 'group-a',
      targetUserId: 'missing',
      role: 'viewer',
      status: 'active',
      requesterUid: 'owner',
    }),
    { code: 'not-found' },
  )

  await assert.rejects(
    updateGroupMembershipRecord(db, {
      groupId: 'group-a',
      targetUserId: 'owner',
      role: 'owner',
      status: 'active',
      requesterUid: 'owner',
    }),
    { code: 'failed-precondition' },
  )
})

test('updateGroupMembershipRecord protects the last active owner', async () => {
  const db = fakeDb({
    group: { name: 'Grupo Casa' },
    memberships: {
      owner: { role: 'owner', status: 'active', userId: 'owner', joinedAt: '2026-01-01' },
    },
  })

  await assert.rejects(
    updateGroupMembershipRecord(db, {
      groupId: 'group-a',
      targetUserId: 'owner',
      role: 'viewer',
      status: 'active',
      requesterUid: 'owner',
    }),
    { code: 'failed-precondition' },
  )
})

function fakeDb({ group, memberships }) {
  const writes = new Map()

  return {
    writes,
    doc(path) {
      return { kind: 'doc', path }
    },
    collection(path) {
      return {
        kind: 'query',
        path,
        filters: [],
        where(field, operator, value) {
          return { ...this, filters: [...this.filters, { field, operator, value }] }
        },
      }
    },
    async runTransaction(callback) {
      return callback({
        async get(ref) {
          if (ref.kind === 'query') {
            const matching = Object.values(memberships).filter((membership) =>
              ref.filters.every((filter) => membership[filter.field] === filter.value),
            )

            return { size: matching.length }
          }

          if (ref.path === 'groups/group-a') {
            return fakeSnapshot(group)
          }

          const membershipMatch = ref.path.match(/^groups\/group-a\/memberships\/(.+)$/)
          if (membershipMatch) {
            return fakeSnapshot(memberships[membershipMatch[1]])
          }

          return fakeSnapshot(null)
        },
        set(ref, value) {
          writes.set(ref.path, value)
        },
      })
    },
  }
}

function fakeSnapshot(data) {
  return {
    exists: Boolean(data),
    get(field) {
      return data?.[field]
    },
  }
}
