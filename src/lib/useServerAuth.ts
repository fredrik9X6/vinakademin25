import { useState, useEffect, useCallback } from 'react'
import { getPayload } from 'payload'
import config from '../payload.config'
import { cookies } from 'next/headers'
import { User } from '../payload-types'

// Define the user type
interface AuthUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  isVerified: boolean
  accountStatus: string
}

// Define the auth context state
interface AuthState {
  user: AuthUser | null
  loading: boolean
  error: string | null
}

// Define the returned hook interface
interface UseServerAuth extends AuthState {
  isLoggedIn: boolean
  isAdmin: boolean
  isInstructor: boolean
  isSubscriber: boolean
  hasActiveSubscription: boolean
  canAccessAdmin: boolean
  canAccessInstructor: boolean
  canAccessSubscriberContent: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

/**
 * Custom hook for handling authentication and authorization
 * @returns Authentication state and helper functions
 */
export const useServerAuth = (): UseServerAuth => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  // Function to refresh the user data
  const refreshUser = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Initialize Payload
      const payload = await getPayload({ config })

      // Get the current user
      const { user } = await payload.auth({ headers })

      if (user) {
        setState({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isVerified: user.isVerified,
            accountStatus: user.accountStatus,
          },
          loading: false,
          error: null,
        })
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  // Function to log out
  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      // Initialize Payload
      const payload = await getPayload({ config })

      // Log out the user
      await payload.auth.logout()

      setState({
        user: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      console.error('Error logging out:', error)
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
    }
  }, [])

  // Load user on mount
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Derived state
  const { user, loading, error } = state
  const isLoggedIn = Boolean(user)
  const isAdmin = Boolean(user?.role === 'admin')
  const isInstructor = Boolean(user?.role === 'instructor')
  const isSubscriber = Boolean(user?.role === 'subscriber')

  // Permissions
  const canAccessAdmin = isAdmin
  const canAccessInstructor = isAdmin || isInstructor
  const canAccessSubscriberContent = isAdmin || isInstructor || isSubscriber
  const hasActiveSubscription =
    isAdmin || isInstructor || (isSubscriber && user?.accountStatus === 'active')

  return {
    user,
    loading,
    error,
    isLoggedIn,
    isAdmin,
    isInstructor,
    isSubscriber,
    hasActiveSubscription,
    canAccessAdmin,
    canAccessInstructor,
    canAccessSubscriberContent,
    logout,
    refreshUser,
  }
}
