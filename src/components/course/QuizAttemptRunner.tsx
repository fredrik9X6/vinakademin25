'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  Lightbulb,
  Award,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  startQuizAttempt,
  submitQuizAttempt,
  getQuizStartInfo,
  getLastQuizAttempt,
} from '@/app/(frontend)/(site)/vinprovningar/quiz-actions'

interface QuizAttemptRunnerProps {
  quiz: any
  onPassed?: (quizId: number) => void
  onNavigateNext?: () => void
}

export default function QuizAttemptRunner({ quiz, onPassed, onNavigateNext }: QuizAttemptRunnerProps) {
  // Base questions from quiz
  const baseQuestions = useMemo<any[]>(() => {
    if (!Array.isArray(quiz.questions)) return []
    return quiz.questions
      .map((q: any) => {
        const question = typeof q.question === 'object' && q.question ? q.question : q.question
        if (!question) return null
        return question
      })
      .filter(Boolean)
  }, [quiz])

  // Randomized questions - re-randomize on each new attempt
  const [questions, setQuestions] = useState<any[]>(baseQuestions)

  // Apply randomization when starting a new attempt
  const applyRandomization = useCallback((questionsList: any[]) => {
    let processedQuestions = [...questionsList]

    if (quiz.quizSettings?.randomizeQuestions) {
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5)
    }

    if (quiz.quizSettings?.randomizeAnswers) {
      processedQuestions = processedQuestions.map((q) => {
        if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
          return { ...q, options: [...q.options].sort(() => Math.random() - 0.5) }
        }
        return q
      })
    }

    return processedQuestions
  }, [quiz.quizSettings?.randomizeQuestions, quiz.quizSettings?.randomizeAnswers])

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
  const [lastAttempt, setLastAttempt] = useState<{
    score: number
    passed: boolean
    completedAt: string
    answers: Array<{ questionId: number; answer: any; isCorrect: boolean }>
  } | null>(null)
  const [loadingLastAttempt, setLoadingLastAttempt] = useState(true)

  // Reset all state when quiz.id changes (handles navigation between quizzes)
  useEffect(() => {
    setCurrentIndex(0)
    setMode('idle')
    setAnswersMap({})
    setSelected(null)
    setShowFeedback(null)
    setAttemptId(null)
    setSubmitting(false)
    setResult(null)
    setLastAttempt(null)
    setStartError(null)
    setStartInfo(null)
    setLoadingLastAttempt(true)
    setQuestions(applyRandomization(baseQuestions))

    let cancelled = false
    ;(async () => {
      try {
        const [info, last] = await Promise.all([
          getQuizStartInfo(quiz.id),
          getLastQuizAttempt(quiz.id),
        ])
        if (cancelled) return
        setStartInfo(info)
        if (last) {
          setLastAttempt(last)
          setResult({ score: last.score, passed: last.passed })
          setMode('done')
        }
      } catch (e: any) {
        if (!cancelled) setStartError(e?.message || 'Kunde inte läsa quizstatus')
      } finally {
        if (!cancelled) setLoadingLastAttempt(false)
      }
    })()
    return () => { cancelled = true }
  }, [quiz.id])

  // Initialize questions when baseQuestions change (but not on quiz.id change, handled above)
  const prevQuizIdRef = React.useRef(quiz.id)
  useEffect(() => {
    if (prevQuizIdRef.current !== quiz.id) {
      prevQuizIdRef.current = quiz.id
      return
    }
    setQuestions(applyRandomization(baseQuestions))
  }, [baseQuestions, applyRandomization, quiz.id])

  const startAttempt = async () => {
    try {
      const { attemptId } = await startQuizAttempt(quiz.id)
      setAttemptId(String(attemptId))
      setMode('primary')
      setCurrentIndex(0)
      setAnswersMap({})
      setSelected(null)
      setShowFeedback(null)
      setResult(null)
      setLastAttempt(null)
      setSubmitting(false)
      setQuestions(applyRandomization(baseQuestions))
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Kunde inte starta quiz')
    }
  }

  const currentQuestion = questions[currentIndex]
  const currentQuestionId = currentQuestion ? String(currentQuestion.id) : null

  const getRandomSuccessMessage = () => {
    const messages = [
      'Perfekt!',
      'Utmärkt!',
      'Helt rätt!',
      'Bra jobbat!',
      'Fantastiskt!',
      'Du har koll!',
      'Imponerande!',
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const evaluateAnswer = (q: any, value: any) => {
    if (!q) return { correct: false, feedbackText: undefined }
    if (q.type === 'multiple-choice') {
      const correctOption = (q.options || []).find((o: any) => o.isCorrect)
      const isCorrect = correctOption && value != null && value === correctOption.text
      const feedbackText = isCorrect
        ? getRandomSuccessMessage()
        : correctOption
          ? `Rätt svar: ${correctOption.text}`
          : undefined
      return { correct: Boolean(isCorrect), feedbackText }
    }
    if (q.type === 'true-false') {
      const correctAnswer = q.correctAnswerTrueFalse ?? q.correctAnswer
      const userAnswer = String(value).toLowerCase()
      const correctAnswerStr = String(correctAnswer).toLowerCase()
      const isCorrect = userAnswer === correctAnswerStr
      const feedbackText = isCorrect
        ? getRandomSuccessMessage()
        : `Rätt svar: ${String(correctAnswer) === 'true' || correctAnswerStr === 'true' ? 'Sant' : 'Falskt'}`
      return { correct: Boolean(isCorrect), feedbackText }
    }
    if (q.type === 'short-answer') {
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
        ? getRandomSuccessMessage()
        : acceptable.length
          ? `Exempel på godkända svar: ${acceptable.join(', ')}`
          : q.correctAnswer
            ? `Rätt svar: ${q.correctAnswer}`
            : undefined
      return { correct: Boolean(isCorrect), feedbackText }
    }
    return { correct: false, feedbackText: undefined }
  }

  // Always show feedback after each answer (regardless of CMS setting)
  const confirmAnswer = () => {
    if (!currentQuestion || currentQuestionId == null) return
    const answerToConfirm = selected ?? answersMap[currentQuestionId]
    if (answerToConfirm == null) return

    const { correct, feedbackText } = evaluateAnswer(currentQuestion, answerToConfirm)
    setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: answerToConfirm }))
    setShowFeedback({ correct, text: feedbackText })
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

  const finalizeSubmit = async () => {
    if (!attemptId) return
    setSubmitting(true)
    try {
      const ordered = questions.map((q: any) => {
        const questionId = String(q.id)
        let answer = answersMap[questionId]
        if (answer === undefined && currentQuestionId === questionId && selected != null) {
          answer = selected
        }
        return { question: questionId, answer }
      })

      const { score, passed } = await submitQuizAttempt(attemptId, ordered, quiz.id)
      setResult({ score, passed })
      setMode('done')

      if (passed) {
        onPassed?.(Number(quiz.id))
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setSubmitting(false)
    }
  }

  // Confetti on pass
  useEffect(() => {
    if (result?.passed && !lastAttempt) {
      const defaults: any = {
        spread: 360, ticks: 50, gravity: 0, decay: 0.94, startVelocity: 30,
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
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
    }
  }, [result?.passed, lastAttempt])

  const q = currentQuestion

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-medium">{quiz.title}</CardTitle>
          {!attemptId && !result && !loadingLastAttempt && (
            <Button
              variant="secondary"
              onClick={startAttempt}
              disabled={startInfo?.allowed === false || baseQuestions.length === 0}
            >
              {startInfo?.allowed === false
                ? 'Försök ej tillgängligt'
                : baseQuestions.length === 0
                ? 'Quiz saknar frågor'
                : 'Starta försök'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading state */}
        {loadingLastAttempt && !attemptId && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Submitting state */}
        {submitting && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <div className="h-16 w-16 border-4 border-orange-200 dark:border-orange-900/40 rounded-full" />
              <div className="absolute inset-0 h-16 w-16 border-4 border-orange-500 dark:border-orange-400 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-orange-500 dark:text-orange-400 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-medium text-foreground">Beräknar ditt resultat...</div>
              <div className="text-sm text-muted-foreground">Detta tar bara några sekunder</div>
            </div>
          </div>
        )}

        {startInfo && startInfo.message && !attemptId && !result && !loadingLastAttempt && (
          <div className="text-sm text-red-600 dark:text-red-400">{startInfo.message}</div>
        )}

        {startError && !attemptId && !result && (
          <div className="text-sm text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-950 rounded-md">
            <strong>Fel:</strong> {startError}
          </div>
        )}

        {/* Active quiz question */}
        {attemptId && !result && q && !submitting && (
          <>
            <div className="text-sm text-muted-foreground">
              Fråga {currentIndex + 1} av {questions.length}
            </div>

            <div className="space-y-3">
              <div className="text-lg font-medium text-center">{q?.title}</div>
              {q?.content && (
                <div className="prose max-w-none text-center mx-auto">
                  <RichTextRenderer content={q.content} />
                </div>
              )}
              {q?.type === 'multiple-choice' && Array.isArray(q.options) ? (
                <div className="grid gap-3 justify-items-center">
                  {q.options.map((opt: any, i: number) => {
                    const isSelected = selected === opt.text
                    const isCorrectOption = opt.isCorrect
                    const showCorrectHighlight = showFeedback && !showFeedback.correct && isCorrectOption
                    const showWrongHighlight = showFeedback && !showFeedback.correct && isSelected
                    const showSuccessHighlight = showFeedback && showFeedback.correct && isSelected

                    return (
                      <label
                        key={i}
                        className={cn(
                          'flex items-center justify-center text-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all w-full',
                          !showFeedback && 'border-border hover:border-primary/50 hover:bg-accent',
                          !showFeedback && isSelected && 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm',
                          showCorrectHighlight && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                          showWrongHighlight && 'border-red-500 bg-red-50 dark:bg-red-900/30',
                          showSuccessHighlight && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                          showFeedback && !showCorrectHighlight && !showWrongHighlight && !showSuccessHighlight && 'opacity-50',
                          showFeedback && 'pointer-events-none',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          className="sr-only"
                          disabled={!!showFeedback}
                          checked={isSelected}
                          onChange={() => {
                            setSelected(opt.text)
                            if (currentQuestionId) {
                              setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: opt.text }))
                            }
                          }}
                        />
                        <span className="text-sm font-medium flex items-center gap-2">
                          {showCorrectHighlight && <Check className="h-4 w-4 text-green-600" />}
                          {showWrongHighlight && <X className="h-4 w-4 text-red-600" />}
                          {showSuccessHighlight && <Check className="h-4 w-4 text-green-600" />}
                          {opt.text}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : q?.type === 'true-false' ? (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 justify-items-center">
                  {[
                    { val: 'true', label: 'Sant' },
                    { val: 'false', label: 'Falskt' },
                  ].map((opt) => {
                    const isSelected = selected === opt.val
                    const correctAnswer = q.correctAnswerTrueFalse ?? q.correctAnswer
                    const correctVal = String(correctAnswer).toLowerCase()
                    const isCorrectOption = opt.val === correctVal
                    const showCorrectHighlight = showFeedback && !showFeedback.correct && isCorrectOption
                    const showWrongHighlight = showFeedback && !showFeedback.correct && isSelected
                    const showSuccessHighlight = showFeedback && showFeedback.correct && isSelected

                    return (
                      <label
                        key={opt.val}
                        className={cn(
                          'flex items-center justify-center text-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all w-full',
                          !showFeedback && 'border-border hover:border-primary/50 hover:bg-accent',
                          !showFeedback && isSelected && 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm',
                          showCorrectHighlight && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                          showWrongHighlight && 'border-red-500 bg-red-50 dark:bg-red-900/30',
                          showSuccessHighlight && 'border-green-500 bg-green-50 dark:bg-green-900/30',
                          showFeedback && !showCorrectHighlight && !showWrongHighlight && !showSuccessHighlight && 'opacity-50',
                          showFeedback && 'pointer-events-none',
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          className="sr-only"
                          disabled={!!showFeedback}
                          checked={isSelected}
                          onChange={() => {
                            setSelected(opt.val)
                            if (currentQuestionId) {
                              setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: opt.val }))
                            }
                          }}
                        />
                        <span className="text-sm font-medium flex items-center gap-2">
                          {showCorrectHighlight && <Check className="h-4 w-4 text-green-600" />}
                          {showWrongHighlight && <X className="h-4 w-4 text-red-600" />}
                          {showSuccessHighlight && <Check className="h-4 w-4 text-green-600" />}
                          {opt.label}
                        </span>
                      </label>
                    )
                  })}
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

              {/* Per-question feedback (always shown) */}
              {showFeedback && (
                <div
                  className={cn(
                    'rounded-xl p-4 flex items-start gap-3 transition-all duration-300 animate-in fade-in slide-in-from-top-2',
                    showFeedback.correct
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/40 dark:to-emerald-900/40 text-green-900 dark:text-green-50 border-2 border-green-200 dark:border-green-500'
                      : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/40 dark:to-orange-900/40 text-red-800 dark:text-red-50 border-2 border-red-200 dark:border-red-500',
                  )}
                >
                  {showFeedback.correct ? (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 dark:bg-green-400 flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-green-400/30">
                      <Check className="h-4 w-4 text-white dark:text-green-950" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 dark:bg-red-400 flex items-center justify-center shadow-sm dark:shadow-lg dark:shadow-red-400/30">
                      <X className="h-4 w-4 text-white dark:text-red-950" strokeWidth={3} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div
                      className={cn(
                        'font-semibold mb-1',
                        showFeedback.correct ? 'text-base' : 'text-sm',
                      )}
                    >
                      {showFeedback.text || (showFeedback.correct ? 'Rätt svar!' : 'Fel svar.')}
                    </div>
                    {q?.explanation && (
                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-zinc-500 bg-white/90 dark:bg-zinc-800/60 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                          Förklaring
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert text-gray-800 dark:text-gray-100">
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
                    {currentIndex < questions.length - 1 ? 'Nästa fråga' : 'Se resultat'}
                  </Button>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Idle state (no previous attempts) */}
        {!attemptId && !result && !loadingLastAttempt && (
          <div className="text-sm text-muted-foreground">
            Klicka på &quot;Starta försök&quot; för att börja.
          </div>
        )}

        {/* Results screen */}
        {result && !submitting && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Previous attempt indicator */}
            {lastAttempt && (
              <div className="mb-4 text-sm text-muted-foreground text-center">
                Senaste försök: {new Date(lastAttempt.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            )}

            {result.passed ? (
              <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800/40 bg-transparent">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-emerald-500/8 dark:via-transparent dark:to-green-500/5"
                />
                <CardContent className="relative p-8 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-700 dark:to-emerald-800 flex items-center justify-center shadow-xl shadow-green-500/30 dark:shadow-green-900/40">
                        <Award className="w-10 h-10 text-white dark:text-green-100" strokeWidth={2.5} />
                      </div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-600 flex items-center justify-center shadow-lg animate-bounce">
                        <Sparkles className="w-4 h-4 text-amber-900 dark:text-amber-100" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-400">
                      {lastAttempt ? 'Godkänt!' : 'Fantastiskt jobbat!'}
                    </h3>
                    <p className="text-green-700 dark:text-green-500/80 text-base">
                      {lastAttempt ? 'Du klarade quizet!' : 'Du klarade quizet med ett strålande resultat'}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-800/80 border-2 border-green-300 dark:border-green-800/50">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
                    <span className="text-3xl font-bold text-green-900 dark:text-green-400">
                      {result.score}%
                    </span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-500/80">
                      rätt svar
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">
                        {baseQuestions.length}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-600">Frågor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">
                        {Math.round((result.score / 100) * baseQuestions.length)}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-600">Rätt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">&#10003;</div>
                      <div className="text-xs text-green-700 dark:text-green-600">Godkänd</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Button
                      onClick={startAttempt}
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Gör om quizet
                    </Button>
                    {onNavigateNext && (
                      <Button
                        onClick={onNavigateNext}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                        size="lg"
                      >
                        Nästa
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800/40 bg-transparent">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-orange-500/8 dark:via-transparent dark:to-amber-500/5"
                />
                <CardContent className="relative p-8 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 dark:from-orange-700 dark:to-amber-800 flex items-center justify-center shadow-xl shadow-orange-500/30 dark:shadow-orange-900/40">
                      <RotateCcw className="w-10 h-10 text-white dark:text-orange-100" strokeWidth={2.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-400">
                      Nästan där!
                    </h3>
                    <p className="text-orange-700 dark:text-orange-500/80 text-base">
                      Fortsätt öva så kommer du klara det nästa gång
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-800/80 border-2 border-orange-300 dark:border-orange-800/50">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                    <span className="text-3xl font-bold text-orange-900 dark:text-orange-400">
                      {result.score}%
                    </span>
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-500/80">
                      rätt svar
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-400">
                        {baseQuestions.length}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-600">Frågor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-400">
                        {Math.round((result.score / 100) * baseQuestions.length)}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-600">Rätt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-400">
                        {quiz.quizSettings?.passingScore ?? 70}%
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-600">Krävs</div>
                    </div>
                  </div>

                  <Button
                    onClick={startAttempt}
                    className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white shadow-lg shadow-orange-600/30 dark:shadow-none"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Försök igen
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Question-by-question summary */}
            {(lastAttempt?.answers || Object.keys(answersMap).length > 0) && (
              <QuestionSummary
                questions={baseQuestions}
                answers={lastAttempt?.answers}
                answersMap={answersMap}
                evaluateAnswer={evaluateAnswer}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuestionSummary({
  questions,
  answers,
  answersMap,
  evaluateAnswer,
}: {
  questions: any[]
  answers?: Array<{ questionId: number; answer: any; isCorrect: boolean }>
  answersMap: Record<string, any>
  evaluateAnswer: (q: any, value: any) => { correct: boolean; feedbackText?: string }
}) {
  const [expanded, setExpanded] = React.useState(false)

  const questionResults = React.useMemo(() => {
    return questions.map((q) => {
      const qId = String(q.id)
      if (answers) {
        const a = answers.find((ans) => String(ans.questionId) === qId)
        return { question: q, isCorrect: a?.isCorrect ?? false, userAnswer: a?.answer }
      }
      const userAnswer = answersMap[qId]
      if (userAnswer == null) return { question: q, isCorrect: false, userAnswer: undefined }
      const { correct } = evaluateAnswer(q, userAnswer)
      return { question: q, isCorrect: correct, userAnswer }
    })
  }, [questions, answers, answersMap, evaluateAnswer])

  return (
    <div className="mt-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 text-muted-foreground"
      >
        {expanded ? 'Dölj frågorna' : 'Visa dina svar'}
        <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
      </Button>

      {expanded && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {questionResults.map(({ question: q, isCorrect, userAnswer }, idx) => {
            const correctOption = q.type === 'multiple-choice'
              ? (q.options || []).find((o: any) => o.isCorrect)?.text
              : q.type === 'true-false'
                ? (String(q.correctAnswerTrueFalse ?? q.correctAnswer).toLowerCase() === 'true' ? 'Sant' : 'Falskt')
                : q.correctAnswer || (q.acceptableAnswers || [])[0]?.answer

            return (
              <div
                key={q.id}
                className={cn(
                  'rounded-lg border p-4 text-sm',
                  isCorrect
                    ? 'border-green-200 bg-green-50/50 dark:border-green-800/40 dark:bg-green-900/20'
                    : 'border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/20',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
                    isCorrect ? 'bg-green-500' : 'bg-red-500',
                  )}>
                    {isCorrect
                      ? <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      : <X className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">
                      {idx + 1}. {q.title}
                    </div>
                    {userAnswer != null && (
                      <div className={cn(
                        'mt-1',
                        isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                      )}>
                        Ditt svar: {q.type === 'true-false' ? (String(userAnswer).toLowerCase() === 'true' ? 'Sant' : 'Falskt') : String(userAnswer)}
                      </div>
                    )}
                    {!isCorrect && correctOption && (
                      <div className="mt-1 text-green-700 dark:text-green-400">
                        Rätt svar: {correctOption}
                      </div>
                    )}
                    {q.explanation && (
                      <div className="mt-2 rounded-md border border-gray-200 dark:border-zinc-600 bg-white/80 dark:bg-zinc-800/60 p-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                          <Lightbulb className="h-3 w-3 text-amber-500" />
                          Förklaring
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert text-gray-700 dark:text-gray-200">
                          <RichTextRenderer content={q.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
