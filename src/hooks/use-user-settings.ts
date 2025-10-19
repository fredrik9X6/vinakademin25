import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  fetchWinePreferences,
  updateWinePreferences,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  fetchProfileInfo,
  updateProfileInfo,
  fetchGrapes,
  fetchRegions,
  type WinePreferences,
  type NotificationPreferences,
  type ProfileInfo,
  type Grape,
  type Region,
} from '@/lib/api/user-settings'

// Hook for wine preferences
export function useWinePreferences(userId: string) {
  const [preferences, setPreferences] = useState<WinePreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchPreferences = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    const response = await fetchWinePreferences(userId)

    if (response.success && response.data) {
      setPreferences(response.data)
    } else {
      setError(response.message || 'Kunde inte hämta vinpreferenser')
    }

    setLoading(false)
  }

  const updatePreferences = async (newPreferences: Partial<WinePreferences>) => {
    if (!userId) return false

    setUpdating(true)
    setError(null)

    const response = await updateWinePreferences(userId, newPreferences)

    if (response.success && response.data) {
      setPreferences(response.data)
      toast.success(response.message || 'Vinpreferenser uppdaterade!')
      setUpdating(false)
      return true
    } else {
      const errorMessage = response.message || 'Kunde inte uppdatera vinpreferenser'
      setError(errorMessage)
      toast.error(errorMessage)
      setUpdating(false)
      return false
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  return {
    preferences,
    loading,
    error,
    updating,
    updatePreferences,
    refetch: fetchPreferences,
  }
}

// Hook for notification preferences
export function useNotificationPreferences(userId: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchPreferences = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    const response = await fetchNotificationPreferences(userId)

    if (response.success && response.data) {
      setPreferences(response.data)
    } else {
      setError(response.message || 'Kunde inte hämta aviseringsinställningar')
    }

    setLoading(false)
  }

  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return false

    setUpdating(true)
    setError(null)

    const response = await updateNotificationPreferences(userId, newPreferences)

    if (response.success && response.data) {
      setPreferences(response.data)
      toast.success(response.message || 'Aviseringsinställningar uppdaterade!')
      setUpdating(false)
      return true
    } else {
      const errorMessage = response.message || 'Kunde inte uppdatera aviseringsinställningar'
      setError(errorMessage)
      toast.error(errorMessage)
      setUpdating(false)
      return false
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  return {
    preferences,
    loading,
    error,
    updating,
    updatePreferences,
    refetch: fetchPreferences,
  }
}

// Hook for profile information
export function useProfileInfo(userId: string) {
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchProfile = async () => {
    if (!userId) return

    setLoading(true)
    setError(null)

    const response = await fetchProfileInfo(userId)

    if (response.success && response.data) {
      setProfile(response.data)
    } else {
      setError(response.message || 'Kunde inte hämta profilinformation')
    }

    setLoading(false)
  }

  const updateProfile = async (newProfile: Partial<ProfileInfo>) => {
    if (!userId) return false

    setUpdating(true)
    setError(null)

    const response = await updateProfileInfo(userId, newProfile)

    if (response.success && response.data) {
      setProfile(response.data)
      toast.success(response.message || 'Profil uppdaterad!')
      setUpdating(false)
      return true
    } else {
      const errorMessage = response.message || 'Kunde inte uppdatera profil'
      setError(errorMessage)
      toast.error(errorMessage)
      setUpdating(false)
      return false
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [userId])

  return {
    profile,
    loading,
    error,
    updating,
    updateProfile,
    refetch: fetchProfile,
  }
}

// Hook for grapes data
export function useGrapes(params?: { search?: string; limit?: number }) {
  const [grapes, setGrapes] = useState<Grape[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGrapesData = async () => {
    setLoading(true)
    setError(null)

    const response = await fetchGrapes(params)

    if (response.success && response.data) {
      setGrapes(response.data)
    } else {
      setError(response.message || 'Kunde inte hämta druvsorter')
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchGrapesData()
  }, [params?.search, params?.limit])

  return {
    grapes,
    loading,
    error,
    refetch: fetchGrapesData,
  }
}

// Hook for regions data
export function useRegions(params?: { search?: string; country?: number; limit?: number }) {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRegionsData = async () => {
    setLoading(true)
    setError(null)

    const response = await fetchRegions(params)

    if (response.success && response.data) {
      setRegions(response.data)
    } else {
      setError(response.message || 'Kunde inte hämta vinregioner')
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchRegionsData()
  }, [params?.search, params?.country, params?.limit])

  return {
    regions,
    loading,
    error,
    refetch: fetchRegionsData,
  }
}
