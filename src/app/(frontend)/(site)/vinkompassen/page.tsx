import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Metadata } from 'next'
import { VinkompassenClient } from './VinkompassenClient'
import { getSiteURL } from '@/lib/site-url'

export const metadata: Metadata = {
  title: 'Vinkompassen — Hitta din vintyp',
  description:
    'Svara på 8 korta frågor och få sex viner från Systembolaget skräddarsydda för dig.',
  alternates: { canonical: `${getSiteURL()}/vinkompassen` },
}

export default async function VinkompassenLandingPage() {
  const payload = await getPayload({ config })
  const questionsRes = await payload.find({
    collection: 'vinkompass-questions',
    where: { active: { equals: true } },
    sort: 'order',
    limit: 50,
    depth: 1, // populate question.image and answers[].image
  })

  return <VinkompassenClient questions={questionsRes.docs} />
}
