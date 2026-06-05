export type MemberStatus = 'active' | 'process' | 'inactive'

export type MemberGender = 'F' | 'M'

export type AttendanceStatus = 'present' | 'absent' | 'excused'

export type SessionStatus = 'held' | 'cancelled'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type Member = {
  id: string
  firstName: string
  lastName: string
  fullName: string
  documentId?: string
  gender?: MemberGender
  birthday?: string
  phone?: string
  status: MemberStatus
  joinedAt: string
  groupRole?: string
  semesterAttendances?: number
  isServer?: boolean
  isServing?: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export type GroupSession = {
  id: string
  date: string
  status: SessionStatus
  title: string
  comment?: string
}

export type AttendanceRecord = {
  id: string
  sessionId: string
  memberId: string
  status: AttendanceStatus
  comment?: string
}

export type TimelineEntryType = 'note' | 'prayer' | 'care' | 'milestone'

export type TimelineEntry = {
  id: string
  memberId: string
  date: string
  type: TimelineEntryType
  body: string
}

export type GroupSettings = {
  meetingWeekday: Weekday
  groupName: string
}

export type GroupData = {
  settings: GroupSettings
  members: Member[]
  sessions: GroupSession[]
  attendances: AttendanceRecord[]
  timeline: TimelineEntry[]
}
