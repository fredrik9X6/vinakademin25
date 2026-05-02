'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import posthog from 'posthog-js'
import type { Media, VinkompassQuestion } from '@/payload-types'
import type { AnswerInput } from '@/lib/vinkompassen/types'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'vinkompassen.draft'
const LAST_KEY = 'vinkompassen.lastAttemptId'

type Mode = 'landing' | 'quiz'

interface Props {
  questions: VinkompassQuestion[]
}

export function VinkompassenClient({ questions }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('landing')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<AnswerInput[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Restore draft if any
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as { answers: AnswerInput[]; step: number }
        if (Array.isArray(draft.answers) && draft.answers.length > 0) {
          setAnswers(draft.answers)
          setStep(Math.min(draft.step ?? draft.answers.length, questions.length))
          setMode('quiz')
        }
      }
    } catch {}
  }, [questions.length])

  const current = questions[step]

  function start() {
    posthog?.capture?.('vinkompass_started')
    setMode('quiz')
    setStep(0)
    setAnswers([])
    if (typeof window !== 'undefined') window.localStorage.removeItem(DRAFT_KEY)
  }

  function pickAnswer(answerIndex: number) {
    const q = questions[step]
    if (!q) return
    const opt = q.answers?.[answerIndex]
    if (!opt) return

    const next: AnswerInput[] = [...answers, { questionId: q.id, answerIndex }]

    posthog?.capture?.('vinkompass_question_answered', {
      questionIndex: step,
      answerIndex,
      scoreBody: opt.scoreBody,
      scoreComfort: opt.scoreComfort,
    })

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers: next, step: step + 1 }))
    }

    if (step + 1 >= questions.length) {
      void submit(next)
    } else {
      setAnswers(next)
      setStep(step + 1)
    }
  }

  async function submit(finalAnswers: AnswerInput[]) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/vinkompassen/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        attemptId?: string
        error?: string
      }
      if (!res.ok || !data.ok || !data.attemptId) {
        throw new Error(data?.error || 'Kunde inte slutföra testet')
      }
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_KEY, data.attemptId)
        window.localStorage.removeItem(DRAFT_KEY)
      }
      router.push(`/vinkompassen/resultat/${data.attemptId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunde inte slutföra testet')
      setSubmitting(false)
    }
  }

  if (mode === 'landing') {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Vinkompassen
        </span>
        <h1 className="mt-3 font-heading text-5xl leading-[1.05] tracking-[-0.015em] md:text-6xl">
          Hitta din vintyp på 90 sekunder
        </h1>
        <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
          Svara på 8 korta frågor och få sex handplockade viner från Systembolaget — utvalda för
          just din smak.
        </p>
        <Button onClick={start} className="mt-8 bg-brand-400 text-white" size="lg">
          Starta testet
        </Button>
      </main>
    )
  }

  if (!current) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p>{submitting ? 'Räknar ut din vintyp...' : 'Inga frågor är publicerade än.'}</p>
        {error ? <p className="mt-4 text-red-500">{error}</p> : null}
      </main>
    )
  }

  const questionImage =
    current.image && typeof current.image === 'object' ? (current.image as Media) : null

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="mb-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand-400 transition-all"
            style={{ width: `${(step / questions.length) * 100}%` }}
          />
        </div>
        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fråga {step + 1} av {questions.length}
        </div>
      </div>

      <h2 className="font-heading text-3xl leading-[1.1] tracking-[-0.015em] md:text-4xl">
        {current.question}
      </h2>
      {current.helperText ? (
        <p className="mt-2 text-muted-foreground">{current.helperText}</p>
      ) : null}
      {questionImage?.url ? (
        <div className="relative mt-6 h-56 w-full overflow-hidden rounded-2xl">
          <Image
            src={questionImage.url}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 768px"
          />
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(current.answers || []).map((a, i) => {
          const aImage = a.image && typeof a.image === 'object' ? (a.image as Media) : null
          return (
            <button
              key={a.id || i}
              onClick={() => pickAnswer(i)}
              disabled={submitting}
              className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-brand-400"
            >
              {aImage?.url ? (
                <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={aImage.url} alt="" fill className="object-cover" sizes="56px" />
                </div>
              ) : null}
              <span className="font-medium leading-snug">{a.label}</span>
            </button>
          )
        })}
      </div>

      {error ? <p className="mt-4 text-red-500">{error}</p> : null}
    </main>
  )
}
