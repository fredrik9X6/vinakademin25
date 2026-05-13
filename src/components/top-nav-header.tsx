'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LogInIcon,
  SunIcon,
  MoonIcon,
  UserCircleIcon,
  LogOutIcon,
  Wine,
  ChevronDown,
} from 'lucide-react'

const NAV_LINKS = [
  { label: 'Vinprovningar', href: '/vinprovningar' },
  { label: 'Provningsmallar', href: '/provningsmallar' },
  { label: 'Vinlistan', href: '/vinlistan' },
  { label: 'Artiklar', href: '/artiklar' },
  { label: 'Om oss', href: '/om-oss' },
]

export function TopNavHeader() {
  const { user, logoutUser } = useAuth()
  const { setTheme, theme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await logoutUser()
  }

  const userName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : ''
  const avatarUrl =
    user && typeof user.avatar === 'object' && user.avatar?.url ? user.avatar.url : undefined
  const fallbackInitial = userName ? userName.charAt(0).toUpperCase() : 'U'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Left: Wordmark — Coolvetica with brand gradient */}
        <Link
          href="/"
          aria-label="Vinakademin — startsida"
          className="text-brand-gradient shrink-0 font-heading text-2xl leading-none transition-opacity hover:opacity-80 sm:text-[28px]"
        >
          Vinakademin
        </Link>

        {/* Center: Nav links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-400/10 text-brand-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* Right: Theme toggle + Auth (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          {mounted ? (
            <div className="flex items-center gap-2">
              <Switch
                id="theme-switch-nav"
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                aria-label="Toggle theme"
                className="data-[state=checked]:bg-brand-400"
              />
              {theme === 'light' ? (
                <SunIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <MoonIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </div>
          ) : (
            <div className="w-[68px] h-5" />
          )}

          {/* Auth */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors outline-none">
                  <Avatar className="h-7 w-7 rounded-full">
                    <AvatarImage src={avatarUrl} alt={userName} />
                    <AvatarFallback className="bg-brand-300/15 text-xs font-medium text-brand-400">
                      {fallbackInitial}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline max-w-[120px] truncate">{userName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/mina-provningar" className="cursor-pointer">
                      <Wine className="mr-2 h-4 w-4" />
                      Mina Provningar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/mina-provningar/planer" className="cursor-pointer">
                      <Wine className="mr-2 h-4 w-4" />
                      Mina planer
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profil?tab=uppgifter" className="cursor-pointer">
                      <UserCircleIcon className="mr-2 h-4 w-4" />
                      Konto
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logga ut
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={`/logga-in?from=${encodeURIComponent(pathname)}`}
              className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <LogInIcon className="h-4 w-4" />
              Logga in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
