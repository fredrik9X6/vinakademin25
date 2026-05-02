'use client'

import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'

interface Props {
  attemptId: string
  archetypeKey: string
}

export function ResultActions({ attemptId, archetypeKey }: Props) {
  const router = useRouter()

  function handleShare(channel: string, href?: string) {
    posthog?.capture?.('vinkompass_shared', { archetype: archetypeKey, channel })
    if (href) window.open(href, '_blank', 'noopener,noreferrer')
  }

  async function copyLink() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    try {
      await navigator.clipboard.writeText(url)
    } catch {}
    handleShare('copy')
  }

  function retake() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('vinkompassen.draft')
    }
    router.push('/vinkompassen')
  }

  const url = typeof window !== 'undefined' ? window.location.href : ''
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Jag tog Vinkompassen!')}&url=${encodeURIComponent(url)}`
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={copyLink} className="rounded-xl border border-border px-4 py-2 text-sm">
        Kopiera länk
      </button>
      <button
        onClick={() => handleShare('twitter', xHref)}
        className="rounded-xl border border-border px-4 py-2 text-sm"
      >
        Dela på X
      </button>
      <button
        onClick={() => handleShare('facebook', fbHref)}
        className="rounded-xl border border-border px-4 py-2 text-sm"
      >
        Dela på Facebook
      </button>
      <button
        onClick={retake}
        className="ml-auto rounded-xl border border-border px-4 py-2 text-sm"
      >
        Gör om testet
      </button>
    </div>
  )
}
