import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'

export const metadata = {
  title: 'Internt – Vinakademin',
  description: 'Internt CRM-verktyg för Vinakademin-teamet.',
  robots: { index: false, follow: false },
}

export default async function InterntLayout({ children }: { children: ReactNode }) {
  const user = await getUser()
  if (!user || (user as any).role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/internt"
            className="font-heading text-2xl text-brand-gradient leading-none"
          >
            Vinakademin · Internt
          </Link>
          <nav className="flex items-center gap-5 text-sm text-muted-foreground">
            <Link href="/internt" className="transition-colors hover:text-foreground">
              Kontakter
            </Link>
            <Link href="/admin" className="transition-colors hover:text-foreground">
              Payload-admin
            </Link>
            <span className="hidden sm:inline">
              Inloggad som <span className="font-medium text-foreground">{user.email}</span>
            </span>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
