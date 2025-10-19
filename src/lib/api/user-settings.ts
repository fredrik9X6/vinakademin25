// API utility functions for user settings
export interface WinePreferences {
  favoriteGrapes: number[]
  favoriteRegions: number[]
  preferredStyles: string[]
  tastingExperience: string
  discoveryPreferences: string[]
  priceRange: string
  tastingNotes: string
}

export interface NotificationPreferences {
  emailNotifications: {
    courseProgress: boolean
    newCourses: boolean
    wineRecommendations: boolean
    tastingEvents: boolean
    newsletter: boolean
    accountUpdates: boolean
  }
  pushNotifications: {
    courseReminders: boolean
    tastingReminders: boolean
    achievements: boolean
    socialActivity: boolean
  }
  platformNotifications: {
    inAppMessages: boolean
    systemAnnouncements: boolean
    maintenanceAlerts: boolean
    featureUpdates: boolean
  }
}

export interface ProfileInfo {
  firstName: string
  lastName: string
  email: string
  bio: string
  avatar: any | null
}

export interface Grape {
  id: number
  name: string
  color?: 'red' | 'white' | null
  description?: string | null
}

export interface Region {
  id: number
  name: string
  country:
    | {
        id: number
        name: string
      }
    | number
  description?: string | null
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

// Wine Preferences API
export async function fetchWinePreferences(userId: string): Promise<ApiResponse<WinePreferences>> {
  try {
    const response = await fetch(`/api/users/${userId}/preferences`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching wine preferences:', error)
    return {
      success: false,
      message: 'Kunde inte hämta vinpreferenser',
    }
  }
}

export async function updateWinePreferences(
  userId: string,
  preferences: Partial<WinePreferences>,
): Promise<ApiResponse<WinePreferences>> {
  try {
    const response = await fetch(`/api/users/${userId}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating wine preferences:', error)
    return {
      success: false,
      message: 'Kunde inte uppdatera vinpreferenser',
    }
  }
}

// Notification Preferences API
export async function fetchNotificationPreferences(
  userId: string,
): Promise<ApiResponse<NotificationPreferences>> {
  try {
    const response = await fetch(`/api/users/${userId}/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return {
      success: false,
      message: 'Kunde inte hämta aviseringsinställningar',
    }
  }
}

export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<ApiResponse<NotificationPreferences>> {
  try {
    const response = await fetch(`/api/users/${userId}/notifications`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return {
      success: false,
      message: 'Kunde inte uppdatera aviseringsinställningar',
    }
  }
}

// Profile Information API
export async function fetchProfileInfo(userId: string): Promise<ApiResponse<ProfileInfo>> {
  try {
    const response = await fetch(`/api/users/${userId}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching profile info:', error)
    return {
      success: false,
      message: 'Kunde inte hämta profilinformation',
    }
  }
}

export async function updateProfileInfo(
  userId: string,
  profile: Partial<ProfileInfo>,
): Promise<ApiResponse<ProfileInfo>> {
  try {
    const response = await fetch(`/api/users/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error updating profile info:', error)
    return {
      success: false,
      message: 'Kunde inte uppdatera profilinformation',
    }
  }
}

// Grapes API
export async function fetchGrapes(params?: {
  search?: string
  limit?: number
  page?: number
}): Promise<ApiResponse<Grape[]>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.page) searchParams.set('page', params.page.toString())

    const url = `/api/grapes${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const payloadResponse = await response.json()
    return {
      success: true,
      data: payloadResponse.docs,
    }
  } catch (error) {
    console.error('Error fetching grapes:', error)
    return {
      success: false,
      message: 'Kunde inte hämta druvsorter',
    }
  }
}

// Regions API
export async function fetchRegions(params?: {
  search?: string
  country?: number
  limit?: number
  page?: number
}): Promise<ApiResponse<Region[]>> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.country) searchParams.set('country', params.country.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.page) searchParams.set('page', params.page.toString())

    const url = `/api/regions${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const payloadResponse = await response.json()
    return {
      success: true,
      data: payloadResponse.docs,
    }
  } catch (error) {
    console.error('Error fetching regions:', error)
    return {
      success: false,
      message: 'Kunde inte hämta vinregioner',
    }
  }
}
