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
} from 'lucide-react'
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
  // Base questions from quiz
  const baseQuestions = useMemo<any[]>(() => {
    console.log('📋 Quiz data:', { 
      id: quiz.id, 
      title: quiz.title, 
      contentType: quiz.contentType,
      questionsLength: quiz.questions?.length,
      questions: quiz.questions 
    })
    
    if (!Array.isArray(quiz.questions)) {
      console.warn('⚠️ Quiz questions is not an array:', quiz.questions)
      return []
    }
    
    const extracted = quiz.questions
      .map((q: any) => {
        // Handle both populated and unpopulated question relationships
        const question = typeof q.question === 'object' && q.question ? q.question : q.question
        if (!question) {
          console.warn('⚠️ Found null/undefined question in array:', q)
          return null
        }
        return question
      })
      .filter(Boolean)
    
    console.log('✅ Extracted questions:', extracted.length, extracted)
    return extracted
  }, [quiz])

  // Randomized questions - re-randomize on each new attempt
  const [questions, setQuestions] = useState<any[]>(baseQuestions)

  // Apply randomization when starting a new attempt
  const applyRandomization = useCallback((questionsList: any[]) => {
    let processedQuestions = [...questionsList]
    
    if (quiz.quizSettings?.randomizeQuestions) {
      // Randomize question order
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5)
    }

    // Randomize answers for multiple-choice questions if enabled
    if (quiz.quizSettings?.randomizeAnswers) {
      processedQuestions = processedQuestions.map((q) => {
        if (q.type === 'multiple-choice' && Array.isArray(q.options)) {
          return {
            ...q,
            options: [...q.options].sort(() => Math.random() - 0.5),
          }
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

  // Initialize questions when baseQuestions change
  useEffect(() => {
    setQuestions(applyRandomization(baseQuestions))
  }, [baseQuestions, applyRandomization])

  const startAttempt = async () => {
    try {
      console.log('🚀 Starting quiz attempt for quiz:', quiz.id)
      const { attemptId } = await startQuizAttempt(quiz.id)
      console.log('✅ Quiz attempt started:', attemptId)
      setAttemptId(String(attemptId))
      setMode('primary')
      setCurrentIndex(0)
      setAnswersMap({})
      setSelected(null)
      setShowFeedback(null)
      setResult(null) // Reset result to hide results screen
      setSubmitting(false) // Reset submitting state
      
      // Apply randomization when starting a new attempt
      setQuestions(applyRandomization(baseQuestions))
    } catch (error) {
      console.error('❌ Error starting quiz attempt:', error)
      setStartError(error instanceof Error ? error.message : 'Kunde inte starta quiz')
    }
  }

  const showCorrectAfterQuestion = quiz?.quizSettings?.showCorrectAnswers === 'after-question'

  const currentQuestion = questions[currentIndex]
  const currentQuestionId = currentQuestion ? String(currentQuestion.id) : null

  // Array of varied success messages for better UX
  const getRandomSuccessMessage = () => {
    const messages = [
      'Perfekt! 🎯',
      'Utmärkt! 🌟',
      'Helt rätt! 👏',
      'Bra jobbat! ✨',
      'Fantastiskt! 🎉',
      'Du har koll! 🍷',
      'Imponerande! 💫',
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
      // Use correctAnswerTrueFalse field (select field with 'true'/'false' string values)
      // Fallback to correctAnswer for backward compatibility
      const correctAnswer = q.correctAnswerTrueFalse ?? q.correctAnswer
      
      // Normalize both values to strings for comparison
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

  const confirmAnswer = () => {
    if (!currentQuestion || currentQuestionId == null) return
    
    // Ensure we have a selected value - use current selected or get from answersMap
    const answerToConfirm = selected ?? answersMap[currentQuestionId]
    if (answerToConfirm == null) {
      console.warn('⚠️ No answer selected for question:', currentQuestionId)
      return
    }
    
    const { correct, feedbackText } = evaluateAnswer(currentQuestion, answerToConfirm)
    setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: answerToConfirm }))
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
      // Build answers array, ensuring we include the current question's selected answer if not yet saved
      const ordered = questions.map((q: any) => {
        const questionId = String(q.id)
        // Check if answer is in map, otherwise use selected if this is the current question
        let answer = answersMap[questionId]
        if (answer === undefined && currentQuestionId === questionId && selected != null) {
          answer = selected
        }
        return {
          question: questionId,
          answer: answer,
        }
      })
      
      console.log('📤 Submitting quiz answers:', {
        attemptId,
        quizId: quiz.id,
        answers: ordered,
        answersMap,
        currentQuestionId,
        currentSelected: selected,
        questions: questions.map((q: any) => ({ id: q.id, title: q.title })),
      })
      
      const { score, passed } = await submitQuizAttempt(attemptId, ordered, quiz.id)
      console.log('✅ Quiz submission result:', { score, passed })
      setResult({ score, passed })
      setMode('done')
    } catch (error) {
      console.error('❌ Error submitting quiz:', error)
      // You might want to show an error message to the user here
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
          {!attemptId && !result && (
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
              <div className="text-lg font-semibold text-foreground">Beräknar ditt resultat...</div>
              <div className="text-sm text-muted-foreground">Detta tar bara några sekunder</div>
            </div>
          </div>
        )}

        {startInfo && startInfo.message && !attemptId && !result && (
          <div className="text-sm text-red-600 dark:text-red-400">{startInfo.message}</div>
        )}

        {startError && !attemptId && !result && (
          <div className="text-sm text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-950 rounded-md">
            <strong>Fel:</strong> {startError}
          </div>
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
                        onChange={() => {
                          setSelected(opt.text)
                          // For multiple-choice questions, immediately save the answer when selected
                          // This ensures the answer is stored even if user navigates away
                          if (currentQuestionId) {
                            setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: opt.text }))
                          }
                        }}
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
                        onChange={() => {
                          setSelected(opt.val)
                          // For True/False questions, immediately save the answer when selected
                          // This ensures the answer is stored even if user navigates away
                          if (currentQuestionId) {
                            setAnswersMap((prev) => ({ ...prev, [currentQuestionId]: opt.val }))
                          }
                        }}
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {result.passed ? (
              <Card className="relative overflow-hidden border-2 border-green-200 dark:border-green-800/40 bg-transparent">
                {/* Decorative background overlay to avoid bg-card conflicts */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
                />
                {/* Subtle accent overlay for dark mode */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-emerald-500/8 dark:via-transparent dark:to-green-500/5"
                />
                <CardContent className="relative p-8 text-center space-y-6">
                  {/* Success Icon */}
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 dark:from-green-700 dark:to-emerald-800 flex items-center justify-center shadow-xl shadow-green-500/30 dark:shadow-green-900/40">
                        <Award
                          className="w-10 h-10 text-white dark:text-green-100"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-600 flex items-center justify-center shadow-lg animate-bounce">
                        <Sparkles className="w-4 h-4 text-amber-900 dark:text-amber-100" />
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-green-900 dark:text-green-400">
                      Fantastiskt jobbat!
                    </h3>
                    <p className="text-green-700 dark:text-green-500/80 text-base">
                      Du klarade quizet med ett strålande resultat
                    </p>
                  </div>

                  {/* Score Display */}
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-800/80 border-2 border-green-300 dark:border-green-800/50">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-500" />
                    <span className="text-3xl font-bold text-green-900 dark:text-green-400">
                      {result.score}%
                    </span>
                    <span className="text-sm font-medium text-green-700 dark:text-green-500/80">
                      rätt svar
                    </span>
                  </div>

                  {/* Success Stats */}
                  <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">
                        {questions.length}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-600">Frågor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">
                        {Math.round((result.score / 100) * questions.length)}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-600">Rätt</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-900 dark:text-green-400">✓</div>
                      <div className="text-xs text-green-700 dark:text-green-600">Godkänd</div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => onPassed?.(Number(quiz.id))}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-lg shadow-green-600/30 dark:shadow-none"
                    size="lg"
                  >
                    Fortsätt till nästa lektion
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="relative overflow-hidden border-2 border-orange-200 dark:border-orange-800/40 bg-transparent">
                {/* Decorative background overlay to avoid bg-card conflicts */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900"
                />
                {/* Subtle accent overlay for dark mode */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent dark:from-orange-500/8 dark:via-transparent dark:to-amber-500/5"
                />
                <CardContent className="relative p-8 text-center space-y-6">
                  {/* Retry Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 dark:from-orange-700 dark:to-amber-800 flex items-center justify-center shadow-xl shadow-orange-500/30 dark:shadow-orange-900/40">
                      <RotateCcw
                        className="w-10 h-10 text-white dark:text-orange-100"
                        strokeWidth={2.5}
                      />
                    </div>
                  </div>

                  {/* Encouragement Message */}
                  <div className="space-y-2">
                    <h3 className="text-2xl md:text-3xl font-bold text-orange-900 dark:text-orange-400">
                      Nästan där!
                    </h3>
                    <p className="text-orange-700 dark:text-orange-500/80 text-base">
                      Fortsätt öva så kommer du klara det nästa gång
                    </p>
                  </div>

                  {/* Score Display */}
                  <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/80 dark:bg-zinc-800/80 border-2 border-orange-300 dark:border-orange-800/50">
                    <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                    <span className="text-3xl font-bold text-orange-900 dark:text-orange-400">
                      {result.score}%
                    </span>
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-500/80">
                      rätt svar
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 py-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-400">
                        {questions.length}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-600">Frågor</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-900 dark:text-orange-400">
                        {Math.round((result.score / 100) * questions.length)}
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

                  {/* Retry Button */}
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
