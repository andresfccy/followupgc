import { readFileSync } from 'node:fs'
import test, { after, before, beforeEach } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

const projectId = 'followupgc'
const now = '2026-05-29T00:00:00.000Z'
const validContentType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

let testEnv

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
    storage: {
      rules: readFileSync('storage.rules', 'utf8'),
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.clearStorage()
})

after(async () => {
  await testEnv.cleanup()
})

test('owner and leader can upload and read XLSX imports', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'leader-a', role: 'leader', status: 'active' },
    ],
  })

  await assertSucceeds(uploadImport('owner-a', 'group-a', 'import-owner'))
  await assertSucceeds(uploadImport('leader-a', 'group-a', 'import-leader'))
  await assertSucceeds(importRef('owner-a', 'group-a', 'import-leader').getDownloadURL())
  await assertSucceeds(importRef('leader-a', 'group-a', 'import-owner').getDownloadURL())
})

test('viewer, inactive, signed-out, and unaffiliated users cannot upload XLSX imports', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })

  await assertFails(uploadImport('viewer-a', 'group-a', 'import-viewer'))
  await assertFails(uploadImport('inactive-a', 'group-a', 'import-inactive'))
  await assertFails(uploadImport('stranger-a', 'group-a', 'import-stranger'))
  await assertFails(uploadImport(null, 'group-a', 'import-signed-out'))
})

test('viewer, inactive, signed-out, and unaffiliated users cannot read XLSX imports', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [
      { uid: 'owner-a', role: 'owner', status: 'active' },
      { uid: 'viewer-a', role: 'viewer', status: 'active' },
      { uid: 'inactive-a', role: 'leader', status: 'inactive' },
    ],
  })
  await uploadImport('owner-a', 'group-a', 'import-a')

  await assertFails(importRef('viewer-a', 'group-a', 'import-a').getDownloadURL())
  await assertFails(importRef('inactive-a', 'group-a', 'import-a').getDownloadURL())
  await assertFails(importRef('stranger-a', 'group-a', 'import-a').getDownloadURL())
  await assertFails(importRef(null, 'group-a', 'import-a').getDownloadURL())
})

test('uploads require XLSX-compatible content type and cannot be updated or deleted by clients', async () => {
  await seedGroup({
    groupId: 'group-a',
    createdBy: 'owner-a',
    memberships: [{ uid: 'owner-a', role: 'owner', status: 'active' }],
  })
  await uploadImport('owner-a', 'group-a', 'import-secure')
  await assertSucceeds(importRef('owner-a', 'group-a', 'import-secure').getMetadata())

  await assertFails(uploadImport('owner-a', 'group-a', 'import-text', 'text/plain'))
  await assertFails(uploadImport('owner-a', 'group-a', 'import-secure'))
  await assertFails(importRef('owner-a', 'group-a', 'import-secure').delete())
})

function storageFor(uid) {
  const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext()
  return context.storage()
}

function importRef(uid, groupId, importRunId) {
  return storageFor(uid).ref(`imports/${groupId}/${importRunId}/source.xlsx`)
}

function uploadImport(uid, groupId, importRunId, contentType = validContentType) {
  return importRef(uid, groupId, importRunId).put(new Uint8Array([80, 75, 3, 4]), {
    contentType,
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
