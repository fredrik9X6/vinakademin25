import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { Globe } from 'lucide-react'
import type { Metadata } from 'next'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Vinländer | Vinakademin',
  description: 'Utforska vinländer från hela världen. Lär dig om traditioner, regioner och viner från varje land.',
  alternates: { canonical: `${getSiteURL()}/lander` },
  openGraph: {
    type: 'website',
    title: 'Vinländer | Vinakademin',
    description: 'Utforska vinländer från hela världen.',
    url: `${getSiteURL()}/lander`,
    siteName: 'Vinakademin',
    locale: 'sv_SE',
  },
}

export default async function CountriesPage() {
  const payload = await getPayload({ config })

  const countriesRes = await payload.find({
    collection: 'countries',
    limit: 500,
    depth: 0,
    sort: 'name',
  })
  const countries = countriesRes.docs || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Vinländer</h1>
      <p className="text-muted-foreground mb-8">
        Utforska vinländer från hela världen.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((country: any) => (
          <Link
            key={country.id}
            href={`/lander/${country.slug}`}
            className="flex items-center gap-3 p-4 rounded-lg border border-border/50 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
          >
            <Globe className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <span className="text-lg font-medium">{country.name}</span>
          </Link>
        ))}
      </div>

      {countries.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Inga länder har lagts till ännu.
        </p>
      )}
    </div>
  )
}
