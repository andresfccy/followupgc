import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initialGroupData } from '@/domain/seed'
import type {
  AttendanceStatus,
  ChurchMemberImportRow,
  GroupData,
  GroupSession,
  ImportPreview,
  ImportResult,
  Member,
  MemberStatus,
  TimelineEntry,
  Weekday,
} from '@/domain/types'
import type { ConfirmImport } from '@/lib/memberImport'
import { createId } from '@/lib/utils'

type AddMemberInput = {
  fullName: string
  phone?: string
  status: MemberStatus
  joinedAt: string
  notes?: string
}

type GroupState = GroupData & {
  addMember: (member: AddMemberInput) => void
  addSession: (session: Omit<GroupSession, 'id'>) => void
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id'>) => void
  upsertImportedMembers: (preview: ImportPreview) => ImportResult
  setAttendance: (
    sessionId: string,
    memberId: string,
    status: AttendanceStatus,
    comment?: string,
  ) => void
  updateMeetingWeekday: (weekday: Weekday) => void
}

type PersistedGroupData = Partial<Omit<GroupData, 'members'>> & {
  members?: Partial<Member>[]
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      ...initialGroupData,
      addMember: (member) =>
        set((state) => {
          const now = new Date().toISOString()
          const name = splitFullName(member.fullName)

          return {
            members: [
              {
                id: createId('member'),
                firstName: name.firstName,
                lastName: name.lastName,
                fullName: member.fullName,
                phone: member.phone,
                status: member.status,
                joinedAt: member.joinedAt,
                notes: member.notes,
                createdAt: now,
                updatedAt: now,
              },
              ...state.members,
            ],
          }
        }),
      addSession: (session) =>
        set((state) => ({
          sessions: [{ id: createId('session'), ...session }, ...state.sessions],
        })),
      addTimelineEntry: (entry) =>
        set((state) => ({
          timeline: [{ id: createId('timeline'), ...entry }, ...state.timeline],
        })),
      upsertImportedMembers: (preview) => {
        const result: ImportResult = {
          created: 0,
          updated: 0,
          skipped: preview.summary.invalidRows,
          errors: preview.errors,
        }

        set((state) => {
          const now = new Date().toISOString()
          const membersByDocumentId = new Map(
            state.members
              .filter((member) => member.documentId)
              .map((member) => [member.documentId, member] as const),
          )
          const importedByDocumentId = new Map<string, ChurchMemberImportRow>()

          preview.validRows.forEach((row) => {
            importedByDocumentId.set(row.documentId, row)
          })

          const updatedMembers = state.members.map((member) => {
            if (!member.documentId) return member

            const imported = importedByDocumentId.get(member.documentId)
            if (!imported) return member

            result.updated += 1
            importedByDocumentId.delete(member.documentId)

            return applyImportedMemberFields(member, imported, now)
          })

          const createdMembers = [...importedByDocumentId.values()].map((row) => {
            const existing = membersByDocumentId.get(row.documentId)
            if (existing) return applyImportedMemberFields(existing, row, now)

            result.created += 1
            return createImportedMember(row, now)
          })

          return {
            members: [...createdMembers, ...updatedMembers],
          }
        })

        return result
      },
      setAttendance: (sessionId, memberId, status, comment) =>
        set((state) => {
          const existing = state.attendances.find(
            (item) => item.sessionId === sessionId && item.memberId === memberId,
          )

          if (!existing) {
            return {
              attendances: [
                {
                  id: createId('attendance'),
                  sessionId,
                  memberId,
                  status,
                  comment,
                },
                ...state.attendances,
              ],
            }
          }

          return {
            attendances: state.attendances.map((item) =>
              item.id === existing.id ? { ...item, status, comment } : item,
            ),
          }
        }),
      updateMeetingWeekday: (meetingWeekday) =>
        set((state) => ({
          settings: { ...state.settings, meetingWeekday },
        })),
    }),
    {
      name: 'followupgc-data',
      version: 2,
      migrate: (persistedState) => migratePersistedGroupState(persistedState),
    },
  ),
)

export const confirmImport: ConfirmImport = (preview) =>
  useGroupStore.getState().upsertImportedMembers(preview)

function createImportedMember(row: ChurchMemberImportRow, now: string): Member {
  return {
    id: createId('member'),
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: buildFullName(row.firstName, row.lastName),
    documentId: row.documentId,
    gender: row.gender,
    birthday: row.birthday,
    status: 'active',
    joinedAt: row.joinedGroupAt ?? today(),
    groupRole: row.groupRole,
    semesterAttendances: row.semesterAttendances,
    isServer: row.isServer,
    isServing: row.isServing,
    createdAt: now,
    updatedAt: now,
  }
}

function applyImportedMemberFields(
  member: Member,
  row: ChurchMemberImportRow,
  now: string,
): Member {
  return {
    ...member,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: buildFullName(row.firstName, row.lastName),
    documentId: row.documentId,
    gender: row.gender,
    birthday: row.birthday,
    joinedAt: row.joinedGroupAt ?? member.joinedAt,
    groupRole: row.groupRole,
    semesterAttendances: row.semesterAttendances,
    isServer: row.isServer,
    isServing: row.isServing,
    updatedAt: now,
  }
}

function migratePersistedGroupState(persistedState: unknown): PersistedGroupData {
  const persistedData = isPersistedGroupData(persistedState) ? persistedState : {}

  return {
    ...initialGroupData,
    ...persistedData,
    members: (persistedData.members ?? initialGroupData.members).map(normalizePersistedMember),
  }
}

function normalizePersistedMember(member: Partial<Member>): Member {
  const now = new Date().toISOString()
  const fullName = String(member.fullName ?? '').trim() || 'Sin nombre'
  const splitName = splitFullName(fullName)

  return {
    id: member.id ?? createId('member'),
    firstName: member.firstName ?? splitName.firstName,
    lastName: member.lastName ?? splitName.lastName,
    fullName,
    documentId: member.documentId,
    gender: member.gender,
    birthday: member.birthday,
    phone: member.phone,
    status: member.status ?? 'active',
    joinedAt: member.joinedAt ?? today(),
    groupRole: member.groupRole,
    semesterAttendances: member.semesterAttendances,
    isServer: member.isServer,
    isServing: member.isServing,
    notes: member.notes,
    createdAt: member.createdAt ?? now,
    updatedAt: member.updatedAt ?? now,
  }
}

function isPersistedGroupData(value: unknown): value is PersistedGroupData {
  return Boolean(value && typeof value === 'object')
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  const firstName = parts[0] ?? fullName
  const lastName = parts.slice(1).join(' ')

  return { firstName, lastName }
}

function buildFullName(firstName: string, lastName: string) {
  return [firstName, lastName].filter(Boolean).join(' ').trim()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}
