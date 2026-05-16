import './globals.css'
import React from 'react'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/context/AuthContext'
import { AnalyticsProvider } from '@/components/analytics'
import { Toaster } from '@/components/ui/sonner'
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd'
import { getSiteURL } from '@/lib/site-url'

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
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/favicon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/brand/logomark-favicon.png', type: 'image/png' },
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
        url: '/brand/logomark-gradient.png',
        width: 1200,
        height: 1200,
        alt: 'Vinakademin',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vinakademin',
    description: 'Vinakademin - Din guide till vinets värld',
    images: ['/brand/logomark-gradient.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const siteURL = getSiteURL()
  return (
    <html lang="sv" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <OrganizationJsonLd siteURL={siteURL} />
        <WebSiteJsonLd siteURL={siteURL} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
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
