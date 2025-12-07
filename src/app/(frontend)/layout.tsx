import './globals.css'
import React from 'react'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/context/AuthContext'
import { AnalyticsProvider } from '@/components/analytics'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Vinakademin',
    template: '%s | Vinakademin',
  },
  description: 'Vinakademin - Din guide till vinets värld. Upptäck vinprovningar, lär dig om vin och utveckla din vinkunskap.',
  icons: {
    icon: [
      { url: '/brand/vinakademin_logomark_favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/brand/vinakademin_logomark_touch-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'sv_SE',
    siteName: 'Vinakademin',
    title: 'Vinakademin',
    description: 'Vinakademin - Din guide till vinets värld. Upptäck vinprovningar, lär dig om vin och utveckla din vinkunskap.',
    images: [
      {
        url: '/brand/vinakademin_logo_lockup_darkmode.svg',
        width: 1200,
        height: 630,
        alt: 'Vinakademin',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinakademin',
    description: 'Vinakademin - Din guide till vinets värld',
    images: ['/brand/vinakademin_logo_lockup_darkmode.svg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AnalyticsProvider>
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </AnalyticsProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
