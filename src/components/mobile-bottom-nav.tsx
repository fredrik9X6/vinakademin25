'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wine, Newspaper, User, List } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const TABS = [
  { label: 'Hem', href: '/', icon: Home, matchExact: true },
  { label: 'Provningar', href: '/vinprovningar', icon: Wine },
  { label: 'Vinlistan', href: '/vinlistan', icon: List },
  { label: 'Artiklar', href: '/artiklar', icon: Newspaper },
  { label: 'Mitt konto', href: '/mina-provningar', hrefLoggedOut: '/logga-in', icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around px-2">
        {TABS.map((tab) => {
          const href =
            tab.hrefLoggedOut && !user ? `${tab.hrefLoggedOut}?from=${tab.href}` : tab.href
          const isActive = tab.matchExact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/')

          const Icon = tab.icon

          return (
            <Link
              key={tab.label}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 rounded-md transition-colors ${
                isActive ? 'text-[#FB914C]' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
