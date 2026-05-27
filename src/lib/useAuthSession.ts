import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import {
  getUserGroupMemberships,
  getUserProfile,
  observeAuthState,
  type UserGroupMembership,
  type UserProfile,
} from '@/lib/auth'
import { firebaseRuntime } from '@/lib/firebase'

export type AuthSession = {
  user: User | null
  profile: UserProfile | null
  memberships: UserGroupMembership[]
  defaultGroupId?: string
  activeDefaultMembership: UserGroupMembership | null
  isConfigured: boolean
  isLoading: boolean
  error: string
  refresh: () => Promise<void>
}

export function useAuthSession(): AuthSession {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [memberships, setMemberships] = useState<UserGroupMembership[]>([])
  const [isLoading, setIsLoading] = useState(firebaseRuntime.isConfigured)
  const [error, setError] = useState('')

  async function loadUserContext(nextUser: User | null) {
    setError('')

    if (!nextUser) {
      setProfile(null)
      setMemberships([])
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

  const activeDefaultMembership = profile?.defaultGroupId
    ? memberships.find(
        (membership) =>
          membership.groupId === profile.defaultGroupId && membership.status === 'active',
      ) ?? null
    : null

  return {
    user,
    profile,
    memberships,
    defaultGroupId: profile?.defaultGroupId,
    activeDefaultMembership,
    isConfigured: firebaseRuntime.isConfigured,
    isLoading,
    error,
    refresh: () => loadUserContext(user),
  }
}
