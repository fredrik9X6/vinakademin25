import { UserProfilePage } from '@/components/profile/UserProfilePage'
import React from 'react'

// This page will be protected by middleware
export const metadata = {
  title: 'Din Profil - Vinakademin',
}

export default function ProfilePage() {
  return <UserProfilePage />
}
