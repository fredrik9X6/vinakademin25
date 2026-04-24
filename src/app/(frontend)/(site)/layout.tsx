import React from 'react'
import { TopNavHeader } from '@/components/top-nav-header'
import { BreadcrumbBar } from '@/components/breadcrumb-bar'
import { MobileBottomNav } from '@/components/mobile-bottom-nav'
import { Footer } from '@/components/ui/footer'
import { SessionProvider } from '@/context/SessionContext'
import { ActiveSessionBanner } from '@/components/course/ActiveSessionBanner'
import { FeedbackButton } from '@/components/feedback'

export const dynamic = 'force-dynamic'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        <TopNavHeader />
        <BreadcrumbBar />
        <ActiveSessionBanner />
        <main className="flex-1 min-w-0 overflow-x-hidden pb-20 md:pb-0">{children}</main>
        <Footer />
        <MobileBottomNav />
        <FeedbackButton />
      </div>
    </SessionProvider>
  )
}
