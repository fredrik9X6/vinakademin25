import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Värdguide — Vinakademin',
}

export default function BareLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
