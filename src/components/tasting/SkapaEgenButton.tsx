'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/components/analytics'

export interface SkapaEgenButtonProps {
  isAuthenticated: boolean
  className?: string
}

/**
 * The gallery's create affordance. Rendered for everyone — the whole point of
 * the 2026-07-27 IA work is that browsers of the template library could not
 * previously discover that they can build their own (154 people/month on the
 * gallery vs 10 reaching /skapa-provning).
 */
export function SkapaEgenButton({ isAuthenticated, className }: SkapaEgenButtonProps) {
  const href = isAuthenticated
    ? '/skapa-provning'
    : `/registrera?from=${encodeURIComponent('/skapa-provning')}`

  return (
    <Button asChild className={className}>
      <Link
        href={href}
        onClick={() => trackEvent('provningar_create_clicked', { authenticated: isAuthenticated })}
      >
        <Plus className="h-4 w-4 mr-2" />
        Skapa egen
      </Link>
    </Button>
  )
}
