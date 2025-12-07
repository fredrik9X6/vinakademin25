'use client'

import * as React from 'react'
import {
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  HelpCircleIcon,
  MonitorPlay,
  SettingsIcon,
  LogInIcon,
  CalendarIcon,
  Bot,
  Mail,
  Wine,
  Newspaper,
  SunIcon,
  MoonIcon,
  MapPin,
  PlusCircle,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'

import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
    { title: 'Vinprovningar', url: '/vinprovningar', icon: MonitorPlay },
    { title: 'Artiklar', url: '/artiklar', icon: Newspaper },
    { title: 'Nyhetsbrev', url: '/nyhetsbrev', icon: Mail },
    { title: 'Kommer snart', url: '#', type: 'label' as const },
    { title: 'Skapa Vinprovning', url: '#', icon: PlusCircle, comingSoon: true },
    { title: 'Vinlistan', url: '/vinlistan', icon: Wine, comingSoon: true },
    { title: 'Vinbarer & Upplevelser', url: '#', icon: MapPin, comingSoon: true },
    { title: 'AI sommelier', url: '#', icon: Bot, comingSoon: true },
    { title: 'Kalender', url: '#', icon: CalendarIcon, comingSoon: true },
    { title: 'Vinkällare', url: '#', icon: ClipboardListIcon, comingSoon: true },
    { title: 'Recenssera vin', url: '#', icon: FileIcon, comingSoon: true },
  ],
  navClouds: [
    {
      title: 'Capture',
      icon: CameraIcon,
      isActive: true,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Proposal',
      icon: FileTextIcon,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
    {
      title: 'Prompts',
      icon: FileCodeIcon,
      url: '#',
      items: [
        {
          title: 'Active Proposals',
          url: '#',
        },
        {
          title: 'Archived',
          url: '#',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Inställningar',
      url: '/profil?tab=uppgifter',
      icon: SettingsIcon,
    },
    {
      title: 'Hjälp',
      url: '/hjalp',
      icon: HelpCircleIcon,
    },
  ],
  documents: [],
}

// Update interface to not require user prop since we're using AuthContext
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {}

// Use AuthContext instead of user prop
export function AppSidebar({ ...props }: AppSidebarProps) {
  const { user } = useAuth()
  const { setTheme, theme } = useTheme()
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)

  // Only render theme switch on client to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5 h-auto">
              <Link href="/" className="flex items-center gap-2">
                {/* Logomark for collapsed sidebar */}
                <Image
                  src="/brand/vinakademin_logomark.svg"
                  alt="Vinakademin"
                  width={28}
                  height={28}
                  className="group-data-[collapsible=icon]:block hidden shrink-0"
                />
                {/* Full logo lockup for expanded sidebar */}
                <Image
                  src={theme === 'dark' ? '/brand/vinakademin_logo_lockup_darkmode.svg' : '/brand/Vinakademin_logo_lockup.svg'}
                  alt="Vinakademin"
                  width={160}
                  height={32}
                  className="group-data-[collapsible=icon]:hidden block"
                  priority
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />

        <SidebarMenu className="mt-auto">
          <SidebarMenuItem className="px-3 py-2">
            <div className="flex w-full items-center justify-start space-x-2">
              {mounted ? (
                <>
                  <Switch
                    id="theme-switch"
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    aria-label="Toggle theme"
                  />
                  {theme === 'light' ? (
                    <SunIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <MoonIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </>
              ) : (
                <div className="w-9 h-5" /> /* Placeholder with same dimensions to avoid layout shift */
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>

        <NavSecondary items={data.navSecondary} className="pt-2" />
      </SidebarContent>
      <SidebarFooter>
        {/* Conditionally render NavUser or Login button */}
        {user ? (
          <NavUser user={user} />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href={`/logga-in?from=${encodeURIComponent(pathname)}`} className="w-full">
                <SidebarMenuButton
                  variant={'outline'}
                  className="w-full justify-center text-white bg-neutral-900 hover:bg-neutral-800/90 hover:text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200/95"
                >
                  <LogInIcon className="h-4 w-4" />
                  <span>Logga in</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
