'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
// Import the sub-components
import { ProfileDetailsForm } from './ProfileDetailsForm'
import { AccountSettingsForm } from './AccountSettingsForm'
import { ProfileAvatarUpload } from './ProfileAvatarUpload'
import { WinePreferencesForm } from './WinePreferencesForm'
import { NotificationPreferencesForm } from './NotificationPreferencesForm'
import { PaymentHistory } from './PaymentHistory'
import { DataExportButton } from './DataExportButton'
import { CoursePurchasePanel } from './CoursePurchasePanel'

export function UserProfilePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab')
  const { user, isLoading } = useAuth()
  const [notificationPreferences, setNotificationPreferences] = React.useState<any>(null)

  // Map tab values to Swedish URL parameters
  const tabToUrlParam: Record<string, string> = {
    details: 'uppgifter',
    preferences: 'vinpreferenser',
    notifications: 'notiser',
    payments: 'betalningar',
    data: 'data',
    settings: 'installningar',
    courses: 'vinprovningar',
  }

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    const urlParam = tabToUrlParam[value] || value
    router.push(`/profil?tab=${urlParam}`)
  }

  // Map Swedish URL tab parameter to actual tab values
  const getDefaultTab = () => {
    switch (tabParam) {
      case 'installningar':
        return 'settings'
      case 'vinpreferenser':
        return 'preferences'
      case 'notiser':
        return 'notifications'
      case 'betalningar':
      case 'betalning':
        return 'payments'
      case 'data':
      case 'export':
        return 'data'
      case 'kurser':
      case 'vinprovningar':
        return 'courses'
      case 'uppgifter':
      default:
        return 'details'
    }
  }

  // Load notification preferences when user is available
  React.useEffect(() => {
    const loadNotificationPreferences = async () => {
      if (!user?.id) return

      try {
        const response = await fetch(`/api/users/${user.id}/notifications`, {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setNotificationPreferences(data.data)
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error)
      }
    }

    loadNotificationPreferences()
  }, [user?.id])

  // Callback for successful avatar upload to refresh auth context
  const handleAvatarUpdate = (newAvatarUrl: string) => {
    // Optionally trigger a re-fetch of user data from auth context
    // For now, we'll rely on the auth context to handle updates
    console.log('Avatar updated:', newAvatarUrl)
  }

  // Show loading state while user data is being fetched
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex flex-col space-y-8">
          {/* Skeleton for tab navigation */}
          <div className="flex h-12 w-full justify-start overflow-x-auto bg-transparent p-0">
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-36 rounded-md" />
              <Skeleton className="h-9 w-40 rounded-md" />
            </div>
          </div>

          {/* Skeleton for content */}
          <div className="space-y-12">
            {/* Personal Information Section Skeleton */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-px w-full" />

              <div className="grid gap-8 lg:grid-cols-2">
                {/* Left column - Form fields */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                </div>

                {/* Right column - Avatar */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-32 w-32 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Wine Preferences Section Skeleton */}
            <div className="space-y-6 pt-8">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-80" />
              </div>
              <Skeleton className="h-px w-full" />

              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if user is not logged in
  if (!user) {
    return <div className="p-4">Du måste vara inloggad för att se din profil.</div>
  }

  // TODO: Add loading and error states based on data fetching
  // if (loading) return <p>Loading profile...</p>;
  // if (error) return <p>Error loading profile: {error}</p>;
  // if (!user) return <p>Please log in to view your profile.</p>;

  return (
    <motion.div
      className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Tabs
        defaultValue={getDefaultTab()}
        onValueChange={handleTabChange}
        className="flex flex-col space-y-8"
      >
        <TabsList className="flex h-12 w-full justify-start overflow-x-auto bg-transparent p-0 scrollbar-hide">
          <TabsTrigger
            value="details"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Profiluppgifter
          </TabsTrigger>
          <TabsTrigger
            value="preferences"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Vinpreferenser
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Notiser
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Betalningar
          </TabsTrigger>
          <TabsTrigger
            value="data"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Data
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Kontoinställningar
          </TabsTrigger>
          <TabsTrigger
            value="courses"
            className="flex-shrink-0 h-9 px-4 mx-1 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:bg-primary/90 rounded-md whitespace-nowrap transition-all duration-200"
          >
            Mina Vinprovningar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            {/* Personal Information & Profile Picture Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Personlig Information & Profilbild</h3>
                <p className="text-sm text-muted-foreground">
                  Uppdatera dina personliga uppgifter och profilbild.
                </p>
              </div>
              <Separator />

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6">
                  <ProfileDetailsForm
                    userId={String(user.id)}
                    initialData={{
                      firstName: user.firstName || '',
                      lastName: user.lastName || '',
                      email: user.email,
                      bio: user.bio || '',
                    }}
                  />
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-4">Profilbild</h4>
                    <ProfileAvatarUpload
                      userId={String(user.id)}
                      currentAvatar={
                        typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : null
                      }
                      userInitials={`${(user.firstName || '').charAt(0)}${(user.lastName || '').charAt(0)}`}
                      onAvatarUpdate={handleAvatarUpdate}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Removed wine preferences from details; moved to its own tab */}
          </motion.div>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Vinpreferenser</h3>
                <p className="text-sm text-muted-foreground">
                  Anpassa dina vinpreferenser för att få personliga rekommendationer.
                </p>
              </div>
              <Separator />
              <WinePreferencesForm userId={String(user.id)} />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Notisinställningar</h3>
                <p className="text-sm text-muted-foreground">
                  Hantera hur och när du vill få notiser från vinakademin.
                </p>
              </div>
              <Separator />

              <NotificationPreferencesForm
                userId={String(user.id)}
                initialData={notificationPreferences || undefined}
                onSuccess={() => {
                  // Refresh notification preferences after successful save
                  if (user?.id) {
                    fetch(`/api/users/${user.id}/notifications`, { credentials: 'include' })
                      .then((response) => response.json())
                      .then((data) => setNotificationPreferences(data.data))
                      .catch(console.error)
                  }
                }}
              />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Betalningshistorik</h3>
                <p className="text-sm text-muted-foreground">
                  Visa dina ordrar, fakturor och betalningshistorik.
                </p>
              </div>
              <Separator />
              <PaymentHistory userId={String(user.id)} />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="data" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Datahantering</h3>
                <p className="text-sm text-muted-foreground">
                  Hantera din personliga data enligt GDPR-kraven.
                </p>
              </div>
              <Separator />
              <DataExportButton userId={String(user.id)} />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Kontoinställningar</h3>
                <p className="text-sm text-muted-foreground">
                  Hantera ditt konto, ändra lösenord och kontoinställningar.
                </p>
              </div>
              <Separator />
              <AccountSettingsForm userId={String(user.id)} userEmail={user.email} />
            </div>
          </motion.div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-12"
          >
            {/* Course Purchase Management Section */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Mina Vinprovningar</h3>
                <p className="text-sm text-muted-foreground">
                  Hantera dina köpta vinprovningar, framsteg och köphistorik.
                </p>
              </div>
              <Separator />

              <CoursePurchasePanel
                userId={String(user.id)}
                onCourseAccess={(courseSlug) => {
                  // Navigate to course using the proper slug
                  window.location.href = `/vinprovningar/${courseSlug}`
                }}
              />
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
