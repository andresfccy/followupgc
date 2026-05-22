import type { GroupData } from './types'

export const initialGroupData: GroupData = {
  settings: {
    meetingWeekday: 5,
    groupName: 'Grupo celular',
  },
  members: [
    {
      id: 'member-ana',
      fullName: 'Ana Ramirez',
      phone: '300 000 0001',
      status: 'active',
      joinedAt: '2026-04-03',
      notes: 'Lidera la bienvenida cuando puede.',
    },
    {
      id: 'member-carlos',
      fullName: 'Carlos Medina',
      phone: '300 000 0002',
      status: 'process',
      joinedAt: '2026-04-10',
      notes: 'Nuevo en el proceso de consolidacion.',
    },
    {
      id: 'member-laura',
      fullName: 'Laura Torres',
      status: 'active',
      joinedAt: '2026-03-22',
    },
  ],
  sessions: [
    {
      id: 'session-2026-05-01',
      date: '2026-05-01',
      status: 'held',
      title: 'Grupo en casa',
      comment: 'Tema: comunidad y perseverancia.',
    },
    {
      id: 'session-2026-05-08',
      date: '2026-05-08',
      status: 'cancelled',
      title: 'Actividad general de la iglesia',
      comment: 'No hubo grupo por programacion central.',
    },
    {
      id: 'session-2026-05-15',
      date: '2026-05-15',
      status: 'held',
      title: 'Grupo en casa',
    },
  ],
  attendances: [
    {
      id: 'attendance-ana-0501',
      sessionId: 'session-2026-05-01',
      memberId: 'member-ana',
      status: 'present',
    },
    {
      id: 'attendance-carlos-0501',
      sessionId: 'session-2026-05-01',
      memberId: 'member-carlos',
      status: 'present',
      comment: 'Llegó con una invitada.',
    },
    {
      id: 'attendance-laura-0501',
      sessionId: 'session-2026-05-01',
      memberId: 'member-laura',
      status: 'excused',
      comment: 'Turno laboral.',
    },
    {
      id: 'attendance-ana-0515',
      sessionId: 'session-2026-05-15',
      memberId: 'member-ana',
      status: 'present',
    },
    {
      id: 'attendance-carlos-0515',
      sessionId: 'session-2026-05-15',
      memberId: 'member-carlos',
      status: 'absent',
    },
  ],
  timeline: [
    {
      id: 'timeline-carlos-1',
      memberId: 'member-carlos',
      date: '2026-05-02',
      type: 'care',
      body: 'Se le escribio para agradecer su asistencia y conocer como se sintio.',
    },
    {
      id: 'timeline-laura-1',
      memberId: 'member-laura',
      date: '2026-05-09',
      type: 'prayer',
      body: 'Pidio oracion por estabilidad en horarios laborales.',
    },
  ],
}
