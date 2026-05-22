import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { initialGroupData } from '@/domain/seed'
import type {
  AttendanceStatus,
  GroupData,
  GroupSession,
  Member,
  TimelineEntry,
  Weekday,
} from '@/domain/types'
import { createId } from '@/lib/utils'

type GroupState = GroupData & {
  addMember: (member: Omit<Member, 'id'>) => void
  addSession: (session: Omit<GroupSession, 'id'>) => void
  addTimelineEntry: (entry: Omit<TimelineEntry, 'id'>) => void
  setAttendance: (
    sessionId: string,
    memberId: string,
    status: AttendanceStatus,
    comment?: string,
  ) => void
  updateMeetingWeekday: (weekday: Weekday) => void
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set) => ({
      ...initialGroupData,
      addMember: (member) =>
        set((state) => ({
          members: [{ id: createId('member'), ...member }, ...state.members],
        })),
      addSession: (session) =>
        set((state) => ({
          sessions: [{ id: createId('session'), ...session }, ...state.sessions],
        })),
      addTimelineEntry: (entry) =>
        set((state) => ({
          timeline: [{ id: createId('timeline'), ...entry }, ...state.timeline],
        })),
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
      version: 1,
    },
  ),
)
