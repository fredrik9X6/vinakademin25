'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import {
  WinePicker,
  type CustomWineInput,
  type LibraryWineResult,
} from '@/components/tasting-plan/WinePicker'
import { WineReviewForm } from '@/components/course/WineReviewForm'

function RecenseraVinInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialWineIdParam = searchParams.get('wine')
  const initialWineId = initialWineIdParam ? Number(initialWineIdParam) : null

  const [picked, setPicked] = useState<
    | { kind: 'library'; wineId: number }
    | { kind: 'custom'; snapshot: CustomWineInput }
    | null
  >(
    initialWineId && !Number.isNaN(initialWineId)
      ? { kind: 'library', wineId: initialWineId }
      : null,
  )

  function pickLibrary(w: LibraryWineResult) {
    setPicked({ kind: 'library', wineId: w.id })
  }

  function pickCustom(w: CustomWineInput) {
    setPicked({ kind: 'custom', snapshot: w })
  }

  const handleReviewSubmitted = () => {
    router.push('/mina-recensioner')
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Recensera vin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skriv ner dina intryck av ett vin du druckit.
        </p>
      </header>

      {!picked && (
        <Card>
          <CardContent className="p-6">
            <WinePicker onPickLibrary={pickLibrary} onPickCustom={pickCustom} />
          </CardContent>
        </Card>
      )}

      {picked && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← Välj ett annat vin
          </button>
          <Card>
            <CardContent className="p-6">
              <WineReviewForm
                lessonId={0}
                standalone
                {...(picked.kind === 'library'
                  ? { wineIdProp: picked.wineId }
                  : {
                      customWineSnapshot: {
                        name: picked.snapshot.name,
                        producer: picked.snapshot.producer,
                        vintage: picked.snapshot.vintage,
                        type: picked.snapshot.type,
                        systembolagetUrl: picked.snapshot.systembolagetUrl,
                        priceSek: picked.snapshot.priceSek,
                        systembolagetProductNumber: picked.snapshot.systembolagetProductNumber,
                        imageUrl: picked.snapshot.imageUrl,
                      },
                    })}
                onSubmit={() => handleReviewSubmitted()}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export function RecenseraVinClient() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8">Laddar…</div>}>
      <RecenseraVinInner />
    </Suspense>
  )
}
