'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { ArrowLeft, Loader2, Wine as WineIcon } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  templateId: string | number
  title: string
  description: string | null
  priceSek: number
  heroUrl: string | null
  slug: string
}

export function TemplateBuyConfirmation({
  templateId,
  title,
  description,
  priceSek,
  heroUrl,
  slug,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const formattedPrice = `${new Intl.NumberFormat('sv-SE').format(priceSek)} kr`

  const handleBuy = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/payments/template-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error || 'Kunde inte starta betalning')
        setSubmitting(false)
        return
      }
      // Hand off to Stripe Checkout — no need to reset submitting; we're leaving.
      window.location.href = data.url
    } catch (err) {
      console.error(err)
      toast.error('Ett oväntat fel uppstod')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href={`/provningsmallar/${slug}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Tillbaka
      </Link>

      <Card className="mt-6">
        <CardContent className="space-y-6 p-6 sm:p-8">
          {heroUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroUrl}
              alt=""
              className="aspect-[16/9] w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-md bg-muted">
              <WineIcon className="h-12 w-12 text-muted-foreground/40" />
            </div>
          )}

          <div className="space-y-2">
            <h1 className="font-heading text-3xl">{title}</h1>
            {description && (
              <p className="text-base text-muted-foreground whitespace-pre-wrap">{description}</p>
            )}
          </div>

          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">Pris</p>
            <p className="text-3xl font-bold text-brand-gradient">{formattedPrice}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Engångsbetalning. Du behåller åtkomsten till mallen och kan starta egna provningar
              utifrån den när du vill.
            </p>
          </div>

          <Button
            onClick={handleBuy}
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Förbereder betalning…
              </>
            ) : (
              `Köp för ${formattedPrice}`
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Du dirigeras vidare till Stripe för säker betalning.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
