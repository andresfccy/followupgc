import { useEffect, useMemo, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  getUserProfile,
  observeAuthState,
  type UserProfile,
} from '@/lib/auth'
import { firebaseRuntime } from '@/lib/firebase'
import {
  getUserGroupMemberships,
  type UserGroupMembership,
} from '@/lib/remoteGroups'

export type AuthSession = {
  user: User | null
  profile: UserProfile | null
  memberships: UserGroupMembership[]
  activeMemberships: UserGroupMembership[]
  defaultGroupId?: string
  activeDefaultMembership: UserGroupMembership | null
  currentMembership: UserGroupMembership | null
  currentGroupId: string
  selectGroup: (groupId: string) => void
  isConfigured: boolean
  isLoading: boolean
  error: string
  refresh: () => Promise<void>
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [memberships, setMemberships] = useState<UserGroupMembership[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [isLoading, setIsLoading] = useState(firebaseRuntime.isConfigured)
  const [error, setError] = useState('')

  async function loadUserContext(nextUser: User | null) {
    setError('')

    if (!nextUser) {
      setProfile(null)
      setMemberships([])
      setSelectedGroupId('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const [nextProfile, nextMemberships] = await Promise.all([
        getUserProfile(nextUser),
        getUserGroupMemberships(nextUser.uid),
      ])

      setProfile(nextProfile)
      setMemberships(nextMemberships)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la sesion.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser)
      void loadUserContext(nextUser)
    })

    return unsubscribe
  }, [])

  const activeMemberships = useMemo(
    () => memberships.filter((membership) => membership.status === 'active'),
    [memberships],
  )
  const activeDefaultMembership = profile?.defaultGroupId
    ? memberships.find(
        (membership) =>
          membership.groupId === profile.defaultGroupId && membership.status === 'active',
      ) ?? null
    : null
  const activeSelectedGroupId = activeMemberships.some(
    (membership) => membership.groupId === selectedGroupId,
  )
    ? selectedGroupId
    : ''
  const resolvedCurrentGroupId =
    activeSelectedGroupId ||
    activeDefaultMembership?.groupId ||
    (activeMemberships.length === 1 ? activeMemberships[0].groupId : '')
  const currentMembership =
    activeMemberships.find((membership) => membership.groupId === resolvedCurrentGroupId) ?? null

  return {
    user,
    profile,
    memberships,
    activeMemberships,
    defaultGroupId: profile?.defaultGroupId,
    activeDefaultMembership,
    currentMembership,
    currentGroupId: currentMembership?.groupId ?? '',
    selectGroup: setSelectedGroupId,
    isConfigured: firebaseRuntime.isConfigured,
    isLoading,
    error,
    refresh: () => loadUserContext(user),
  }
}
