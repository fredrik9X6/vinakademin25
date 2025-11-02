'use client'

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { User as PayloadUser } from '@/payload-types' // Import User type from generated types
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
// We don't need the full form values type here anymore
// import { RegistrationFormValues } from '@/components/auth/RegistrationForm'

// Define the type for the actual registration API call data
export type RegisterUserData = Omit<
  PayloadUser,
  | 'id'
  | 'updatedAt'
  | 'createdAt'
  | 'salt'
  | 'hash'
  | 'loginAttempts'
  | 'lockUntil'
  | 'resetPasswordToken'
  | 'resetPasswordExpiration'
  | '_verified'
  | '_verificationToken'
  | 'role'
> & {
  password?: string // Make password explicitly optional or required based on Payload config
  // Add any other fields required for user creation that are not in PayloadUser base type
}

// Define a frontend-friendly User type (can be same as PayloadUser or a subset)
// Using PayloadUser directly for consistency for now
type User = PayloadUser

// Define a simple Permissions interface
interface Permissions {
  canAccessAdmin: boolean
  canManageUsers: boolean
  canManageCourses: boolean
}

interface AuthContextType {
  user: User | null
  setUser: React.Dispatch<React.SetStateAction<User | null>> // Allow manual setting if needed
  permissions: Permissions | null // Add permissions state
  setPermissions: React.Dispatch<React.SetStateAction<Permissions | null>> // Add setter
  isLoading: boolean
  error: string | null
  loginUser: (credentials: { email: string; password: string }) => Promise<boolean>
  logoutUser: () => Promise<void>
  // Use the specific API data type
  registerUser: (userData: RegisterUserData) => Promise<boolean>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const checkAuth = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Use PayloadCMS 3 native /api/users/me endpoint
      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Crucial for sending cookies
      })

      if (response.ok) {
        // PayloadCMS 3 returns user directly: { user: {...} }
        const data = await response.json()
        const fetchedUser = data.user || data

        if (fetchedUser && fetchedUser.id) {
          setUser(fetchedUser)
        } else {
          setUser(null)
        }
      } else {
        // Not authenticated or other error
        setUser(null)
      }
    } catch (err) {
      console.warn('AuthContext: Network error during checkAuth (non-fatal):', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Helper function to translate common error messages to Swedish
  const translateErrorMessage = (message: string): string => {
    const translations: Record<string, string> = {
      'The email or password provided is incorrect.': 'Ogiltig e-postadress eller lösenord.',
      'User with email already exists.': 'En användare med denna e-postadress finns redan.',
      'Password must be at least 8 characters.': 'Lösenordet måste vara minst 8 tecken.',
      'Email is required.': 'E-postadress krävs.',
      'Password is required.': 'Lösenord krävs.',
      'First name is required.': 'Förnamn krävs.',
      'Last name is required.': 'Efternamn krävs.',
      'Account is not verified.': 'Kontot är inte verifierat.',
      'Account is locked.': 'Kontot är låst.',
      'Too many login attempts.': 'För många inloggningsförsök.',
    }

    return translations[message] || message
  }

  // Login function using PayloadCMS 3 native endpoint
  const loginUser = async (credentials: { email: string; password: string }): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Use PayloadCMS 3 native /api/users/login endpoint
      // PayloadCMS expects JSON: { email, password }
      const response = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        credentials: 'include', // Important for cookie handling
      })

      const data = await response.json()

      if (response.ok && data.user) {
        // PayloadCMS 3 returns: { user, token }
        // Check if user account is active
        if (data.user.accountStatus !== 'active') {
          setError('Kontot är inaktiverat eller suspenderat.')
          toast.error('Inloggning misslyckades', {
            description: 'Kontot är inaktiverat eller suspenderat.',
          })
          setIsLoading(false)
          return false
        }

        setUser(data.user)
        toast.success('Inloggning lyckades', {
          description: 'Välkommen tillbaka!',
        })

        router.refresh() // Refresh all server components
        setIsLoading(false)
        return true
      } else {
        // Handle PayloadCMS 3 error format: { "errors": [{ "message": "..." }] }
        let message = 'Ogiltig e-post eller lösenord.'

        if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
          message = translateErrorMessage(data.errors[0].message) || message
        } else if (data.message) {
          message = translateErrorMessage(data.message)
        }

        setError(message)
        toast.error('Inloggning misslyckades', {
          description: message,
        })
        setIsLoading(false)
        return false
      }
    } catch (err) {
      console.error('Login error:', err)
      const message = 'Ett oväntat fel inträffade vid inloggning.'
      setError(message)
      toast.error('Inloggningsfel', {
        description: message,
      })
      setIsLoading(false)
      return false
    }
  }

  // Logout function using PayloadCMS 3 native endpoint
  const logoutUser = async (): Promise<void> => {
    setIsLoading(true)
    try {
      // Use PayloadCMS 3 native /api/users/logout endpoint
      const response = await fetch('/api/users/logout', {
        method: 'POST',
        credentials: 'include', // Important for cookie handling
      })

      // PayloadCMS logout returns success status
      if (response.ok) {
        setUser(null)
        toast.success('Utloggad', {
          description: 'Du har loggats ut.',
        })

        router.refresh() // Refresh all server components
        router.push('/logga-in') // Redirect to login
      } else {
        throw new Error('Logout failed')
      }
    } catch (err) {
      console.error('Logout error:', err)
      // Still clear user locally even if API call fails
      setUser(null)
      toast.error('Utloggningsfel', {
        description: 'Kunde inte logga ut korrekt, sessionen rensad lokalt.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Registration function using PayloadCMS native API
  const registerUser = async (userData: RegisterUserData): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      // Use PayloadCMS's built-in REST API for user creation
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important for cookie handling
        body: JSON.stringify({
          ...userData,
          role: 'user', // Assign 'user' as the default role
        }),
      })

      const data = await response.json()
      console.log('AuthContext: Registration response via PayloadCMS API:', {
        status: response.status,
        data,
      })

      // PayloadCMS returns the created user in 'doc' field on success
      if (response.ok && data.doc) {
        toast.success('Registrering lyckades', {
          description: 'Kontot skapat. Vänligen kontrollera din e-post för att verifiera.',
        })

        // Refresh server components
        router.refresh()

        setIsLoading(false)
        return true
      } else {
        // Handle PayloadCMS native error format
        let errorMessage = 'Registreringen misslyckades.'

        if (data.errors && Array.isArray(data.errors)) {
          // PayloadCMS native error format: { "errors": [{ "message": "...", "field": "..." }] }
          const errorMessages = data.errors.map((e: any) => {
            const translatedMessage = translateErrorMessage(e.message || 'Okänt fel')
            if (e.field && e.message) {
              // Format field-specific errors in Swedish
              const fieldTranslations: Record<string, string> = {
                email: 'E-post',
                password: 'Lösenord',
                firstName: 'Förnamn',
                lastName: 'Efternamn',
              }
              const fieldName = fieldTranslations[e.field] || e.field
              return `${fieldName}: ${translatedMessage}`
            }
            return translatedMessage
          })
          errorMessage = errorMessages.join(', ')
        } else if (data.message) {
          errorMessage = translateErrorMessage(data.message)
        }

        console.log('AuthContext: Registration failed with error:', errorMessage)
        setError(errorMessage)
        toast.error('Registrering misslyckades', {
          description: errorMessage,
        })
        setIsLoading(false)
        return false
      }
    } catch (err) {
      console.error('Registration error:', err)
      const message = 'Ett oväntat fel inträffade vid registrering.'
      setError(message)
      toast.error('Registreringsfel', {
        description: message,
      })
      setIsLoading(false)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        permissions,
        setPermissions,
        isLoading,
        error,
        loginUser,
        logoutUser,
        registerUser,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
