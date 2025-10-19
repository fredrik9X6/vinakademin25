import React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DynamicSiteHeader } from '@/components/dynamic-site-header'
import { Footer } from '@/components/ui/footer'
import { SessionProvider } from '@/context/SessionContext'
import { ActiveSessionBanner } from '@/components/course/ActiveSessionBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <DynamicSiteHeader />
          <ActiveSessionBanner />
          <main className="min-w-0 overflow-x-hidden">{children}</main>
          <Footer />
        </SidebarInset>
      </SidebarProvider>
    </SessionProvider>
  )
}
