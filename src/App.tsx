import { useMemo, useState, type FormEvent } from 'react'
import {
  CalendarCheck,
  CalendarX2,
  Check,
  Circle,
  Clock3,
  MessageSquareText,
  Plus,
  Settings,
  Users,
} from 'lucide-react'
import type {
  AttendanceStatus,
  Member,
  MemberStatus,
  SessionStatus,
  TimelineEntryType,
  Weekday,
} from '@/domain/types'
import { formatDate, getWeekdayLabel, nextMeetingDate, weekdayOptions } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useGroupStore } from '@/store/groupStore'

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  excused: 'Excusa',
}

const memberStatusLabels: Record<MemberStatus, string> = {
  active: 'Activo',
  process: 'En proceso',
  inactive: 'Inactivo',
}

const timelineTypeLabels: Record<TimelineEntryType, string> = {
  note: 'Nota',
  prayer: 'Oracion',
  care: 'Cuidado',
  milestone: 'Hito',
}

function App() {
  const {
    settings,
    members,
    sessions,
    attendances,
    addMember,
    addSession,
    addTimelineEntry,
    setAttendance,
    updateMeetingWeekday,
  } = useGroupStore()
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? '')
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? '')

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? members[0]
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0]

  const heldSessions = sessions.filter((session) => session.status === 'held')
  const presentCount = attendances.filter((item) => item.status === 'present').length
  const attendanceRate = heldSessions.length
    ? Math.round((presentCount / (heldSessions.length * Math.max(members.length, 1))) * 100)
    : 0

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.date.localeCompare(a.date)),
    [sessions],
  )

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') ?? '').trim()
    if (!fullName) return

    addMember({
      fullName,
      phone: String(form.get('phone') ?? '').trim(),
      joinedAt: String(form.get('joinedAt') ?? new Date().toISOString().slice(0, 10)),
      status: String(form.get('status')) as MemberStatus,
      notes: String(form.get('notes') ?? '').trim(),
    })
    event.currentTarget.reset()
  }

  function handleAddSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const date = String(form.get('date') ?? '').trim()
    if (!date) return

    addSession({
      date,
      title: String(form.get('title') ?? 'Grupo en casa').trim() || 'Grupo en casa',
      status: String(form.get('status')) as SessionStatus,
      comment: String(form.get('comment') ?? '').trim(),
    })
    event.currentTarget.reset()
  }

  function handleAddTimelineEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedMember) return

    const form = new FormData(event.currentTarget)
    const body = String(form.get('body') ?? '').trim()
    if (!body) return

    addTimelineEntry({
      memberId: selectedMember.id,
      date: String(form.get('date') ?? new Date().toISOString().slice(0, 10)),
      type: String(form.get('type')) as TimelineEntryType,
      body,
    })
    event.currentTarget.reset()
  }

  return (
    <main className="min-h-svh bg-stone-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Seguimiento pastoral</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
                {settings.groupName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Registro local de asistencia semanal, grupos no realizados y bitacora
                cronologica por persona.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={Users} label="Personas" value={members.length.toString()} />
              <Metric icon={CalendarCheck} label="Reuniones" value={heldSessions.length.toString()} />
              <Metric icon={Check} label="Asistencia" value={`${attendanceRate}%`} />
              <Metric icon={Clock3} label="Proxima" value={formatDate(nextMeetingDate(settings.meetingWeekday))} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
        <section className="grid gap-4">
          <Panel title="Personas del grupo" icon={Users}>
            <form className="grid gap-3 border-b border-slate-200 pb-4" onSubmit={handleAddMember}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nombre completo" name="fullName" placeholder="Ej. Maria Gomez" />
                <Field label="Telefono" name="phone" placeholder="Opcional" />
                <Field label="Fecha de ingreso" name="joinedAt" type="date" />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Estado
                  <select name="status" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950">
                    <option value="active">Activo</option>
                    <option value="process">En proceso</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </label>
              </div>
              <Field label="Notas base" name="notes" placeholder="Contexto pastoral inicial" />
              <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
                <Plus size={16} /> Agregar persona
              </button>
            </form>

            <div className="mt-4 grid gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  className={cn(
                    'grid gap-1 rounded-md border p-3 text-left transition hover:border-emerald-500',
                    selectedMember?.id === member.id
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 bg-white',
                  )}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  <span className="font-medium text-slate-950">{member.fullName}</span>
                  <span className="text-sm text-slate-600">
                    {memberStatusLabels[member.status]} · Desde {formatDate(member.joinedAt)}
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Programacion y asistencias" icon={CalendarCheck}>
            <form className="grid gap-3 border-b border-slate-200 pb-4" onSubmit={handleAddSession}>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Fecha" name="date" type="date" />
                <Field label="Titulo" name="title" placeholder="Grupo en casa" />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Estado
                  <select name="status" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950">
                    <option value="held">Realizado</option>
                    <option value="cancelled">No realizado</option>
                  </select>
                </label>
              </div>
              <Field label="Comentario" name="comment" placeholder="Motivo o resumen" />
              <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700">
                <Plus size={16} /> Registrar fecha
              </button>
            </form>

            <div className="mt-4 grid gap-3">
              {sortedSessions.map((session) => (
                <button
                  key={session.id}
                  className={cn(
                    'rounded-md border p-3 text-left transition hover:border-emerald-500',
                    selectedSession?.id === session.id
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 bg-white',
                  )}
                  onClick={() => setSelectedSessionId(session.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{session.title}</p>
                      <p className="text-sm text-slate-600">{formatDate(session.date)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
                      {session.status === 'held' ? <CalendarCheck size={14} /> : <CalendarX2 size={14} />}
                      {session.status === 'held' ? 'Realizado' : 'No realizado'}
                    </span>
                  </div>
                  {session.comment ? <p className="mt-2 text-sm text-slate-600">{session.comment}</p> : null}
                </button>
              ))}
            </div>
          </Panel>
        </section>

        <aside className="grid content-start gap-4">
          <Panel title="Asistencia de la fecha" icon={Circle}>
            {selectedSession ? (
              <div className="grid gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="font-medium text-slate-950">{selectedSession.title}</p>
                  <p className="text-sm text-slate-600">{formatDate(selectedSession.date)}</p>
                </div>
                {selectedSession.status === 'cancelled' ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Esta fecha esta marcada como no realizada. El comentario conserva el motivo.
                  </p>
                ) : (
                  members.map((member) => {
                    const attendance = attendances.find(
                      (item) => item.sessionId === selectedSession.id && item.memberId === member.id,
                    )
                    return (
                      <div key={member.id} className="rounded-md border border-slate-200 bg-white p-3">
                        <p className="font-medium text-slate-950">{member.fullName}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {(['present', 'absent', 'excused'] as AttendanceStatus[]).map((status) => (
                            <button
                              key={status}
                              className={cn(
                                'h-9 rounded-md border px-2 text-sm',
                                attendance?.status === status
                                  ? 'border-emerald-700 bg-emerald-700 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-500',
                              )}
                              onClick={() =>
                                setAttendance(selectedSession.id, member.id, status, attendance?.comment)
                              }
                            >
                              {attendanceLabels[status]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ) : (
              <EmptyState text="Registra una fecha para controlar asistencia." />
            )}
          </Panel>

          <Panel title="Bitacora personal" icon={MessageSquareText}>
            {selectedMember ? (
              <div className="grid gap-4">
                <MemberSummary member={selectedMember} />
                <form className="grid gap-3 border-b border-slate-200 pb-4" onSubmit={handleAddTimelineEntry}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Fecha" name="date" type="date" />
                    <label className="grid gap-1 text-sm font-medium text-slate-700">
                      Tipo
                      <select name="type" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950">
                        <option value="note">Nota</option>
                        <option value="care">Cuidado</option>
                        <option value="prayer">Oracion</option>
                        <option value="milestone">Hito</option>
                      </select>
                    </label>
                  </div>
                  <Field label="Comentario" name="body" placeholder="Que ocurrio y que seguimiento requiere" />
                  <button className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800">
                    <Plus size={16} /> Agregar a bitacora
                  </button>
                </form>
                <Timeline memberId={selectedMember.id} />
              </div>
            ) : (
              <EmptyState text="Selecciona una persona para ver su proceso." />
            )}
          </Panel>

          <Panel title="Parametros" icon={Settings}>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Dia regular de reunion
              <select
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950"
                value={settings.meetingWeekday}
                onChange={(event) => updateMeetingWeekday(Number(event.target.value) as Weekday)}
              >
                {weekdayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-3 text-sm text-slate-600">
              Dia configurado: {getWeekdayLabel(settings.meetingWeekday)}. Las excepciones de
              programacion se registran como fechas no realizadas.
            </p>
          </Panel>
        </aside>
      </div>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Icon size={18} className="text-emerald-700" />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  name,
  placeholder,
  type = 'text',
}: {
  label: string
  name: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-600"
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  )
}

function MemberSummary({ member }: { member: Member }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="font-medium text-slate-950">{member.fullName}</p>
      <p className="mt-1 text-sm text-slate-600">
        {memberStatusLabels[member.status]} · Desde {formatDate(member.joinedAt)}
      </p>
      {member.notes ? <p className="mt-2 text-sm text-slate-600">{member.notes}</p> : null}
    </div>
  )
}

function Timeline({ memberId }: { memberId: string }) {
  const timeline = useGroupStore((state) => state.timeline)
  const entries = [...timeline]
    .filter((entry) => entry.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (!entries.length) return <EmptyState text="Aun no hay comentarios para esta persona." />

  return (
    <ol className="grid gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-950">
              {timelineTypeLabels[entry.type]}
            </span>
            <time className="text-xs text-slate-500">{formatDate(entry.date)}</time>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{entry.body}</p>
        </li>
      ))}
    </ol>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
      {text}
    </div>
  )
}

export default App
