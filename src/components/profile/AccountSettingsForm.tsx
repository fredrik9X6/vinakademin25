'use client'

import React, { useState } from 'react'
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
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Shield, KeyRound, Trash2, AlertTriangle, Download, X } from 'lucide-react'

// Define Zod schema for password change (Swedish messages)
const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Nuvarande lösenord krävs.' }),
    newPassword: z.string().min(8, { message: 'Nytt lösenord måste vara minst 8 tecken.' }),
    confirmPassword: z.string().min(1, { message: 'Bekräfta lösenord krävs.' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Lösenorden matchar inte.',
    path: ['confirmPassword'],
  })

type PasswordChangeFormValues = z.infer<typeof PasswordChangeSchema>

interface AccountSettingsFormProps {
  userId: string
  userEmail?: string
}

export function AccountSettingsForm({ userId, userEmail }: AccountSettingsFormProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [isExportingData, setIsExportingData] = useState(false)

  // Delete account confirmation state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    dataAgreement: false,
    finalAgreement: false,
    confirmationText: '',
  })

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  async function onPasswordSubmit(values: PasswordChangeFormValues) {
    setIsChangingPassword(true)
    try {
      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: 'include',
      })

      if (response.ok) {
        passwordForm.reset()
        toast.success('Lösenord ändrat', {
          description: 'Ditt lösenord har uppdaterats.',
        })
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte ändra lösenordet.'
        toast.error('Lösenordsändring misslyckades', {
          description: errorMessage,
        })
      }
    } catch (error) {
      console.error('Password change error:', error)
      toast.error('Lösenordsfel', {
        description: 'Ett oväntat fel inträffade vid ändring av lösenordet.',
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleDataExport() {
    setIsExportingData(true)
    try {
      // Simulate API call for data export
      toast.success('Dataexport begärd', {
        description:
          'Din dataexport har begärts. Du kommer att få ett e-postmeddelande med instruktioner.',
        duration: 5000,
      })
    } catch (error) {
      console.error('Data export error:', error)
      toast.error('Dataexport misslyckades', {
        description: 'Ett oväntat fel inträffade vid begäran av dataexport.',
      })
    } finally {
      setIsExportingData(false)
    }
  }

  async function handleDeleteAccount() {
    // Validate all confirmations
    if (!deleteConfirmation.dataAgreement || !deleteConfirmation.finalAgreement) {
      toast.error('Bekräftelse krävs', {
        description: 'Du måste markera båda bekräftelserna för att fortsätta.',
      })
      return
    }

    if (deleteConfirmation.confirmationText !== 'RADERA') {
      toast.error('Bekräftelse krävs', {
        description: 'Du måste skriva "RADERA" för att bekräfta radering av kontot.',
      })
      return
    }

    setIsDeletingAccount(true)
    try {
      const response = await fetch(`/api/users/${userId}/anonymize`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Konto raderat', {
          description: 'Ditt konto har raderats permanent. Du omdirigeras nu till startsidan.',
          duration: 4000,
        })

        // Give user time to see the message before redirect
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.message || 'Kunde inte radera kontot.'
        toast.error('Kontoborttagning misslyckades', {
          description: errorMessage,
          duration: 6000,
        })
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      toast.error('Kontoborttagning misslyckades', {
        description:
          'Ett oväntat fel inträffade. Kontakta support på info@vinakademin.se för hjälp.',
        duration: 6000,
      })
    } finally {
      setIsDeletingAccount(false)
    }
  }

  const isDeleteEnabled =
    deleteConfirmation.dataAgreement &&
    deleteConfirmation.finalAgreement &&
    deleteConfirmation.confirmationText === 'RADERA'

  return (
    <div className="space-y-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5" />
            <span>Ändra lösenord</span>
          </CardTitle>
          <CardDescription>
            Uppdatera ditt lösenord för att hålla ditt konto säkert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuvarande lösenord</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Ange ditt nuvarande lösenord"
                        {...field}
                        disabled={isChangingPassword}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nytt lösenord</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Ange ditt nya lösenord"
                        {...field}
                        disabled={isChangingPassword}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bekräfta nytt lösenord</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Bekräfta ditt nya lösenord"
                        {...field}
                        disabled={isChangingPassword}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isChangingPassword ? 'Ändrar...' : 'Ändra lösenord'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Separator />

      {/* Delete Account Section */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            <span>Radera konto</span>
          </CardTitle>
          <CardDescription>Radera ditt Vinakademin-konto permanent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <div className="flex items-start space-x-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                Denna åtgärd kan INTE ångras. Detta kommer att radera ditt Vinakademin-konto
                permanent. Är du säker på att du vill fortsätta?
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="data-agreement"
                checked={deleteConfirmation.dataAgreement}
                onCheckedChange={(checked) =>
                  setDeleteConfirmation((prev) => ({ ...prev, dataAgreement: checked as boolean }))
                }
                className="mt-1"
              />
              <label
                htmlFor="data-agreement"
                className="text-sm text-foreground leading-5 cursor-pointer"
              >
                All data associerad med mitt konto kommer att raderas permanent
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="final-agreement"
                checked={deleteConfirmation.finalAgreement}
                onCheckedChange={(checked) =>
                  setDeleteConfirmation((prev) => ({ ...prev, finalAgreement: checked as boolean }))
                }
                className="mt-1"
              />
              <label
                htmlFor="final-agreement"
                className="text-sm text-foreground leading-5 cursor-pointer"
              >
                Jag förstår att denna åtgärd inte kan ångras
              </label>
            </div>
          </div>

          {/* Confirmation Text Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Skriv{' '}
              <span className="font-mono bg-muted px-1 py-0.5 rounded text-destructive">
                RADERA
              </span>{' '}
              för att bekräfta <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder=""
              value={deleteConfirmation.confirmationText}
              onChange={(e) =>
                setDeleteConfirmation((prev) => ({ ...prev, confirmationText: e.target.value }))
              }
              className="font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                setDeleteConfirmation({
                  dataAgreement: false,
                  finalAgreement: false,
                  confirmationText: '',
                })
              }
              disabled={isDeletingAccount}
            >
              Avbryt
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || !isDeleteEnabled}
              className="min-w-[140px]"
            >
              {isDeletingAccount ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              {isDeletingAccount ? 'Raderar...' : 'Radera konto'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
