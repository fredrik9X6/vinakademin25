'use client'

import React from 'react'

// PayloadCMS v3 RowLabel component props
interface ReviewRowLabelProps {
  data?: {
    id?: number | string
    wine?: number | string | { id?: number | string; name?: string }
    user?: number | string | { id?: number | string; email?: string }
    rating?: number
  }
  path?: string
  fallback?: string
}

export const ReviewRowLabel: React.FC<ReviewRowLabelProps> = ({ data, fallback }) => {
  // Handle cases where data might not be available (during form building)
  if (!data) {
    return <span>{fallback || 'New Review'}</span>
  }

  // Extract wine name (could be ID, object, or string)
  const wineName = 
    typeof data.wine === 'object' && data.wine?.name
      ? data.wine.name
      : typeof data.wine === 'string'
      ? data.wine
      : typeof data.wine === 'number'
      ? `Wine #${data.wine}`
      : null

  // Extract user name/email (could be ID, object, or string)
  const userName =
    typeof data.user === 'object' && data.user?.email
      ? data.user.email.split('@')[0] // Just username part
      : typeof data.user === 'string'
      ? data.user
      : typeof data.user === 'number'
      ? `User #${data.user}`
      : null

  // Extract rating
  const rating = data.rating

  // Build display string
  const parts: string[] = []
  
  // Add wine name (always show if available)
  if (wineName) {
    parts.push(wineName)
  }
  
  // Add rating with stars if available
  if (rating && typeof rating === 'number') {
    const stars = '★'.repeat(rating)
    parts.push(`${stars}`)
  }
  
  // Add user if wine name not available or as additional info
  if (userName && !wineName) {
    parts.push(`by ${userName}`)
  }

  // Fallback if nothing is available
  if (parts.length === 0) {
    return <span>Review #{data.id || 'New'}</span>
  }

  return <span>{parts.join(' - ')}</span>
}

