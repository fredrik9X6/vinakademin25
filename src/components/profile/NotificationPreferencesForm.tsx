'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Bell, Mail, Smartphone } from 'lucide-react'

// Define Zod schema for notification preferences (matching database schema)
const NotificationPreferencesSchema = z.object({
  // Email notifications
  email: z.object({
    courseProgress: z.boolean(),
    newCourses: z.boolean(),
    wineRecommendations: z.boolean(),
    tastingEvents: z.boolean(),
    newsletter: z.boolean(),
    accountUpdates: z.boolean(),
  }),
  // Push notifications
  push: z.object({
    courseReminders: z.boolean(),
    tastingReminders: z.boolean(),
    achievements: z.boolean(),
    socialActivity: z.boolean(),
  }),
  // Platform notifications
  platform: z.object({
    inAppMessages: z.boolean(),
    systemAnnouncements: z.boolean(),
    maintenanceAlerts: z.boolean(),
    featureUpdates: z.boolean(),
  }),
})

export type NotificationPreferencesFormValues = z.infer<typeof NotificationPreferencesSchema>

interface NotificationPreferencesFormProps {
  userId: string
  initialData?: Partial<NotificationPreferencesFormValues>
  onSuccess?: () => void
}

export function NotificationPreferencesForm({
  userId,
  initialData,
  onSuccess,
}: NotificationPreferencesFormProps) {
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({})

  const form = useForm<NotificationPreferencesFormValues>({
    resolver: zodResolver(NotificationPreferencesSchema),
    defaultValues: {
      email: {
        courseProgress: initialData?.email?.courseProgress ?? true,
        newCourses: initialData?.email?.newCourses ?? true,
        wineRecommendations: initialData?.email?.wineRecommendations ?? true,
        tastingEvents: initialData?.email?.tastingEvents ?? true,
        newsletter: initialData?.email?.newsletter ?? true,
        accountUpdates: initialData?.email?.accountUpdates ?? true,
      },
      push: {
        courseReminders: initialData?.push?.courseReminders ?? true,
        tastingReminders: initialData?.push?.tastingReminders ?? true,
        achievements: initialData?.push?.achievements ?? true,
        socialActivity: initialData?.push?.socialActivity ?? false,
      },
      platform: {
        inAppMessages: initialData?.platform?.inAppMessages ?? true,
        systemAnnouncements: initialData?.platform?.systemAnnouncements ?? true,
        maintenanceAlerts: initialData?.platform?.maintenanceAlerts ?? true,
        featureUpdates: initialData?.platform?.featureUpdates ?? false,
      },
    },
  })

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        email: {
          courseProgress: initialData.email?.courseProgress ?? true,
          newCourses: initialData.email?.newCourses ?? true,
          wineRecommendations: initialData.email?.wineRecommendations ?? true,
          tastingEvents: initialData.email?.tastingEvents ?? true,
          newsletter: initialData.email?.newsletter ?? true,
          accountUpdates: initialData.email?.accountUpdates ?? true,
        },
        push: {
          courseReminders: initialData.push?.courseReminders ?? true,
          tastingReminders: initialData.push?.tastingReminders ?? true,
          achievements: initialData.push?.achievements ?? true,
          socialActivity: initialData.push?.socialActivity ?? false,
        },
        platform: {
          inAppMessages: initialData.platform?.inAppMessages ?? true,
          systemAnnouncements: initialData.platform?.systemAnnouncements ?? true,
          maintenanceAlerts: initialData.platform?.maintenanceAlerts ?? true,
          featureUpdates: initialData.platform?.featureUpdates ?? false,
        },
      })
    }
  }, [initialData, form])

  // Auto-save function with debouncing
  const autoSave = useCallback(
    async (fieldName: string, values: NotificationPreferencesFormValues) => {
      setSavingStates((prev) => ({ ...prev, [fieldName]: true }))

      try {
        console.log('Auto-saving:', fieldName, values)

        const response = await fetch(`/api/users/${userId}/notifications`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
          credentials: 'include',
        })

        if (response.ok) {
          const responseData = await response.json()
          console.log('Auto-save response:', responseData)
          toast.success('Inställning sparad', {
            description: 'Dina meddelandeinställningar har uppdaterats.',
            duration: 2000,
          })
          onSuccess?.()
        } else {
          const errorData = await response.json()
          const errorMessage = errorData.message || 'Kunde inte spara inställningen.'
          toast.error('Sparning misslyckades', {
            description: errorMessage,
            duration: 4000,
          })
        }
      } catch (error) {
        console.error('Auto-save error:', error)
        toast.error('Fel vid sparning', {
          description: 'Ett oväntat fel inträffade vid sparning av inställningar.',
          duration: 4000,
        })
      } finally {
        setSavingStates((prev) => ({ ...prev, [fieldName]: false }))
      }
    },
    [userId, onSuccess],
  )

  // Handle field changes with auto-save
  const handleFieldChange = useCallback(
    (fieldName: string, value: boolean) => {
      const currentValues = form.getValues()
      const [section, field] = fieldName.split('.')

      const updatedValues = {
        ...currentValues,
        [section]: {
          ...currentValues[section as keyof NotificationPreferencesFormValues],
          [field]: value,
        },
      }

      // Update the form
      form.setValue(fieldName as any, value)

      // Auto-save after a brief delay
      setTimeout(() => {
        autoSave(fieldName, updatedValues)
      }, 300)
    },
    [form, autoSave],
  )

  return (
    <Form {...form}>
      <div className="space-y-6">
        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>E-postmeddelanden</span>
            </CardTitle>
            <CardDescription>Hantera vilka e-postmeddelanden du vill ta emot.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TEMPORARILY HIDDEN - Vinrekommendationer */}
            {/* <FormField
              control={form.control}
              name="email.wineRecommendations"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Vinrekommendationer</FormLabel>
                    <FormDescription>
                      Få personliga vinrekommendationer baserat på dina preferenser.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('email.wineRecommendations', checked)
                      }
                      disabled={savingStates['email.wineRecommendations']}
                    />
                  </FormControl>
                </FormItem>
              )}
            /> */}
            {/* TEMPORARILY HIDDEN - Kursframsteg */}
            {/* <FormField
              control={form.control}
              name="email.courseProgress"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Framsteg</FormLabel>
                    <FormDescription>Få meddelanden om dina framsteg i vinprovningar.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('email.courseProgress', checked)
                      }
                      disabled={savingStates['email.courseProgress']}
                    />
                  </FormControl>
                </FormItem>
              )}
            /> */}
            <FormField
              control={form.control}
              name="email.newCourses"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Nya vinprovningar</FormLabel>
                    <FormDescription>
                      Få meddelanden om nya vinprovningar som blir tillgängliga.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => handleFieldChange('email.newCourses', checked)}
                      disabled={savingStates['email.newCourses']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email.newsletter"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Nyhetsbrev</FormLabel>
                    <FormDescription>Få vårt veckobrev med vintips och nyheter.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => handleFieldChange('email.newsletter', checked)}
                      disabled={savingStates['email.newsletter']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* TEMPORARILY HIDDEN - Kontouppdateringar */}
            {/* <FormField
              control={form.control}
              name="email.accountUpdates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Kontouppdateringar</FormLabel>
                    <FormDescription>Få meddelanden om ditt konto och säkerhet.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('email.accountUpdates', checked)
                      }
                      disabled={savingStates['email.accountUpdates']}
                    />
                  </FormControl>
                </FormItem>
              )}
            /> */}
            <FormField
              control={form.control}
              name="email.tastingEvents"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Provningar och evenemang</FormLabel>
                    <FormDescription>
                      Få inbjudningar till vinprovningar och evenemang.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('email.tastingEvents', checked)
                      }
                      disabled={savingStates['email.tastingEvents']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* TEMPORARILY HIDDEN - Push Notifications */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Push-meddelanden</span>
            </CardTitle>
            <CardDescription>Hantera push-meddelanden till din enhet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="push.courseReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Påminnelser</FormLabel>
                    <FormDescription>Påminnelser om att fortsätta med vinprovningar.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('push.courseReminders', checked)
                      }
                      disabled={savingStates['push.courseReminders']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="push.tastingReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Provningspåminnelser</FormLabel>
                    <FormDescription>Påminnelser om kommande provningar.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('push.tastingReminders', checked)
                      }
                      disabled={savingStates['push.tastingReminders']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="push.achievements"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Prestationer</FormLabel>
                    <FormDescription>
                      Meddelanden när du uppnår mål och prestationer.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => handleFieldChange('push.achievements', checked)}
                      disabled={savingStates['push.achievements']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="push.socialActivity"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Sociala aktiviteter</FormLabel>
                    <FormDescription>
                      Meddelanden om kommentarer och sociala interaktioner.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('push.socialActivity', checked)
                      }
                      disabled={savingStates['push.socialActivity']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card> */}

        {/* TEMPORARILY HIDDEN - Platform Notifications */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <span>Plattformsmeddelanden</span>
            </CardTitle>
            <CardDescription>Meddelanden som visas på webbplatsen och i appen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="platform.inAppMessages"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Meddelanden i appen</FormLabel>
                    <FormDescription>
                      Visa meddelanden och notiser direkt i applikationen.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('platform.inAppMessages', checked)
                      }
                      disabled={savingStates['platform.inAppMessages']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform.systemAnnouncements"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Systemmeddelanden</FormLabel>
                    <FormDescription>
                      Viktiga meddelanden om systemuppdateringar och ändringar.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('platform.systemAnnouncements', checked)
                      }
                      disabled={savingStates['platform.systemAnnouncements']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform.maintenanceAlerts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Underhållsvarningar</FormLabel>
                    <FormDescription>
                      Meddelanden om planerat underhåll och driftstörningar.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('platform.maintenanceAlerts', checked)
                      }
                      disabled={savingStates['platform.maintenanceAlerts']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="platform.featureUpdates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Funktionsuppdateringar</FormLabel>
                    <FormDescription>
                      Meddelanden om nya funktioner och förbättringar.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        handleFieldChange('platform.featureUpdates', checked)
                      }
                      disabled={savingStates['platform.featureUpdates']}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card> */}
      </div>
    </Form>
  )
}
