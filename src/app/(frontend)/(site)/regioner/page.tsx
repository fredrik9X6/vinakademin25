import { getPayload } from 'payload'
import config from '@/payload.config'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { Metadata } from 'next'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Vinregioner | Vinakademin',
  description: 'Utforska vinregioner från hela världen. Lär dig om terroir, druvor och viner från varje region.',
  alternates: { canonical: `${getSiteURL()}/regioner` },
  openGraph: {
    type: 'website',
    title: 'Vinregioner | Vinakademin',
    description: 'Utforska vinregioner från hela världen.',
    url: `${getSiteURL()}/regioner`,
    siteName: 'Vinakademin',
    locale: 'sv_SE',
  },
}

export default async function RegionsPage() {
  const payload = await getPayload({ config })

  const regionsRes = await payload.find({
    collection: 'regions',
    limit: 500,
    depth: 1,
    sort: 'name',
  })
  const regions = regionsRes.docs || []

  // Group regions by country
  const grouped = new Map<string, { country: any; regions: any[] }>()
  for (const region of regions) {
    const country = typeof region.country === 'object' ? region.country : null
    const key = country?.name || 'Okänt land'
    if (!grouped.has(key)) {
      grouped.set(key, { country, regions: [] })
    }
    grouped.get(key)!.regions.push(region)
  }

  // Sort countries alphabetically
  const sortedCountries = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b, 'sv'))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Vinregioner</h1>
      <p className="text-muted-foreground mb-8">
        Utforska vinregioner från hela världen.
      </p>

      <div className="space-y-8">
        {sortedCountries.map(([countryName, { country, regions: countryRegions }]) => (
          <div key={countryName}>
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              {country?.slug ? (
                <Link
                  href={`/lander/${country.slug}`}
                  className="hover:text-orange-500 transition-colors"
                >
                  {countryName}
                </Link>
              ) : (
                countryName
              )}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {countryRegions.map((region: any) => (
                <Link
                  key={region.id}
                  href={`/regioner/${region.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border/50 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
                >
                  <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span className="font-medium">{region.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {regions.length === 0 && (
        <p className="text-muted-foreground text-center py-12">
          Inga regioner har lagts till ännu.
        </p>
      )}
    </div>
  )
}
