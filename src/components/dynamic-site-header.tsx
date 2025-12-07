'use client'

import { usePathname } from 'next/navigation'
import { SiteHeader } from './site-header'

export function DynamicSiteHeader() {
  const pathname = usePathname()

  const getPageTitle = (path: string) => {
    if (path.includes('/profil')) return 'Din Profil'
    if (path.includes('/vinprovningar')) return 'Vinprovningar'
    if (path.includes('/profil')) return 'Profil'
    return 'Vinakademin'
  }

  return <SiteHeader title={getPageTitle(pathname)} />
}
