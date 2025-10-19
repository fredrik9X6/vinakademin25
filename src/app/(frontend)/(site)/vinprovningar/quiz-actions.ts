'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function startQuizAttempt(quizId: number | string) {
  const payload = await getPayload({ config })
  const user = await getUser()

  const quiz = await payload.findByID({ collection: 'quizzes', id: String(quizId), depth: 1 })
  if (!quiz || quiz.status === 'archived') throw new Error('Quiz not found')

  // Check if quiz is free by checking the course structure
  const courseId = typeof quiz.course === 'object' ? quiz.course.id : quiz.course
  const course = await payload.findByID({ collection: 'courses', id: String(courseId) })

  // Get module to find quiz position
  const moduleId = typeof quiz.module === 'object' ? quiz.module.id : quiz.module
  const allModules = await payload.find({
    collection: 'modules',
    where: { course: { equals: String(courseId) } },
    limit: 1000,
    sort: 'order',
  })

  // Get all lessons and quizzes for the course
  const [allLessons, allQuizzes] = await Promise.all([
    payload.find({
      collection: 'lessons',
      where: { module: { in: allModules.docs.map((m) => m.id) } },
      limit: 1000,
      sort: 'order',
    }),
    payload.find({
      collection: 'quizzes',
      where: { course: { equals: String(courseId) } },
      limit: 1000,
    }),
  ])

  // Build ordered items list to determine position
  const orderedItems: any[] = []
  for (const module of allModules.docs.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const moduleLessons = allLessons.docs
      .filter((l) => {
        const lModId = typeof l.module === 'object' ? l.module.id : l.module
        return lModId === module.id
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const moduleQuizzes = allQuizzes.docs.filter((q) => {
      const qModId = typeof q.module === 'object' ? q.module.id : q.module
      return qModId === module.id
    })

    // Check if module has contents ordering
    const contents = Array.isArray((module as any).contents) ? (module as any).contents : []
    if (contents.length > 0) {
      contents.forEach((c: any) => {
        if (c.blockType === 'lesson-item') {
          const lessonId = typeof c.lesson === 'object' ? c.lesson.id : c.lesson
          const lesson = moduleLessons.find((l) => l.id === lessonId)
          if (lesson) orderedItems.push({ type: 'lesson', id: lesson.id })
        } else if (c.blockType === 'quiz-item') {
          const quizId = typeof c.quiz === 'object' ? c.quiz.id : c.quiz
          const quiz = moduleQuizzes.find((q) => q.id === quizId)
          if (quiz) orderedItems.push({ type: 'quiz', id: quiz.id })
        }
      })
    } else {
      // No contents, use lesson/quiz order
      moduleLessons.forEach((l) => orderedItems.push({ type: 'lesson', id: l.id }))
      moduleQuizzes.forEach((q) => orderedItems.push({ type: 'quiz', id: q.id }))
    }
  }

  // Find position of this quiz
  const quizPosition = orderedItems.findIndex((item) => item.type === 'quiz' && item.id === quiz.id)
  const freeItemCount = course.freeItemCount || 0
  const isFree = quizPosition >= 0 && quizPosition < freeItemCount

  if (!user && !isFree) throw new Error('Unauthorized')

  // Enforce availability window
  const now = new Date()
  const availableFrom = quiz.availability?.availableFrom
    ? new Date(quiz.availability.availableFrom)
    : null
  const availableUntil = quiz.availability?.availableUntil
    ? new Date(quiz.availability.availableUntil)
    : null
  if ((availableFrom && now < availableFrom) || (availableUntil && now > availableUntil)) {
    throw new Error('Quiz is not currently available')
  }

  // For guest users (free quizzes), return a special guest attempt ID
  if (!user) {
    // Generate a client-side only attempt ID for guest users
    const guestAttemptId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return { attemptId: guestAttemptId }
  }

  const attempts = await payload.find({
    collection: 'quiz-attempts',
    where: {
      and: [{ user: { equals: user.id.toString() } }, { quiz: { equals: String(quizId) } }],
    },
    limit: 0,
  })
  const attemptNumber = (attempts?.totalDocs || 0) + 1

  // Enforce max attempts if configured
  const maxAttempts = quiz.quizSettings?.maxAttempts
  if (typeof maxAttempts === 'number' && maxAttempts > 0 && attemptNumber > maxAttempts) {
    throw new Error('Maximum number of attempts reached')
  }

  const seededAnswers = Array.isArray(quiz.questions)
    ? quiz.questions.map((q: any) => ({
        question: Number(typeof q.question === 'object' ? q.question.id : q.question),
        answer: {},
        isCorrect: false,
        pointsAwarded: 0,
      }))
    : []

  const created = await payload.create({
    collection: 'quiz-attempts',
    data: {
      user: Number(user.id),
      quiz: Number(quizId),
      attemptNumber,
      status: 'in-progress',
      startedAt: new Date(),
      answers: seededAnswers,
    },
  })

  return { attemptId: created.id }
}

export async function getQuizStartInfo(quizId: number | string) {
  const payload = await getPayload({ config })
  const user = await getUser()

  const quiz = await payload.findByID({ collection: 'quizzes', id: String(quizId), depth: 1 })
  if (!quiz || quiz.status === 'archived') throw new Error('Quiz not found')

  // Check if quiz is free by checking course structure (same logic as startQuizAttempt)
  const courseId = typeof quiz.course === 'object' ? quiz.course.id : quiz.course
  const course = await payload.findByID({ collection: 'courses', id: String(courseId) })

  const allModules = await payload.find({
    collection: 'modules',
    where: { course: { equals: String(courseId) } },
    limit: 1000,
    sort: 'order',
  })

  const [allLessons, allQuizzes] = await Promise.all([
    payload.find({
      collection: 'lessons',
      where: { module: { in: allModules.docs.map((m) => m.id) } },
      limit: 1000,
      sort: 'order',
    }),
    payload.find({
      collection: 'quizzes',
      where: { course: { equals: String(courseId) } },
      limit: 1000,
    }),
  ])

  const orderedItems: any[] = []
  for (const module of allModules.docs.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const moduleLessons = allLessons.docs
      .filter((l) => {
        const lModId = typeof l.module === 'object' ? l.module.id : l.module
        return lModId === module.id
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0))

    const moduleQuizzes = allQuizzes.docs.filter((q) => {
      const qModId = typeof q.module === 'object' ? q.module.id : q.module
      return qModId === module.id
    })

    const contents = Array.isArray((module as any).contents) ? (module as any).contents : []
    if (contents.length > 0) {
      contents.forEach((c: any) => {
        if (c.blockType === 'lesson-item') {
          const lessonId = typeof c.lesson === 'object' ? c.lesson.id : c.lesson
          const lesson = moduleLessons.find((l) => l.id === lessonId)
          if (lesson) orderedItems.push({ type: 'lesson', id: lesson.id })
        } else if (c.blockType === 'quiz-item') {
          const quizId = typeof c.quiz === 'object' ? c.quiz.id : c.quiz
          const quiz = moduleQuizzes.find((q) => q.id === quizId)
          if (quiz) orderedItems.push({ type: 'quiz', id: quiz.id })
        }
      })
    } else {
      moduleLessons.forEach((l) => orderedItems.push({ type: 'lesson', id: l.id }))
      moduleQuizzes.forEach((q) => orderedItems.push({ type: 'quiz', id: q.id }))
    }
  }

  const quizPosition = orderedItems.findIndex((item) => item.type === 'quiz' && item.id === quiz.id)
  const freeItemCount = course.freeItemCount || 0
  const isFree = quizPosition >= 0 && quizPosition < freeItemCount

  if (!user && !isFree) throw new Error('Unauthorized')

  const now = new Date()
  const availableFrom = quiz.availability?.availableFrom
    ? new Date(quiz.availability.availableFrom)
    : null
  const availableUntil = quiz.availability?.availableUntil
    ? new Date(quiz.availability.availableUntil)
    : null

  let availabilityOk = true
  let availabilityMessage: string | null = null
  if (availableFrom && now < availableFrom) {
    availabilityOk = false
    availabilityMessage = 'Quizen är inte tillgänglig ännu.'
  } else if (availableUntil && now > availableUntil) {
    availabilityOk = false
    availabilityMessage = 'Quizen är inte längre tillgänglig.'
  }

  // Only check attempts if user is logged in
  let totalAttempts = 0
  let attemptsOk = true
  let attemptsMessage: string | null = null
  let remainingAttempts: number | null = null
  const maxAttempts = quiz.quizSettings?.maxAttempts ?? null

  if (user) {
    const attempts = await payload.find({
      collection: 'quiz-attempts',
      where: { and: [{ user: { equals: String(user.id) } }, { quiz: { equals: String(quizId) } }] },
      limit: 0,
    })
    totalAttempts = attempts?.totalDocs || 0

    if (typeof maxAttempts === 'number' && maxAttempts > 0) {
      remainingAttempts = Math.max(0, maxAttempts - totalAttempts)
      if (remainingAttempts === 0) {
        attemptsOk = false
        attemptsMessage = 'Du har nått max antal försök.'
      }
    }
  }

  const allowed = availabilityOk && attemptsOk
  const message = !allowed ? availabilityMessage || attemptsMessage : null

  return {
    allowed,
    message,
    totalAttempts,
    maxAttempts,
    remainingAttempts,
  }
}

export async function submitQuizAttempt(
  attemptId: number | string,
  answers: Array<{ question: string; answer: any }>,
  quizIdForGuest?: number | string,
) {
  const payload = await getPayload({ config })
  const user = await getUser()

  // Check if this is a guest attempt
  const isGuestAttempt = String(attemptId).startsWith('guest-')

  // For guest attempts, just calculate the score without saving to database
  if (isGuestAttempt && quizIdForGuest) {
    const quiz = await payload.findByID({ collection: 'quizzes', id: String(quizIdForGuest) })
    if (!quiz) throw new Error('Quiz not found')

    const questionMap = new Map<string, any>()
    if (Array.isArray(quiz.questions)) {
      for (const q of quiz.questions) {
        const qDoc =
          typeof q.question === 'object'
            ? q.question
            : await payload.findByID({ collection: 'questions', id: q.question })
        if (qDoc) questionMap.set(String(qDoc.id), qDoc)
      }
    }

    // Evaluate answers (same logic as for logged-in users)
    let correctCount = 0
    const evaluated = (Array.isArray(answers) ? answers : []).map((ans) => {
      const q = questionMap.get(String(ans.question))
      if (!q) return { ...ans, isCorrect: false }

      let correct = false
      if (q.type === 'multiple-choice') {
        const correctOption = (q.options || []).find((o: any) => o.isCorrect)
        correct = correctOption && ans.answer != null && ans.answer === correctOption.text
      } else if (q.type === 'true-false') {
        correct = ans.answer === q.correctAnswer
      } else if (q.type === 'short-answer' || q.type === 'fill-blank') {
        const acceptable = (q.acceptableAnswers || []).map((a: any) => a.answer)
        correct = acceptable.length
          ? acceptable.some(
              (a: string) =>
                String(ans.answer).trim().toLowerCase() === String(a).trim().toLowerCase(),
            )
          : String(ans.answer).trim().toLowerCase() ===
            String(q.correctAnswer || '')
              .trim()
              .toLowerCase()
      }

      if (correct) correctCount += 1
      return { ...ans, isCorrect: correct }
    })

    const totalCount = evaluated.length
    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    const passed = score >= (quiz.quizSettings?.passingScore ?? 70)

    return { score, passed }
  }

  // Regular flow for logged-in users
  if (!user) throw new Error('Unauthorized')

  const attempt = await payload.findByID({ collection: 'quiz-attempts', id: String(attemptId) })
  if (!attempt) throw new Error('Attempt not found')
  const attemptUserId =
    attempt && typeof attempt.user === 'object' && attempt.user
      ? (attempt.user as any).id
      : attempt.user
  if (String(attemptUserId) !== String(user.id)) throw new Error('Attempt not found')

  const quizId = typeof attempt.quiz === 'object' ? (attempt.quiz as any).id : attempt.quiz
  const quiz = await payload.findByID({ collection: 'quizzes', id: String(quizId) })
  if (!quiz) throw new Error('Quiz not found')

  const questionMap = new Map<string, any>()
  if (Array.isArray(quiz.questions)) {
    for (const q of quiz.questions) {
      const qDoc =
        typeof q.question === 'object'
          ? q.question
          : await payload.findByID({ collection: 'questions', id: q.question })
      if (qDoc) questionMap.set(String(qDoc.id), qDoc)
    }
  }

  let totalPoints = 0
  let maxPoints = 0
  let correctCount = 0
  const evaluated = (Array.isArray(answers) ? answers : []).map((ans) => {
    const q = questionMap.get(String(ans.question))
    if (!q) return { ...ans, isCorrect: false, pointsAwarded: 0 }

    const points = q.points ?? 1
    maxPoints += points

    let correct = false
    if (q.type === 'multiple-choice') {
      const correctOption = (q.options || []).find((o: any) => o.isCorrect)
      correct = correctOption && ans.answer != null && ans.answer === correctOption.text
    } else if (q.type === 'true-false') {
      correct = ans.answer === q.correctAnswer
    } else if (q.type === 'short-answer' || q.type === 'fill-blank') {
      const acceptable = (q.acceptableAnswers || []).map((a: any) => a.answer)
      correct = acceptable.length
        ? acceptable.some(
            (a: string) =>
              String(ans.answer).trim().toLowerCase() === String(a).trim().toLowerCase(),
          )
        : String(ans.answer).trim().toLowerCase() ===
          String(q.correctAnswer || '')
            .trim()
            .toLowerCase()
    } else {
      correct = false
    }

    const awarded = correct ? points : 0
    totalPoints += awarded
    if (correct) correctCount += 1
    return { ...ans, isCorrect: correct, pointsAwarded: awarded }
  })
  // Use equal-weight scoring (each question counts equally)
  const totalCount = evaluated.length
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const passed = score >= (quiz.quizSettings?.passingScore ?? 70)

  // Compute time spent
  let timeSpentSeconds = 0
  try {
    const start = attempt.startedAt ? new Date(attempt.startedAt) : null
    if (start) {
      timeSpentSeconds = Math.max(0, Math.floor((Date.now() - start.getTime()) / 1000))
    }
  } catch {}

  await payload.update({
    collection: 'quiz-attempts',
    id: String(attemptId),
    data: {
      status: 'completed',
      completedAt: new Date(),
      timeSpent: timeSpentSeconds,
      answers: evaluated.map((a) => ({
        question: Number(a.question),
        answer: {
          value:
            a.answer === undefined || a.answer === null
              ? null
              : typeof a.answer === 'boolean'
                ? a.answer
                : String(a.answer),
        },
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded,
      })),
      scoring: {
        totalPoints,
        maxPoints,
        score,
        passed,
      },
    },
  })

  // Update quiz analytics (totals across completed attempts)
  try {
    const completedAttempts = await payload.find({
      collection: 'quiz-attempts',
      where: { and: [{ quiz: { equals: String(quizId) } }, { status: { equals: 'completed' } }] },
      limit: 1000,
    })
    const totalAttempts = completedAttempts.totalDocs || 0
    let sumScores = 0
    let passedCount = 0
    let sumTime = 0
    for (const a of completedAttempts.docs as any[]) {
      if (a.scoring?.score != null) sumScores += Number(a.scoring.score)
      if (a.scoring?.passed) passedCount += 1
      if (a.timeSpent != null) sumTime += Number(a.timeSpent)
    }
    const averageScore = totalAttempts > 0 ? Math.round(sumScores / totalAttempts) : 0
    const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0
    const averageTimeSpent = totalAttempts > 0 ? Math.round(sumTime / totalAttempts) : 0

    await payload.update({
      collection: 'quizzes',
      id: String(quizId),
      data: {
        analytics: {
          totalAttempts,
          averageScore,
          passRate,
          averageTimeSpent,
        },
      },
    })
  } catch {}

  // Update user progress (scores + quizScores)
  try {
    const courseId = Number(
      typeof quiz.course === 'object' ? (quiz.course as any)?.id : quiz.course,
    )
    const lessonId = quiz.lesson
      ? Number(typeof quiz.lesson === 'object' ? (quiz.lesson as any).id : quiz.lesson)
      : null

    const userProgress = await payload.find({
      collection: 'user-progress',
      where: {
        and: [{ user: { equals: Number(user.id) } }, { course: { equals: Number(courseId) } }],
      },
      limit: 1,
    })

    let progressId = userProgress.docs[0]?.id
    if (!progressId) {
      const createdProgress = await payload.create({
        collection: 'user-progress',
        data: {
          user: Number(user.id),
          course: courseId,
          status: 'in-progress',
          lastAccessedAt: new Date(),
        },
      })
      progressId = createdProgress.id
    }

    // Count attempts for this quiz
    const latest = await payload.find({
      collection: 'quiz-attempts',
      where: {
        and: [
          { user: { equals: String(user.id) } },
          { quiz: { equals: String(quizId) } },
          { status: { equals: 'completed' } },
        ],
      },
      limit: 0,
    })
    const attemptsForThis = latest.totalDocs || 0

    // Resolve progress doc id
    const upsertTarget = progressId
      ? progressId
      : (
          await payload.find({
            collection: 'user-progress',
            where: {
              and: [
                { user: { equals: Number(user.id) } },
                { course: { equals: Number(courseId) } },
              ],
            },
            limit: 1,
          })
        ).docs[0]?.id

    if (upsertTarget) {
      const progressDoc = await payload.findByID({
        collection: 'user-progress',
        id: String(upsertTarget),
      })

      // 1) Upsert lesson-tied score if applicable
      let nextScores = Array.isArray(progressDoc.scores) ? [...progressDoc.scores] : []
      if (lessonId) {
        const idx = nextScores.findIndex((s: any) => {
          const sId = typeof s.lesson === 'object' ? s.lesson.id : s.lesson
          return Number(sId) === lessonId
        })
        const entry = {
          lesson: lessonId,
          score,
          attempts: attemptsForThis,
          completedAt: new Date(),
        }
        if (idx >= 0) nextScores[idx] = entry
        else nextScores.push(entry)
      }

      // 2) Upsert quizScores (always, even if not lesson-linked)
      const nextQuizScores = Array.isArray((progressDoc as any).quizScores)
        ? [...(progressDoc as any).quizScores]
        : []
      const qIdx = nextQuizScores.findIndex((e: any) => {
        const qId = typeof e.quiz === 'object' ? e.quiz.id : e.quiz
        return Number(qId) === Number(quizId)
      })
      const qEntry = {
        quiz: Number(quizId),
        score,
        attempts: attemptsForThis,
        passed,
        completedAt: new Date(),
      }
      if (qIdx >= 0) nextQuizScores[qIdx] = qEntry
      else nextQuizScores.push(qEntry)

      await payload.update({
        collection: 'user-progress',
        id: String(upsertTarget),
        data: {
          status: 'in-progress',
          lastAccessedAt: new Date(),
          ...(lessonId ? { scores: nextScores } : {}),
          quizScores: nextQuizScores,
        },
      })
    }
  } catch {}

  return { score, passed }
}
