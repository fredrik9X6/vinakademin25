'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Download, FileText, Shield, Loader2 } from 'lucide-react'

interface DataExportButtonProps {
  userId: string
}

export function DataExportButton({ userId }: DataExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch(`/api/users/${userId}/export`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'user-data.json'
        : 'user-data.json'

      // Create a blob from the response
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Data export completed', {
        description: 'Your personal data has been downloaded successfully.',
        duration: 5000,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed', {
        description: 'There was an error exporting your data. Please try again.',
        duration: 5000,
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Exportera personlig data</span>
        </CardTitle>
        <CardDescription>
          Ladda ner all din personliga data i JSON-format enligt GDPR-kraven.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-2">
          <p>Följande data kommer att exporteras:</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Profiluppgifter och kontoinställningar</li>
            <li>Vinpreferenser och notifieringsinställningar</li>
            <li>Vinprovningsregistreringar och framsteg</li>
            <li>Transaktioner och köphistorik</li>
            <li>Personliga vinlistor och betyg</li>
            <li>Alla interaktioner med plattformen</li>
          </ul>
        </div>

        <div className="flex items-start space-x-2 p-3 bg-muted/50 rounded-lg">
          <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">GDPR-kompatibilitet</p>
            <p>
              Denna export innehåller all din personliga data enligt GDPR:s "rätt till
              dataportabilitet". Data exporteras i ett maskinläsbart format och kan användas för att
              överföra din data till andra tjänster.
            </p>
          </div>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full" variant="outline">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporterar data...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportera min data
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Filen kommer att laddas ner automatiskt när exporten är klar.
        </p>
      </CardContent>
    </Card>
  )
}
