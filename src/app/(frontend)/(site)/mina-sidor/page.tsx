'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Loader2, BookOpenIcon, SettingsIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import AuthGuard from '@/components/auth/AuthGuard'
import RoleBasedContent from '@/components/dashboard/RoleBasedContent'

export default function DashboardPage() {
  // Legacy route: redirect to consolidated profile page
  if (typeof window !== 'undefined') {
    window.location.replace('/profil')
  }
  return null
}

function DashboardContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2">Laddar din profil...</p>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container max-w-5xl mx-auto py-10 px-4 sm:px-6">
      <h1 className="text-3xl md:text-4xl font-medium mb-8">Mina Sidor</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Min Profil</CardTitle>
          <CardDescription>Din personliga information och kontaktuppgifter</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16 border-2 border-muted">
              {user.avatar &&
              typeof user.avatar === 'object' &&
              user.avatar !== null &&
              'url' in user.avatar ? (
                <AvatarImage src={user.avatar.url || ''} alt={user.firstName || 'Avatar'} />
              ) : (
                <AvatarFallback className="bg-secondary/10 text-secondary">
                  {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.firstName || 'Användare'}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpenIcon className="mr-2 h-5 w-5 text-secondary" />
              Mina vinprovningar
            </CardTitle>
            <CardDescription>Se vilka vinprovningar du är anmäld till</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profil?tab=kurser">
              <Button className="w-full">Visa mina vinprovningar</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5 text-secondary" />
              Profilinställningar
            </CardTitle>
            <CardDescription>Uppdatera dina uppgifter</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/profil?tab=installningar">
              <Button className="w-full">Hantera profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <RoleBasedContent user={user} />
    </div>
  )
}
