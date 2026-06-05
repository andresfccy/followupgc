import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  CalendarCheck,
  CalendarX2,
  Check,
  Circle,
  Clock3,
  FileSearch,
  LogIn,
  LogOut,
  MessageSquareText,
  Plus,
  Settings,
  Users,
  X,
} from 'lucide-react'
import type {
  AttendanceStatus,
  MemberStatus,
  TimelineEntryType,
  Weekday,
} from '@/domain/types'
import { formatDate, getWeekdayLabel, nextMeetingDate, weekdayOptions } from '@/lib/date'
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
} from '@/lib/auth'
import {
  confirmExcelImportRun,
  createExcelImportRun,
  subscribeExcelImportRun,
  uploadExcelImportFile,
  type ExcelImportPreviewRow,
  type ExcelImportRun,
} from '@/lib/remoteImports'
import {
  subscribeRemoteMembers,
  type RemoteMember,
} from '@/lib/remoteMembers'
import {
  createRemoteMeeting,
  deleteRemoteMeeting,
  subscribeRemoteMeetings,
  updateRemoteMeeting,
  type RemoteMeeting,
} from '@/lib/remoteMeetings'
import {
  setRemoteAttendance,
  subscribeRemoteAttendance,
  type RemoteAttendanceRecord,
} from '@/lib/remoteAttendance'
import {
  createRemotePastoralNote,
  subscribeRemotePastoralNotes,
  type RemotePastoralNote,
} from '@/lib/remotePastoralNotes'
import {
  createRemoteGroup,
  setDefaultGroupId,
  subscribeRemoteGroupMemberships,
  subscribeRemoteGroup,
  updateRemoteGroupMembership,
  updateRemoteGroupSettings,
  type GroupMembership,
  type RemoteGroup,
} from '@/lib/remoteGroups'
import { useAuthSession, type AuthSession } from '@/lib/useAuthSession'
import { clearLegacyGroupStorage } from '@/lib/legacyLocalStorage'
import { cn } from '@/lib/utils'

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: 'Presente',
  absent: 'Ausente',
  excused: 'Excusa',
}

const timelineTypeLabels: Record<TimelineEntryType, string> = {
  note: 'Nota',
  prayer: 'Oracion',
  care: 'Cuidado',
  milestone: 'Hito',
}

const memberStatusLabels: Record<MemberStatus, string> = {
  active: 'Activo',
  process: 'En proceso',
  inactive: 'Inactivo',
}

function App() {
  const authSession = useAuthSession()
  const [remoteMembersState, setRemoteMembersState] = useState<{
    groupId: string
    members: RemoteMember[]
    error: string
  }>({ groupId: '', members: [], error: '' })
  const [remoteMeetingsState, setRemoteMeetingsState] = useState<{
    groupId: string
    meetings: RemoteMeeting[]
    error: string
  }>({ groupId: '', meetings: [], error: '' })
  const [remoteAttendanceState, setRemoteAttendanceState] = useState<{
    groupId: string
    meetingId: string
    attendances: RemoteAttendanceRecord[]
    error: string
  }>({ groupId: '', meetingId: '', attendances: [], error: '' })
  const [remotePastoralNotesState, setRemotePastoralNotesState] = useState<{
    groupId: string
    memberId: string
    notes: RemotePastoralNote[]
    error: string
  }>({ groupId: '', memberId: '', notes: [], error: '' })
  const [remoteGroupState, setRemoteGroupState] = useState<{
    groupId: string
    group: RemoteGroup | null
    error: string
  }>({ groupId: '', group: null, error: '' })
  const [remoteMembershipsState, setRemoteMembershipsState] = useState<{
    groupId: string
    memberships: GroupMembership[]
    error: string
  }>({ groupId: '', memberships: [], error: '' })
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [editingMeetingId, setEditingMeetingId] = useState('')
  const [importStatus, setImportStatus] = useState(
    'El Excel oficial se sube a Firebase Storage y se procesa en backend antes de escribir en Firestore.',
  )
  const [activeImportRunId, setActiveImportRunId] = useState('')
  const [activeImportRun, setActiveImportRun] = useState<ExcelImportRun | null>(null)
  const [activeImportRows, setActiveImportRows] = useState<ExcelImportPreviewRow[]>([])
  const [isImportReviewOpen, setIsImportReviewOpen] = useState(false)
  const [isConfirmingImport, setIsConfirmingImport] = useState(false)
  const [authStatus, setAuthStatus] = useState('')
  const remoteGroup =
    remoteGroupState.groupId === authSession.currentGroupId ? remoteGroupState.group : null
  const remoteGroupError =
    remoteGroupState.groupId === authSession.currentGroupId ? remoteGroupState.error : ''
  const meetingWeekday = remoteGroup?.regularWeekday ?? (5 as Weekday)
  const groupName = remoteGroup?.name ?? authSession.currentMembership?.groupName ?? 'FollowUpGC'
  const groupMemberships =
    remoteMembershipsState.groupId === authSession.currentGroupId
      ? remoteMembershipsState.memberships
      : []
  const remoteMembershipsError =
    remoteMembershipsState.groupId === authSession.currentGroupId
      ? remoteMembershipsState.error
      : ''
  const sessions =
    remoteMeetingsState.groupId === authSession.currentGroupId ? remoteMeetingsState.meetings : []
  const remoteMeetingsError =
    remoteMeetingsState.groupId === authSession.currentGroupId ? remoteMeetingsState.error : ''
  const isLoadingMeetings = Boolean(
    authSession.currentGroupId && remoteMeetingsState.groupId !== authSession.currentGroupId,
  )
  const members =
    remoteMembersState.groupId === authSession.currentGroupId ? remoteMembersState.members : []
  const remoteMembersError =
    remoteMembersState.groupId === authSession.currentGroupId ? remoteMembersState.error : ''
  const isLoadingMembers = Boolean(
    authSession.currentGroupId && remoteMembersState.groupId !== authSession.currentGroupId,
  )
  const effectiveSelectedMemberId = members.some((member) => member.id === selectedMemberId)
    ? selectedMemberId
    : members[0]?.id ?? ''

  const selectedMember = members.find((member) => member.id === effectiveSelectedMemberId)
  const pastoralNotes =
    selectedMember &&
    remotePastoralNotesState.groupId === authSession.currentGroupId &&
    remotePastoralNotesState.memberId === selectedMember.id
      ? remotePastoralNotesState.notes
      : []
  const remotePastoralNotesError =
    selectedMember &&
    remotePastoralNotesState.groupId === authSession.currentGroupId &&
    remotePastoralNotesState.memberId === selectedMember.id
      ? remotePastoralNotesState.error
      : ''
  const isLoadingPastoralNotes = Boolean(
    authSession.currentGroupId &&
      selectedMember?.id &&
      (remotePastoralNotesState.groupId !== authSession.currentGroupId ||
        remotePastoralNotesState.memberId !== selectedMember.id),
  )
  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0]
  const attendances =
    selectedSession &&
    remoteAttendanceState.groupId === authSession.currentGroupId &&
    remoteAttendanceState.meetingId === selectedSession.id
      ? remoteAttendanceState.attendances
      : []
  const remoteAttendanceError =
    selectedSession &&
    remoteAttendanceState.groupId === authSession.currentGroupId &&
    remoteAttendanceState.meetingId === selectedSession.id
      ? remoteAttendanceState.error
      : ''
  const isLoadingAttendance = Boolean(
    authSession.currentGroupId &&
      selectedSession?.id &&
      selectedSession.status === 'held' &&
      (remoteAttendanceState.groupId !== authSession.currentGroupId ||
        remoteAttendanceState.meetingId !== selectedSession.id),
  )
  const editingMeeting = sessions.find((session) => session.id === editingMeetingId)
  const canManageMeetings = Boolean(
    authSession.currentMembership &&
      ['owner', 'leader'].includes(authSession.currentMembership.role),
  )
  const canManageGroupSettings = Boolean(
    authSession.currentMembership && authSession.currentMembership.role === 'owner',
  )

  const heldSessions = sessions.filter((session) => session.status === 'held')
  const presentCount = attendances.filter((item) => item.status === 'present').length
  const attendanceRate = heldSessions.length
    ? Math.round((presentCount / (heldSessions.length * Math.max(members.length, 1))) * 100)
    : 0

  const sortedSessions = sessions
  const visibleImportRun =
    activeImportRun?.groupId === authSession.currentGroupId ? activeImportRun : null
  const visibleImportRows = visibleImportRun ? activeImportRows : []

  useEffect(() => {
    clearLegacyGroupStorage()
  }, [])

  useEffect(() => {
    if (!authSession.currentGroupId) {
      return undefined
    }

    return subscribeRemoteGroup(authSession.currentGroupId, ({ group, error }) => {
      setRemoteGroupState({
        groupId: authSession.currentGroupId,
        group,
        error,
      })
    })
  }, [authSession.currentGroupId])

  useEffect(() => {
    if (!authSession.currentGroupId) {
      return undefined
    }

    return subscribeRemoteGroupMemberships(
      authSession.currentGroupId,
      ({ memberships: nextMemberships, error }) => {
        setRemoteMembershipsState({
          groupId: authSession.currentGroupId,
          memberships: nextMemberships,
          error,
        })
      },
    )
  }, [authSession.currentGroupId])

  useEffect(() => {
    if (!authSession.currentGroupId) {
      return undefined
    }

    return subscribeRemoteMembers(authSession.currentGroupId, ({ members: nextMembers, error }) => {
      setRemoteMembersState({
        groupId: authSession.currentGroupId,
        members: nextMembers,
        error,
      })
    })
  }, [authSession.currentGroupId])

  useEffect(() => {
    if (!authSession.currentGroupId || !selectedSession?.id || selectedSession.status !== 'held') {
      return undefined
    }

    return subscribeRemoteAttendance(
      authSession.currentGroupId,
      selectedSession.id,
      ({ attendances: nextAttendances, error }) => {
        setRemoteAttendanceState({
          groupId: authSession.currentGroupId,
          meetingId: selectedSession.id,
          attendances: nextAttendances,
          error,
        })
      },
    )
  }, [authSession.currentGroupId, selectedSession?.id, selectedSession?.status])

  useEffect(() => {
    if (!authSession.currentGroupId || !selectedMember?.id) {
      return undefined
    }

    return subscribeRemotePastoralNotes(
      authSession.currentGroupId,
      selectedMember.id,
      ({ notes, error }) => {
        setRemotePastoralNotesState({
          groupId: authSession.currentGroupId,
          memberId: selectedMember.id,
          notes,
          error,
        })
      },
    )
  }, [authSession.currentGroupId, selectedMember?.id])

  useEffect(() => {
    if (!authSession.currentGroupId) {
      return undefined
    }

    return subscribeRemoteMeetings(authSession.currentGroupId, ({ meetings, error }) => {
      setRemoteMeetingsState({
        groupId: authSession.currentGroupId,
        meetings,
        error,
      })
    })
  }, [authSession.currentGroupId])

  useEffect(() => {
    if (!authSession.currentGroupId || !activeImportRunId) {
      return undefined
    }

    return subscribeExcelImportRun(authSession.currentGroupId, activeImportRunId, ({ run, rows }) => {
      setActiveImportRun(run)
      setActiveImportRows(rows)
    })
  }, [activeImportRunId, authSession.currentGroupId])

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setImportStatus(
      'La creacion manual de miembros se habilitara con escritura remota en Firestore. Usa el Excel oficial por ahora.',
    )
  }

  async function handleAddSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!authSession.user || !authSession.currentGroupId || !canManageMeetings) {
      setAuthStatus('Solo owner o leader activos pueden registrar reuniones.')
      return
    }

    const form = new FormData(event.currentTarget)

    try {
      const input = {
        date: String(form.get('date') ?? ''),
        title: String(form.get('title') ?? 'Grupo en casa'),
        status: String(form.get('status')) === 'cancelled' ? 'cancelled' : 'held',
        comment: String(form.get('comment') ?? ''),
      } as const

      if (editingMeetingId) {
        await updateRemoteMeeting(authSession.currentGroupId, editingMeetingId, input)
        setAuthStatus('Reunion actualizada en Firebase.')
        setEditingMeetingId('')
      } else {
        await createRemoteMeeting(authSession.user, authSession.currentGroupId, input)
        setAuthStatus('Reunion registrada en Firebase.')
      }

      event.currentTarget.reset()
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo guardar la reunion.')
    }
  }

  async function handleDeleteMeeting(meetingId: string) {
    if (!authSession.currentGroupId || !canManageMeetings) {
      setAuthStatus('Solo owner o leader activos pueden eliminar reuniones.')
      return
    }

    try {
      await deleteRemoteMeeting(authSession.currentGroupId, meetingId)
      if (selectedSessionId === meetingId) setSelectedSessionId('')
      if (editingMeetingId === meetingId) setEditingMeetingId('')
      setAuthStatus('Reunion eliminada.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo eliminar la reunion.')
    }
  }

  async function handleSetAttendance(memberId: string, status: AttendanceStatus) {
    if (!authSession.user || !authSession.currentGroupId || !selectedSession) {
      setAuthStatus('Selecciona una reunion remota antes de registrar asistencia.')
      return
    }

    if (!canManageMeetings) {
      setAuthStatus('Solo owner o leader activos pueden registrar asistencia.')
      return
    }

    if (selectedSession.status !== 'held') {
      setAuthStatus('La asistencia solo aplica a reuniones realizadas.')
      return
    }

    try {
      await setRemoteAttendance(
        authSession.user,
        authSession.currentGroupId,
        selectedSession.id,
        memberId,
        status,
      )
      setAuthStatus('Asistencia actualizada en Firebase.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo guardar la asistencia.')
    }
  }

  async function handleAddTimelineEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!authSession.user || !authSession.currentGroupId || !selectedMember) {
      setAuthStatus('Selecciona una persona remota antes de registrar la bitacora.')
      return
    }

    if (!canManageMeetings) {
      setAuthStatus('Solo owner o leader activos pueden registrar bitacora pastoral.')
      return
    }

    const form = new FormData(event.currentTarget)
    const typeValue = String(form.get('type') ?? 'note')
    const input = {
      date: String(form.get('date') ?? ''),
      type:
        typeValue === 'prayer' || typeValue === 'care' || typeValue === 'milestone'
          ? typeValue
          : 'note',
      body: String(form.get('body') ?? ''),
    } satisfies {
      date: string
      type: TimelineEntryType
      body: string
    }

    try {
      await createRemotePastoralNote(
        authSession.user,
        authSession.currentGroupId,
        selectedMember.id,
        input,
      )
      event.currentTarget.reset()
      setAuthStatus('Bitacora pastoral registrada en Firebase.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo guardar la bitacora.')
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return

    if (!authSession.user || !authSession.currentMembership) {
      setImportStatus('Inicia sesion y selecciona un grupo remoto antes de subir el Excel.')
      event.currentTarget.value = ''
      return
    }

    if (!['owner', 'leader'].includes(authSession.currentMembership.role)) {
      setImportStatus('Solo owner o leader pueden preparar importaciones desde Excel.')
      event.currentTarget.value = ''
      return
    }

    try {
      setImportStatus('Creando importRun y subiendo archivo a Firebase Storage...')
      const { importRunId, storagePath } = await createExcelImportRun(
        authSession.user,
        authSession.currentMembership.groupId,
        file,
      )

      setActiveImportRunId(importRunId)
      setIsImportReviewOpen(false)
      await uploadExcelImportFile(storagePath, file)
      setImportStatus('Archivo subido. El backend esta generando el preview.')
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'No se pudo subir el archivo.')
    } finally {
      event.currentTarget.value = ''
    }
  }

  async function handleConfirmImport() {
    if (!visibleImportRun || !authSession.currentGroupId) return

    try {
      setIsConfirmingImport(true)
      setImportStatus('Confirmando importacion y escribiendo miembros en Firestore...')
      const result = await confirmExcelImportRun(authSession.currentGroupId, visibleImportRun.id)
      setImportStatus(
        `Importacion confirmada. Creados: ${result.created}. Actualizados: ${result.updated}.`,
      )
      setIsImportReviewOpen(false)
    } catch (error) {
      setImportStatus(
        error instanceof Error ? error.message : 'No se pudo confirmar la importacion.',
      )
    } finally {
      setIsConfirmingImport(false)
    }
  }

  async function handleGoogleSignIn() {
    setAuthStatus('')

    try {
      await signInWithGoogle()
      await authSession.refresh()
      setAuthStatus('Sesion iniciada con Google.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo iniciar sesion.')
    }
  }

  async function handleEmailAuth(formElement: HTMLFormElement, mode: 'register' | 'sign-in') {
    setAuthStatus('')

    const form = new FormData(formElement)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')

    if (!email || !password) {
      setAuthStatus('Escribe correo y contrasena.')
      return
    }

    try {
      if (mode === 'register') {
        await registerWithEmail(email, password)
        setAuthStatus('Cuenta creada e inicio de sesion activo.')
      } else {
        await signInWithEmail(email, password)
        setAuthStatus('Sesion iniciada.')
      }

      await authSession.refresh()
      formElement.reset()
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo completar la accion.')
    }
  }

  async function handleSignOut() {
    setAuthStatus('')

    try {
      await signOutCurrentUser()
      setAuthStatus('Sesion cerrada. Inicia sesion para usar la persistencia en Firebase.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo cerrar sesion.')
    }
  }

  async function handleCreateRemoteGroup(formElement: HTMLFormElement) {
    setAuthStatus('')

    if (!authSession.user) {
      setAuthStatus('Inicia sesion antes de crear un grupo remoto.')
      return
    }

    const form = new FormData(formElement)
    const name = String(form.get('groupName') ?? '').trim()

    try {
      const membership = await createRemoteGroup(authSession.user, {
        name,
        regularWeekday: meetingWeekday,
        makeDefault: !authSession.defaultGroupId,
      })

      authSession.selectGroup(membership.groupId)
      await authSession.refresh()
      formElement.reset()
      setAuthStatus(
        !authSession.defaultGroupId
          ? 'Grupo remoto creado. Quedaste como owner y se guardo como predeterminado.'
          : 'Grupo remoto creado. Quedaste como owner.',
      )
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo crear el grupo remoto.')
    }
  }

  async function handleSetDefaultGroup(groupId: string) {
    setAuthStatus('')

    if (!authSession.user) {
      setAuthStatus('Inicia sesion antes de cambiar el grupo predeterminado.')
      return
    }

    const hasActiveMembership = authSession.activeMemberships.some(
      (membership) => membership.groupId === groupId,
    )

    if (!hasActiveMembership) {
      setAuthStatus('No se puede usar como predeterminado un grupo sin membership activa.')
      return
    }

    try {
      await setDefaultGroupId(authSession.user.uid, groupId)
      authSession.selectGroup(groupId)
      await authSession.refresh()
      setAuthStatus('Grupo predeterminado actualizado.')
    } catch (error) {
      setAuthStatus(
        error instanceof Error ? error.message : 'No se pudo actualizar el grupo predeterminado.',
      )
    }
  }

  async function handleUpdateGroupSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!authSession.currentGroupId || !canManageGroupSettings) {
      setAuthStatus('Solo owner activo puede actualizar parametros del grupo.')
      return
    }

    const form = new FormData(event.currentTarget)
    const weekday = Number(form.get('regularWeekday'))

    try {
      await updateRemoteGroupSettings(authSession.currentGroupId, {
        name: String(form.get('groupName') ?? ''),
        regularWeekday: weekday as Weekday,
      })
      await authSession.refresh()
      setAuthStatus('Parametros del grupo actualizados en Firebase.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudieron guardar parametros.')
    }
  }

  async function handleUpdateMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!authSession.currentGroupId || !canManageGroupSettings) {
      setAuthStatus('Solo owner activo puede administrar membresias.')
      return
    }

    const form = new FormData(event.currentTarget)
    const targetUserId = String(form.get('targetUserId') ?? '')
    const roleValue = String(form.get('role') ?? '')
    const statusValue = String(form.get('status') ?? '')

    try {
      await updateRemoteGroupMembership(authSession.currentGroupId, {
        targetUserId,
        role: roleValue === 'leader' ? 'leader' : 'viewer',
        status: statusValue === 'inactive' ? 'inactive' : 'active',
      })
      await authSession.refresh()
      setAuthStatus('Membresia actualizada en Firebase.')
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : 'No se pudo actualizar membresia.')
    }
  }

  return (
    <main className="min-h-svh bg-stone-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">Seguimiento pastoral</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-slate-950">
                {groupName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Registro pastoral con persistencia en Firebase para miembros, importaciones y
                proximas fases remotas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric icon={Users} label="Personas" value={members.length.toString()} />
              <Metric icon={CalendarCheck} label="Reuniones" value={heldSessions.length.toString()} />
              <Metric icon={Check} label="Asistencia" value={`${attendanceRate}%`} />
              <Metric icon={Clock3} label="Proxima" value={formatDate(nextMeetingDate(meetingWeekday))} />
            </div>
          </div>
          <AuthPanel
            authSession={authSession}
            authStatus={authStatus}
            localGroupName={groupName}
            onEmailAuth={handleEmailAuth}
            onCreateRemoteGroup={handleCreateRemoteGroup}
            onGoogleSignIn={handleGoogleSignIn}
            onSetDefaultGroup={handleSetDefaultGroup}
            onSignOut={handleSignOut}
          />
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

            <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Preview desde Excel oficial
                <input
                  accept=".xlsx"
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
                  onChange={handleImportFile}
                  type="file"
                />
              </label>
              <p className="mt-2 text-sm leading-6 text-slate-600">{importStatus}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                El archivo se procesa de forma segura en backend. Revisa el preview y confirma
                antes de escribir miembros definitivos.
              </p>
              <ImportRunPreview
                isConfirming={isConfirmingImport}
                onOpenReview={() => setIsImportReviewOpen(true)}
                run={visibleImportRun}
                rows={visibleImportRows}
              />
            </div>

            <RemoteMembersList
              authSession={authSession}
              error={remoteMembersError}
              isLoading={isLoadingMembers}
              members={members}
              onSelectMember={setSelectedMemberId}
              selectedMemberId={selectedMember?.id ?? ''}
            />
          </Panel>

          <Panel title="Programacion y asistencias" icon={CalendarCheck}>
            <form
              className="grid gap-3 border-b border-slate-200 pb-4"
              key={editingMeeting?.id ?? 'new-meeting'}
              onSubmit={handleAddSession}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <Field
                  defaultValue={editingMeeting?.date}
                  label="Fecha"
                  name="date"
                  type="date"
                />
                <Field
                  defaultValue={editingMeeting?.title}
                  label="Titulo"
                  name="title"
                  placeholder="Grupo en casa"
                />
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Estado
                  <select
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950"
                    defaultValue={editingMeeting?.status ?? 'held'}
                    name="status"
                  >
                    <option value="held">Realizado</option>
                    <option value="cancelled">No realizado</option>
                  </select>
                </label>
              </div>
              <Field
                defaultValue={editingMeeting?.comment}
                label="Comentario"
                name="comment"
                placeholder="Motivo o resumen"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={!canManageMeetings}
                >
                  <Plus size={16} /> {editingMeeting ? 'Actualizar fecha' : 'Registrar fecha'}
                </button>
                {editingMeeting ? (
                  <button
                    className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:border-slate-500"
                    onClick={() => setEditingMeetingId('')}
                    type="button"
                  >
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
              {!canManageMeetings ? (
                <p className="text-sm text-slate-600">
                  Solo owner o leader activos pueden registrar reuniones.
                </p>
              ) : null}
            </form>

            <div className="mt-4 grid gap-3">
              <RemoteMeetingsStateMessage
                authSession={authSession}
                error={remoteMeetingsError}
                isLoading={isLoadingMeetings}
                meetings={sessions}
              />
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'rounded-md border p-3 text-left transition hover:border-emerald-500',
                    selectedSession?.id === session.id
                      ? 'border-emerald-600 bg-emerald-50'
                      : 'border-slate-200 bg-white',
                  )}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => setSelectedSessionId(session.id)}
                    type="button"
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
                  {canManageMeetings ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:border-emerald-600"
                        onClick={() => setEditingMeetingId(session.id)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="h-9 rounded-md border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-900 hover:border-red-400"
                        onClick={() => handleDeleteMeeting(session.id)}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : null}
                </div>
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
                ) : isLoadingAttendance ? (
                  <EmptyState text="Cargando asistencia desde Firestore..." />
                ) : remoteAttendanceError ? (
                  <EmptyState text={remoteAttendanceError} />
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
                              disabled={!canManageMeetings}
                              onClick={() => handleSetAttendance(member.id, status)}
                              type="button"
                            >
                              {attendanceLabels[status]}
                            </button>
                          ))}
                        </div>
                        {!canManageMeetings ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Solo owner o leader activos pueden editar asistencia.
                          </p>
                        ) : null}
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
                  <button
                    className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                    disabled={!canManageMeetings}
                  >
                    <Plus size={16} /> Agregar a bitacora
                  </button>
                  {!canManageMeetings ? (
                    <p className="text-sm text-slate-600">
                      Solo owner o leader activos pueden registrar bitacora pastoral.
                    </p>
                  ) : null}
                </form>
                <Timeline
                  error={remotePastoralNotesError}
                  isLoading={isLoadingPastoralNotes}
                  notes={pastoralNotes}
                />
              </div>
            ) : (
              <EmptyState text="Selecciona una persona para ver su proceso." />
            )}
          </Panel>

          <Panel title="Parametros" icon={Settings}>
            <form
              className="grid gap-3"
              key={`${authSession.currentGroupId}-${groupName}-${meetingWeekday}`}
              onSubmit={handleUpdateGroupSettings}
            >
              <Field
                defaultValue={groupName}
                disabled={!canManageGroupSettings}
                label="Nombre del grupo"
                name="groupName"
                placeholder="Nombre del grupo"
              />
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Dia regular de reunion
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 disabled:bg-slate-100 disabled:text-slate-500"
                  defaultValue={meetingWeekday}
                  disabled={!canManageGroupSettings}
                  name="regularWeekday"
                >
                  {weekdayOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!canManageGroupSettings}
              >
                <Settings size={16} /> Guardar parametros
              </button>
            </form>
            {remoteGroupError ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {remoteGroupError}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-slate-600">
              Dia configurado: {getWeekdayLabel(meetingWeekday)}.
              {!canManageGroupSettings ? ' Solo owner activo puede editar parametros.' : ''}
            </p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Users size={16} className="text-emerald-700" />
                <h3 className="text-sm font-semibold text-slate-900">Membresias</h3>
              </div>
              {remoteMembershipsError ? (
                <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  {remoteMembershipsError}
                </p>
              ) : null}
              {groupMemberships.length ? (
                <div className="grid gap-2">
                  {groupMemberships.map((membership) => {
                    const isOwnerMembership = membership.role === 'owner'
                    const isEditableMembership = canManageGroupSettings && !isOwnerMembership

                    return (
                      <form
                        className="grid gap-2 rounded-md border border-slate-200 bg-white p-3"
                        key={membership.userId}
                        onSubmit={handleUpdateMembership}
                      >
                        <input name="targetUserId" type="hidden" value={membership.userId} />
                        <div>
                          <p className="truncate text-sm font-medium text-slate-900">
                            {membership.displayName || membership.email || membership.userId}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {membership.email || membership.userId}
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Rol
                            <select
                              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 disabled:bg-slate-100 disabled:text-slate-500"
                              defaultValue={membership.role}
                              disabled={!isEditableMembership}
                              name="role"
                            >
                              {isOwnerMembership ? <option value="owner">Owner</option> : null}
                              <option value="leader">Leader</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </label>
                          <label className="grid gap-1 text-sm font-medium text-slate-700">
                            Estado
                            <select
                              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 disabled:bg-slate-100 disabled:text-slate-500"
                              defaultValue={membership.status}
                              disabled={!isEditableMembership}
                              name="status"
                            >
                              <option value="active">Activo</option>
                              <option value="inactive">Inactivo</option>
                            </select>
                          </label>
                        </div>
                        <button
                          className="inline-flex h-9 w-fit items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                          disabled={!isEditableMembership}
                        >
                          <Check size={15} /> Guardar membresia
                        </button>
                      </form>
                    )
                  })}
                </div>
              ) : (
                <EmptyState text="No hay membresias remotas para este grupo." />
              )}
              <p className="mt-3 text-sm text-slate-600">
                Esta fase administra membresias existentes. La invitacion de usuarios nuevos queda
                para una fase posterior.
              </p>
            </div>
          </Panel>
        </aside>
      </div>
      {isImportReviewOpen && visibleImportRun ? (
        <ImportReviewDialog
          isConfirming={isConfirmingImport}
          onClose={() => setIsImportReviewOpen(false)}
          onConfirm={handleConfirmImport}
          rows={visibleImportRows}
          run={visibleImportRun}
        />
      ) : null}
    </main>
  )
}

function RemoteMembersList({
  authSession,
  error,
  isLoading,
  members,
  onSelectMember,
  selectedMemberId,
}: {
  authSession: AuthSession
  error: string
  isLoading: boolean
  members: RemoteMember[]
  onSelectMember: (memberId: string) => void
  selectedMemberId: string
}) {
  if (!authSession.isConfigured) {
    return <EmptyState text="Configura Firebase para cargar miembros remotos." />
  }

  if (!authSession.user) {
    return <EmptyState text="Inicia sesion para cargar miembros desde Firebase." />
  }

  if (!authSession.currentGroupId) {
    return <EmptyState text="Selecciona o crea un grupo remoto para ver sus miembros." />
  }

  if (isLoading) {
    return <EmptyState text="Cargando miembros desde Firestore..." />
  }

  if (error) {
    return <EmptyState text={error} />
  }

  if (!members.length) {
    return <EmptyState text="Este grupo remoto aun no tiene miembros. Sube el Excel oficial para importar." />
  }

  return (
    <div className="mt-4 grid gap-2">
      {members.map((member) => (
        <button
          key={member.id}
          className={cn(
            'grid gap-1 rounded-md border p-3 text-left transition hover:border-emerald-500',
            selectedMemberId === member.id
              ? 'border-emerald-600 bg-emerald-50'
              : 'border-slate-200 bg-white',
          )}
          onClick={() => onSelectMember(member.id)}
          type="button"
        >
          <span className="font-medium text-slate-950">{member.fullName}</span>
          <span className="text-sm text-slate-600">
            {memberStatusLabels[member.status]}
            {member.joinedAt ? ` · Desde ${formatDate(member.joinedAt)}` : ''}
          </span>
        </button>
      ))}
    </div>
  )
}

function RemoteMeetingsStateMessage({
  authSession,
  error,
  isLoading,
  meetings,
}: {
  authSession: AuthSession
  error: string
  isLoading: boolean
  meetings: RemoteMeeting[]
}) {
  if (!authSession.isConfigured) {
    return <EmptyState text="Configura Firebase para cargar reuniones remotas." />
  }

  if (!authSession.user) {
    return <EmptyState text="Inicia sesion para cargar reuniones desde Firebase." />
  }

  if (!authSession.currentGroupId) {
    return <EmptyState text="Selecciona o crea un grupo remoto para ver sus reuniones." />
  }

  if (isLoading) {
    return <EmptyState text="Cargando reuniones desde Firestore..." />
  }

  if (error) {
    return <EmptyState text={error} />
  }

  if (!meetings.length) {
    return <EmptyState text="Este grupo remoto aun no tiene reuniones registradas." />
  }

  return null
}

function AuthPanel({
  authSession,
  authStatus,
  localGroupName,
  onCreateRemoteGroup,
  onEmailAuth,
  onGoogleSignIn,
  onSetDefaultGroup,
  onSignOut,
}: {
  authSession: AuthSession
  authStatus: string
  localGroupName: string
  onCreateRemoteGroup: (formElement: HTMLFormElement) => void
  onEmailAuth: (formElement: HTMLFormElement, mode: 'register' | 'sign-in') => void
  onGoogleSignIn: () => void
  onSetDefaultGroup: (groupId: string) => void
  onSignOut: () => void
}) {
  const activeMemberships = authSession.activeMemberships
  const currentMembership = authSession.currentMembership
  const defaultGroupIsInvalid = Boolean(authSession.defaultGroupId && !authSession.activeDefaultMembership)

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-slate-950">Sesion Firebase</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Inicia sesion para cargar el grupo remoto y persistir datos en Firebase.
          </p>
          {!authSession.isConfigured ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Configura `.env.local` con las variables VITE_FIREBASE_* para activar Auth.
            </p>
          ) : null}
          {authSession.error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {authSession.error}
            </p>
          ) : null}
          {authStatus ? (
            <p className="mt-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {authStatus}
            </p>
          ) : null}
        </div>

        {authSession.user ? (
          <div className="grid gap-3">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-emerald-700">Sesion iniciada</p>
              <p className="text-sm font-medium text-slate-950">
                {authSession.profile?.displayName || authSession.user.displayName || 'Usuario autenticado'}
              </p>
              <p className="text-sm text-slate-600">
                {authSession.profile?.email || authSession.user.email}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {authSession.isLoading
                  ? 'Cargando contexto remoto...'
                  : currentMembership
                    ? `Grupo remoto actual: ${currentMembership.groupName ?? currentMembership.groupId}`
                    : activeMemberships.length > 1
                      ? 'Selecciona un grupo remoto para esta sesion.'
                      : 'No tienes grupos remotos todavía.'}
              </p>
              {authSession.defaultGroupId ? (
                <p className="mt-1 text-xs text-slate-500">
                  DefaultGroupId:{' '}
                  {defaultGroupIsInvalid
                    ? 'no se usa porque no tiene membership activa.'
                    : authSession.defaultGroupId}
                </p>
              ) : null}
            </div>
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-950">
                Persistencia remota activa por grupo
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Los miembros importados se leen desde Firestore. Reuniones, asistencias y
                bitacoras se habilitaran cuando sus colecciones remotas esten listas.
              </p>
            </div>
            {activeMemberships.length ? (
              <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3">
                <p className="text-sm font-medium text-slate-950">Grupos remotos</p>
                {activeMemberships.map((membership) => {
                  const isCurrent = membership.groupId === authSession.currentGroupId
                  const isDefault = membership.groupId === authSession.defaultGroupId

                  return (
                    <div
                      className={cn(
                        'grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_auto] sm:items-center',
                        isCurrent ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200',
                      )}
                      key={membership.groupId}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-950">
                          {membership.groupName ?? membership.groupId}
                        </p>
                        <p className="text-xs text-slate-600">
                          {membership.role} · {isDefault ? 'predeterminado' : 'membership activa'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:border-emerald-600"
                          onClick={() => authSession.selectGroup(membership.groupId)}
                          type="button"
                        >
                          {isCurrent ? 'Actual' : 'Usar'}
                        </button>
                        {!isDefault ? (
                          <button
                            className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-700"
                            onClick={() => onSetDefaultGroup(membership.groupId)}
                            type="button"
                          >
                            Hacer default
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <form
                className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  onCreateRemoteGroup(event.currentTarget)
                }}
              >
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Nombre del primer grupo remoto
                  <input
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-600"
                    defaultValue={localGroupName}
                    name="groupName"
                  />
                </label>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                  disabled={authSession.isLoading}
                  type="submit"
                >
                  <Plus size={16} /> Crear mi primer grupo
                </button>
              </form>
            )}
            <button
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:border-slate-400"
              onClick={onSignOut}
              type="button"
            >
              <LogOut size={16} /> Cerrar sesion
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            <button
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={!authSession.isConfigured || authSession.isLoading}
              onClick={onGoogleSignIn}
              type="button"
            >
              <LogIn size={16} /> Entrar con Google
            </button>
            <form
              className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto_auto]"
              onSubmit={(event) => {
                event.preventDefault()
                onEmailAuth(event.currentTarget, 'sign-in')
              }}
            >
              <input
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
                name="email"
                placeholder="Correo"
                type="email"
              />
              <input
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-emerald-600"
                name="password"
                placeholder="Contrasena"
                type="password"
              />
              <button
                className="h-10 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-800 hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={!authSession.isConfigured || authSession.isLoading}
                type="submit"
              >
                Entrar
              </button>
              <button
                className="h-10 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={!authSession.isConfigured || authSession.isLoading}
                onClick={(event) => {
                  if (event.currentTarget.form) {
                    onEmailAuth(event.currentTarget.form, 'register')
                  }
                }}
                type="button"
              >
                Crear
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

function ImportRunPreview({
  isConfirming,
  onOpenReview,
  run,
  rows,
}: {
  isConfirming: boolean
  onOpenReview: () => void
  run: ExcelImportRun | null
  rows: ExcelImportPreviewRow[]
}) {
  if (!run) return null
  const canReview = run.status === 'preview_ready' && Boolean(run.summary) && rows.length > 0
  const hasErrors = Boolean(run.summary?.errors)

  return (
    <div className="mt-3 grid gap-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-950">ImportRun {run.id}</p>
          <p className="text-xs text-slate-500">{run.fileName ?? run.storagePath}</p>
        </div>
        <span className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
          {importStatusLabel(run.status)}
        </span>
      </div>

      {run.status === 'failed' ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          El backend no pudo generar el preview.
        </p>
      ) : null}

      {run.status === 'imported' && run.result ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          Importacion completada. Creados: {run.result.created}. Actualizados:{' '}
          {run.result.updated}.
        </p>
      ) : null}

      {run.summary ? (
        <dl className="grid gap-2 sm:grid-cols-4">
          <ImportMetric label="Filas" value={run.summary.totalRows} />
          <ImportMetric label="Validas" value={run.summary.validRows} />
          <ImportMetric label="Crear" value={run.summary.membersToCreate} />
          <ImportMetric label="Actualizar" value={run.summary.membersToUpdate} />
        </dl>
      ) : null}

      {run.errors?.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-slate-950">Errores y advertencias</p>
          {run.errors.slice(0, 6).map((error, index) => (
            <p
              className="rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900"
              key={`${error.rowNumber}-${error.field ?? 'file'}-${index}`}
            >
              Fila {error.rowNumber || 'archivo'}: {error.message}
            </p>
          ))}
        </div>
      ) : null}

      {rows.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium text-slate-950">Primeras filas del preview</p>
          {rows.slice(0, 5).map((row) => (
            <div className="rounded-md border border-slate-200 p-2" key={row.rowNumber}>
              <p className="text-sm font-medium text-slate-950">{row.fullName}</p>
              <p className="text-xs text-slate-600">
                Fila {row.rowNumber} · {row.action === 'update' ? 'Actualizar' : 'Crear'}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {canReview ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={isConfirming || hasErrors}
            onClick={onOpenReview}
            type="button"
          >
            <FileSearch size={16} /> Revisar y confirmar
          </button>
          {hasErrors ? (
            <p className="text-sm text-amber-800">
              Hay errores en el preview. Corrigelos antes de importar.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ImportReviewDialog({
  isConfirming,
  onClose,
  onConfirm,
  rows,
  run,
}: {
  isConfirming: boolean
  onClose: () => void
  onConfirm: () => void
  rows: ExcelImportPreviewRow[]
  run: ExcelImportRun
}) {
  const createCount = rows.filter((row) => row.action === 'create').length
  const updateCount = rows.filter((row) => row.action === 'update').length

  return (
    <div
      aria-labelledby="import-review-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6"
      role="dialog"
    >
      <div className="grid max-h-full w-full max-w-5xl grid-rows-[auto_1fr_auto] rounded-md bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <p className="text-xs font-medium uppercase text-emerald-700">Confirmar importacion</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950" id="import-review-title">
              {run.fileName ?? 'Excel oficial'}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Esta tabla es la lista que se escribira en Firestore. Los documentos completos se
              guardan solo en el perfil privado de cada persona.
            </p>
          </div>
          <button
            aria-label="Cerrar revision"
            className="inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:border-slate-500"
            disabled={isConfirming}
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 overflow-auto p-4">
          <dl className="mb-4 grid gap-2 sm:grid-cols-3">
            <ImportMetric label="Crear" value={createCount} />
            <ImportMetric label="Actualizar" value={updateCount} />
            <ImportMetric label="Filas" value={rows.length} />
          </dl>
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Accion</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Persona</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Genero</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Cumpleanos</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Desde</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Rol</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Servidor</th>
                <th className="border-b border-slate-200 px-3 py-2 font-medium">Sirviendo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-b border-slate-100" key={row.rowNumber}>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-1 text-xs font-medium',
                        row.action === 'update'
                          ? 'border-sky-200 bg-sky-50 text-sky-900'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-900',
                      )}
                    >
                      {row.action === 'update' ? 'Actualizar' : 'Crear'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-slate-950">{row.fullName}</p>
                    <p className="text-xs text-slate-500">Fila {row.rowNumber}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{row.gender ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.birthday ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.joinedAt ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.groupRole ?? '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.isServer ? 'Si' : 'No'}</td>
                  <td className="px-3 py-2 text-slate-700">{row.isServing ? 'Si' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 p-4">
          <button
            className="h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400"
            disabled={isConfirming}
            onClick={onClose}
            type="button"
          >
            Volver
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={isConfirming || rows.length === 0}
            onClick={onConfirm}
            type="button"
          >
            <Check size={16} /> {isConfirming ? 'Importando...' : 'Aprobar importacion'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ImportMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  )
}

function importStatusLabel(status: ExcelImportRun['status']) {
  const labels: Record<ExcelImportRun['status'], string> = {
    uploaded: 'Subido',
    processing: 'Procesando',
    preview_ready: 'Preview listo',
    importing: 'Importando',
    imported: 'Importado',
    failed: 'Fallido',
    cancelled: 'Cancelado',
  }

  return labels[status]
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
  defaultValue,
  disabled = false,
  label,
  name,
  placeholder,
  type = 'text',
}: {
  defaultValue?: string
  disabled?: boolean
  label: string
  name: string
  placeholder?: string
  type?: string
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-500"
        defaultValue={defaultValue}
        disabled={disabled}
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  )
}

function MemberSummary({ member }: { member: RemoteMember }) {
  const administrativeFields = [
    member.gender ? ['Genero', member.gender] : null,
    member.groupRole ? ['Rol en grupo', member.groupRole] : null,
    typeof member.semesterAttendances === 'number'
      ? ['Asistencias semestre', member.semesterAttendances.toString()]
      : null,
    typeof member.isServer === 'boolean' ? ['Servidor', member.isServer ? 'Si' : 'No'] : null,
    typeof member.isServing === 'boolean'
      ? ['Esta sirviendo', member.isServing ? 'Si' : 'No']
      : null,
  ].filter((field): field is [string, string] => Boolean(field))

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="font-medium text-slate-950">{member.fullName}</p>
      <p className="mt-1 text-sm text-slate-600">
        {memberStatusLabels[member.status]}
        {member.joinedAt ? ` · Desde ${formatDate(member.joinedAt)}` : ''}
      </p>
      {administrativeFields.length ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {administrativeFields.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}

function Timeline({
  error,
  isLoading,
  notes,
}: {
  error: string
  isLoading: boolean
  notes: RemotePastoralNote[]
}) {
  if (isLoading) {
    return <EmptyState text="Cargando bitacora desde Firestore..." />
  }

  if (error) {
    return <EmptyState text={error} />
  }

  if (!notes.length) {
    return <EmptyState text="Esta persona aun no tiene bitacora pastoral remota." />
  }

  return (
    <div className="grid gap-3">
      {notes.map((entry) => (
        <article className="rounded-md border border-slate-200 bg-white p-3" key={entry.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-950">{formatDate(entry.date)}</p>
            <span className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
              {timelineTypeLabels[entry.type]}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{entry.body}</p>
        </article>
      ))}
    </div>
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
