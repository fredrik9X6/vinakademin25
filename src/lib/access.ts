import type { Access, AccessArgs } from 'payload/config'
import type { User } from '../payload-types'

// Define common role-based predicates
export const isAdmin = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(user?.role === 'admin')
}

export const isInstructor = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(user?.role === 'instructor')
}

export const isSubscriber = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(user?.role === 'subscriber')
}

export const isActiveUser = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(user && user.accountStatus === 'active')
}

export const hasActiveSubscription = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(
    user &&
      user.subscriptionStatus === 'active' &&
      user.subscriptionPlan &&
      user.subscriptionPlan !== 'none',
  )
}

export const isAdminOrInstructor = ({ req }: AccessArgs): boolean => {
  const user = req.user as User | null
  return Boolean(user && (user.role === 'admin' || user.role === 'instructor'))
}

// Common access patterns
export const adminOnly: Access = ({ req }: AccessArgs<any, User>) => {
  return isAdmin({ req })
}

export const adminOrInstructorOnly: Access = ({ req }: AccessArgs<any, User>) => {
  return isAdminOrInstructor({ req })
}

export const adminOrSelf: Access = ({ req }: AccessArgs<any, User>) => {
  const user = req.user

  // Admin can access any user
  if (isAdmin({ req })) return true

  // Users can access only themselves
  return user
    ? {
        id: {
          equals: user.id,
        },
      }
    : false
}

export const subscribersAndAbove: Access = ({ req }: AccessArgs<any, User>) => {
  const user = req.user

  // Admin, instructor, and subscribers have access
  if (user?.role === 'admin' || user?.role === 'instructor' || user?.role === 'subscriber') {
    return true
  }

  return false
}

export const anyLoggedIn: Access = ({ req }: AccessArgs<any, User>) => {
  const user = req.user
  return Boolean(user)
}

export const activeSubscribersAndAbove: Access = ({ req }: AccessArgs<any, User>) => {
  const user = req.user

  // Admin and instructors always have access
  if (user?.role === 'admin' || user?.role === 'instructor') {
    return true
  }

  // Subscribers need an active subscription
  if (user?.role === 'subscriber') {
    return Boolean(
      user.subscriptionStatus === 'active' &&
        user.subscriptionPlan &&
        user.subscriptionPlan !== 'none',
    )
  }

  return false
}

// Field-level access control
export const adminOrInstructorFieldLevel = ({ req }: AccessArgs<any, User>) => {
  return isAdminOrInstructor({ req })
}

export const adminFieldLevel = ({ req }: AccessArgs<any, User>) => {
  return isAdmin({ req })
}

export const selfFieldLevel = ({ req, id }: AccessArgs<any, User> & { id?: string }) => {
  const user = req.user
  return Boolean(user && id && user.id === id)
}

export const adminOrSelfFieldLevel = ({ req, id }: AccessArgs<any, User> & { id?: string }) => {
  return isAdmin({ req }) || selfFieldLevel({ req, id })
}
