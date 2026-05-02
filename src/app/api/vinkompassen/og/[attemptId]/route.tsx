import { ImageResponse } from 'next/og'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { VinkompassArchetype } from '@/payload-types'
// Note: the generated Payload type for slug `vinprovningar` is the plural
// `Vinprovningar` interface — do NOT assume singular here. Same pattern
// applies in the result page.

export const runtime = 'nodejs'
export const revalidate = 86400 // 24h — Next.js segment config must be a literal

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params

  const payload = await getPayload({ config })
  const attemptRes = await payload.find({
    collection: 'vinkompass-attempts',
    where: { attemptId: { equals: attemptId } },
    limit: 1,
    depth: 1,
  })
  const attempt = attemptRes.docs[0]
  const archetype = attempt?.archetype as VinkompassArchetype | undefined

  const title = archetype?.name || 'Vinkompassen'
  const tagline = archetype?.tagline || 'Hitta din vintyp'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg,#1a1a1a 0%,#2a1a08 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          padding: 80,
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: '#FB914C', textTransform: 'uppercase' }}>
          Vinkompassen
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 24, textAlign: 'center', lineHeight: 1.05 }}>
          {title}
        </div>
        <div style={{ fontSize: 36, marginTop: 24, color: '#d8d2c5', textAlign: 'center' }}>
          {tagline}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
