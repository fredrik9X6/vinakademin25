import React from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { getUser } from '@/lib/get-user'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getUser()

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <main>{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
