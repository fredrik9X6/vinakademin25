import { Suspense } from 'react'
import { JoinPageClient } from './JoinPageClient'

export const dynamic = 'force-dynamic'

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="container max-w-2xl mx-auto px-4 py-16" />}> 
      <JoinPageClient />
    </Suspense>
  )
}
