import React, { Suspense } from 'react'

export const dynamic = 'force-dynamic'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DynamicSiteHeader } from '@/components/dynamic-site-header'
import { Footer } from '@/components/ui/footer'
import { SessionProvider } from '@/context/SessionContext'
import { ActiveSessionBanner } from '@/components/course/ActiveSessionBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SessionProvider>
        <SidebarProvider defaultOpen={true}>
          <AppSidebar variant="inset" />
          <SidebarInset>
            <Suspense fallback={null}>
              <DynamicSiteHeader />
            </Suspense>
            <Suspense fallback={null}>
              <ActiveSessionBanner />
            </Suspense>
            <main className="min-w-0 overflow-x-hidden">{children}</main>
            <Footer />
          </SidebarInset>
        </SidebarProvider>
      </SessionProvider>
    </Suspense>
  )
}
