export const legacyGroupStorageKey = 'followupgc-data'

export function clearLegacyGroupStorage() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(legacyGroupStorageKey)
}
