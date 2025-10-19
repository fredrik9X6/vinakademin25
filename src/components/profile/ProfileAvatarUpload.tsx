'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Camera, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface ProfileAvatarUploadProps {
  userId: string
  currentAvatar?: string | null
  userInitials?: string
  onAvatarUpdate?: (newAvatarUrl: string) => void
}

export function ProfileAvatarUpload({
  userId,
  currentAvatar,
  userInitials = 'AB',
  onAvatarUpdate,
}: ProfileAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [avatar, setAvatar] = useState<string | null>(currentAvatar || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { checkAuth } = useAuth()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Ogiltigt filformat', {
        description: 'Vänligen välj en bildfil (JPG, PNG, etc.).',
      })
      return
    }

    // Validate file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('Filen är för stor', {
        description: 'Bildstorlek får inte överstiga 5MB.',
      })
      return
    }

    setIsUploading(true)
    try {
      // 1) Upload to Payload media via our custom endpoint
      const mediaForm = new FormData()
      mediaForm.append('file', file)
      mediaForm.append('alt', `Profile picture for user ${userId}`)

      const mediaRes = await fetch('/api/media/upload', {
        method: 'POST',
        body: mediaForm,
        credentials: 'include',
        headers: {
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
      })

      if (!mediaRes.ok) {
        const err = await mediaRes.json().catch(() => ({}))
        throw new Error(err?.errors?.[0]?.message || err?.message || 'Kunde inte ladda upp bilden')
      }

      const mediaData = await mediaRes.json()
      const mediaId = mediaData?.doc?.id || mediaData?.id
      const mediaUrl = mediaData?.doc?.url || mediaData?.url
      if (!mediaId) throw new Error('Media-ID saknas efter uppladdning')

      // 2) Update user avatar field using our custom API
      const userRes = await fetch(`/api/users/${userId}/avatar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ avatar: mediaId }),
      })

      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}))
        throw new Error(
          err?.errors?.[0]?.message || err?.message || 'Kunde inte spara profilbilden',
        )
      }

      setAvatar(mediaUrl || avatar)
      onAvatarUpdate?.(mediaUrl || '')

      // Refresh the auth context to update navbar and other components
      await checkAuth()
      toast.success('Profilbild uppdaterad', {
        description: 'Din nya profilbild har sparats.',
      })
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error('Uppladdningsfel', {
        description: error instanceof Error ? error.message : 'Ett oväntat fel inträffade.',
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatar || undefined} alt="Profilbild" />
          <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={isUploading}>
        <Camera className="mr-2 h-4 w-4" />
        {isUploading ? 'Laddar upp...' : 'Byt profilbild'}
      </Button>
    </div>
  )
}
