'use client'

import { useSearchParams } from 'next/navigation'
import JoinSessionDialog from '@/components/course/JoinSessionDialog'

export default function JoinPage() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code') || ''

  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Gå med i en vinprovning</h1>
        <p className="text-muted-foreground">Ange koden du fick från arrangören för att ansluta</p>
      </div>
      <JoinSessionDialog
        isOpen={true}
        onClose={() => {}}
        standalone={true}
        initialCode={codeFromUrl}
      />
    </div>
  )
}
