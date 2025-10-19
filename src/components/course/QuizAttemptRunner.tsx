'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { cn } from '@/lib/utils'
import { Check, X, Lightbulb } from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  startQuizAttempt,
  submitQuizAttempt,
  getQuizStartInfo,
} from '@/app/(frontend)/(site)/vinprovningar/quiz-actions'

interface QuizAttemptRunnerProps {
  quiz: any
  onPassed?: (quizId: number) => void
}

export default function QuizAttemptRunner({ quiz, onPassed }: QuizAttemptRunnerProps) {
  const questions = useMemo<any[]>(() => {
    return Array.isArray(quiz.questions)
      ? quiz.questions
          .map((q: any) => (typeof q.question === 'object' ? q.question : q.question))
          .filter(Boolean)
      : []
  }, [quiz])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [mode, setMode] = useState<'idle' | 'primary' | 'done'>('idle')
  const [answersMap, setAnswersMap] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<any>(null)
  const [showFeedback, setShowFeedback] = useState<null | { correct: boolean; text?: string }>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [startInfo, setStartInfo] = useState<{
    allowed: boolean
    message: string | null
    totalAttempts: number
    maxAttempts: number | null
    remainingAttempts: number | null
  } | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const info = await getQuizStartInfo(quiz.id)
        setStartInfo(info)
      } catch (e: any) {
        setStartError(e?.message || 'Kunde inte läsa quizstatus')
      }
    })()
  }, [quiz.id])

  const startAttempt = async () => {
    const { attemptId } = await startQuizAttempt(quiz.id)
    setAttemptId(String(attemptId))
    setMode('primary')
    setCurrentIndex(0)
    setAnswersMap({})
    setSelected(null)
    setShowFeedback(null)
  }

  const showCorrectAfterQuestion = quiz?.quizSettings?.showCorrectAnswers === 'after-question'

  const currentQuestion = questions[currentIndex]
  const currentQuestionId = currentQuestion ? String(currentQuestion.id) : null

  const evaluateAnswer = (q: any, value: any) => {
    if (!q) return { correct: false, feedbackText: undefined }
    if (q.type === 'multiple-choice') {
      const correctOption = (q.options || []).find((o: any) => o.isCorrect)
      const isCorrect = correctOption && value != null && value === correctOption.text
      const feedbackText = isCorrect
        ? 'Rätt!'
        : correctOption
          ? `Rätt svar: ${correctOption.text}`
          : undefined
      return { correct: Boolean(isCorrect), feedbackText }
    }
    if (q.type === 'true-false') {
      const isCorrect = String(value) === String(q.correctAnswer)
      const feedbackText = isCorrect
        ? 'Rätt!'
        : `Rätt svar: ${String(q.correctAnswer) === 'true' ? 'Sant' : 'Falskt'}`
      return { correct: Boolean(isCorrect), feedbackText }
    }
    if (q.type === 'short-answer' || q.type === 'fill-blank') {
      const acceptable = (q.acceptableAnswers || []).map((a: any) => a.answer)
      const isCorrect = acceptable.length
        ? acceptable.some(
            (a: string) => String(value).trim().toLowerCase() === String(a).trim().toLowerCase(),
          )
        : String(value).trim().toLowerCase() ===
          String(q.correctAnswer || '')
            .trim()
            .toLowerCase()
      const feedbackText = isCorrect
        ? 'Rätt!'
        : acceptable.length
          ? `Exempel på godkända svar: ${acceptable.join(', ')}`
          : q.correctAnswer
            ? `Rätt svar: ${q.correctAnswer}`
            : undefined
      return { correct: Boolean(isCorrect), feedbackText }
    }
    return { correct: false, feedbackText: undefined }
  }

  const confirmAnswer = () => {
    if (!currentQuestion || currentQuestionId == null) return
    const { correct, feedbackText } = evaluateAnswer(currentQuestion, selected)
    setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: selected }))
    if (showCorrectAfterQuestion) {
      setShowFeedback({ correct, text: feedbackText })
    } else {
      goNext()
    }
  }

  const goNext = () => {
    setShowFeedback(null)
    setSelected(null)
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      finalizeSubmit()
    }
  }

  const getQuestionForRender = () => currentQuestion

  const currentForRender = getQuestionForRender()

  const finalizeSubmit = async () => {
    if (!attemptId) return
    setSubmitting(true)
    try {
      const ordered = questions.map((q) => ({
        question: String(q.id),
        answer: answersMap[String(q.id)],
      }))
      const { score, passed } = await submitQuizAttempt(attemptId, ordered, quiz.id)
      setResult({ score, passed })
      setMode('done')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (result?.passed) {
      const defaults: any = {
        spread: 360,
        ticks: 50,
        gravity: 0,
        decay: 0.94,
        startVelocity: 30,
        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
        origin: { y: 0.3 },
      }
      const shoot = () => {
        confetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] })
        confetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] })
      }
      const t0 = setTimeout(shoot, 0)
      const t1 = setTimeout(shoot, 100)
      const t2 = setTimeout(shoot, 200)
      return () => {
        clearTimeout(t0)
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [result?.passed])

  function ConfettiOverlay() {
    const pieces = useMemo(() => {
      const colors = ['#f97316', '#fb923c', '#10b981', '#3b82f6', '#eab308', '#ef4444']
      return Array.from({ length: 80 }).map((_, i) => {
        const left = Math.random() * 100
        const delay = Math.random() * 0.6
        const duration = 2 + Math.random() * 1.2
        const size = 6 + Math.random() * 8
        const rotate = Math.random() * 360
        const color = colors[i % colors.length]
        const radius = Math.random() > 0.6 ? `${Math.round(Math.random() * 50)}%` : '4px'
        return { left, delay, duration, size, rotate, color, radius }
      })
    }, [])

    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {pieces.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.radius as any,
              opacity: 0.95,
              transform: `translate3d(0,-10px,0) rotate(${p.rotate}deg)`,
              animation:
                `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards, confetti-sway ${1.5 + Math.random()}s ease-in-out ${p.delay}s infinite` as any,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes confetti-fall {
            0% {
              transform: translate3d(0, -10px, 0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translate3d(0, 110%, 0) rotate(720deg);
              opacity: 0;
            }
          }
          @keyframes confetti-sway {
            0% {
              margin-left: 0;
            }
            50% {
              margin-left: 12px;
            }
            100% {
              margin-left: 0;
            }
          }
        `}</style>
      </div>
    )
  }

  const q = currentForRender

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold tracking-tight">Quiz: {quiz.title}</CardTitle>
          {!attemptId ? (
            <Button
              variant="secondary"
              onClick={startAttempt}
              disabled={startInfo?.allowed === false}
            >
              {startInfo?.allowed === false ? 'Försök ej tillgängligt' : 'Starta försök'}
            </Button>
          ) : result ? (
            <div className="text-sm">
              Resultat: {result.score}% {result.passed ? '✅' : '❌'}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {submitting && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-10 w-10 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mb-4" />
            <div className="text-sm text-muted-foreground">Räknar ut poäng...</div>
          </div>
        )}

        {startInfo && startInfo.message && !attemptId && !result && (
          <div className="text-sm text-red-600 dark:text-red-400">{startInfo.message}</div>
        )}

        {attemptId && !result && q && !submitting && (
          <>
            <div className="text-sm text-muted-foreground">
              Fråga {currentIndex + 1} av {questions.length}
            </div>

            <div className="space-y-3">
              <div className="text-lg font-semibold tracking-tight text-center">{q?.title}</div>
              {q?.content && (
                <div className="prose max-w-none text-center mx-auto">
                  <RichTextRenderer content={q.content} />
                </div>
              )}
              {q?.type === 'multiple-choice' && Array.isArray(q.options) ? (
                <div className="grid gap-3 justify-items-center">
                  {q.options.map((opt: any, i: number) => (
                    <label
                      key={i}
                      className={cn(
                        'flex items-center justify-center text-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all w-full',
                        'border-border hover:border-primary/50 hover:bg-accent',
                        selected === opt.text &&
                          'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm',
                        showFeedback && 'pointer-events-none',
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="sr-only"
                        disabled={!!showFeedback}
                        checked={selected === opt.text}
                        onChange={() => setSelected(opt.text)}
                      />
                      <span className="text-sm font-medium">{opt.text}</span>
                    </label>
                  ))}
                </div>
              ) : q?.type === 'true-false' ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 justify-items-center">
                  {[
                    { val: 'true', label: 'Sant' },
                    { val: 'false', label: 'Falskt' },
                  ].map((opt) => (
                    <label
                      key={opt.val}
                      className={cn(
                        'flex items-center justify-center text-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all w-full',
                        'border-border hover:border-primary/50 hover:bg-accent',
                        selected === opt.val &&
                          'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm',
                        showFeedback && 'pointer-events-none',
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="sr-only"
                        disabled={!!showFeedback}
                        checked={selected === opt.val}
                        onChange={() => setSelected(opt.val)}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-300 bg-background dark:bg-zinc-950 dark:border-zinc-800 text-foreground"
                  rows={3}
                  value={selected ?? ''}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={!!showFeedback}
                  placeholder="Skriv ditt svar här..."
                />
              )}

              {showFeedback && (
                <div
                  className={cn(
                    'rounded-xl p-3 flex items-start gap-3',
                    showFeedback.correct
                      ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300',
                  )}
                >
                  {showFeedback.correct ? (
                    <Check className="h-4 w-4 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 mt-0.5" />
                  )}
                  <div className="text-sm">
                    {showFeedback.correct ? 'Rätt svar!' : 'Fel svar.'}
                    {showFeedback.text && (
                      <div className="mt-1 opacity-90">{showFeedback.text}</div>
                    )}
                    {q?.explanation && (
                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950/60 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          <Lightbulb className="h-3.5 w-3.5" />
                          Förklaring
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-200">
                          <RichTextRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                {!showFeedback ? (
                  <Button
                    variant="secondary"
                    disabled={selected == null || selected === ''}
                    onClick={confirmAnswer}
                  >
                    Bekräfta
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={goNext}>
                    Fortsätt
                  </Button>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {!attemptId && !result && (
          <div className="text-sm text-muted-foreground">
            Klicka på “Starta försök” för att börja.
          </div>
        )}

        {result && (
          <Card className="relative overflow-hidden">
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-extrabold tracking-tight mb-2 text-foreground">
                {result.score}%
              </div>
              <div
                className={cn(
                  'mb-4 text-sm font-medium',
                  result.passed
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              >
                {result.passed ? 'Godkänd! Grymt jobbat 🎉' : 'Inte godkänd – försök igen'}
              </div>
              <div className="flex items-center justify-center gap-3">
                {result.passed ? (
                  <Button variant="secondary" onClick={() => onPassed?.(Number(quiz.id))}>
                    fortsätt till nästa lektion
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={startAttempt}>
                    Försök igen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
