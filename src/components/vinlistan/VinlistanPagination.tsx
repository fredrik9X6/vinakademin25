'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function VinlistanPagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  if (pageCount <= 1) return null
  const toPage = (p: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('page', String(p))
    router.push(`/vinlistan?${params.toString()}`)
  }
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => toPage(page - 1)}>
        Föregående
      </Button>
      <div className="text-xs text-muted-foreground">
        Sida {page} av {pageCount}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount}
        onClick={() => toPage(page + 1)}
      >
        Nästa
      </Button>
    </div>
  )
}



