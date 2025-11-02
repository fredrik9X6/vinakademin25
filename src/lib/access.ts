import type { Access, PayloadRequest } from 'payload'
import type { User } from '../payload-types'

// Use PayloadCMS v3 Access type for proper type safety
// This ensures all access functions conform to PayloadCMS v3 API

// Define common role-based predicates using PayloadCMS v3 Access type
export const isAdmin = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(user?.role === 'admin')
}

export const isInstructor = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(user?.role === 'instructor')
}

export const isSubscriber = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(user?.role === 'subscriber')
}

export const isActiveUser = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(user && user.accountStatus === 'active')
}

export const hasActiveSubscription = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(
    user &&
      user.subscriptionStatus === 'active' &&
      user.subscriptionPlan &&
      user.subscriptionPlan !== 'none',
  )
}

export const isAdminOrInstructor = ({ req }: Parameters<Access>[0]): boolean => {
  const user = req.user
  return Boolean(user && (user.role === 'admin' || user.role === 'instructor'))
}

// Common access patterns using PayloadCMS v3 Access type
export const adminOnly: Access = ({ req }) => {
  return isAdmin({ req })
}

export const adminOrInstructorOnly: Access = ({ req }) => {
  return isAdminOrInstructor({ req })
}

export const adminOrSelf: Access = ({ req }) => {
  const user = req.user

  if (isAdmin({ req })) return true

  // Return query constraint or boolean
  return user
    ? {
        id: {
          equals: user.id,
        },
      }
    : false
}

export const subscribersAndAbove: Access = ({ req }) => {
  const user = req.user

  if (user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'subscriber') {
    return true
  }

  return false
}

export const anyLoggedIn: Access = ({ req }) => {
  const user = req.user
  return Boolean(user)
}

// Detect Admin UI requests (Payload v3) to allow form-state building
// Works for both Node/Express headers object and Web Fetch Headers
export const isAdminUIRequest = (req: PayloadRequest): boolean => {
  try {
    const headers = req?.headers
    if (!headers) return false
    // Headers can be a plain object or a Fetch Headers instance
    const getHeader = (name: string) => {
      if (typeof headers.get === 'function') return headers.get(name)
      const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase())
      return key ? headers[key] : undefined
    }
    const fromHeader = getHeader('x-payload-admin')
    return Boolean(fromHeader)
  } catch {
    return false
  }
}

export const activeSubscribersAndAbove: Access = ({ req }) => {
  const user = req.user

  if (user?.role === 'admin' || user?.role === 'instructor') {
    return true
  }

  if (user?.role === 'subscriber') {
    return Boolean(
      user.subscriptionStatus === 'active' &&
        user.subscriptionPlan &&
        user.subscriptionPlan !== 'none',
    )
  }

  return false
}

// Field-level access control - MUST return boolean only (not query constraints)
// Field access in PayloadCMS v3 only supports boolean return values
export const adminOrInstructorFieldLevel = ({ req }: Parameters<Access>[0]): boolean => {
  return isAdminOrInstructor({ req })
}

export const adminFieldLevel = ({ req }: Parameters<Access>[0]): boolean => {
  return isAdmin({ req })
}

export const selfFieldLevel = ({ req, id }: Parameters<Access>[0]): boolean => {
  const user = req.user
  // Ensure id is treated as a string/number compatible with user.id
  return Boolean(user && id && String(user.id) === String(id))
}

export const adminOrSelfFieldLevel = ({ req, id }: Parameters<Access>[0]): boolean => {
  return isAdmin({ req }) || selfFieldLevel({ req, id })
}
