'use server'

import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

/**
 * Helper function to find course and module for a content item (quiz or lesson)
 */
async function findCourseAndModuleForContentItem(contentItemId: number | string) {
  const payload = await getPayload({ config })
  
  // Find all modules that contain this content item
  const modules = await payload.find({
    collection: 'modules',
    where: {
      'contentItems.contentItem': { equals: contentItemId },
    },
    limit: 1000,
    depth: 2,
  })

  if (modules.docs.length === 0) {
    return { course: null, module: null, isFree: false }
  }

  // Get the first module that contains this content item
  const module = modules.docs[0]
  
  // Find which course contains this module
  const courses = await payload.find({
    collection: 'vinprovningar',
    where: {
      'modules.module': { equals: module.id },
    },
    limit: 1,
    depth: 1,
  })

  if (courses.docs.length === 0) {
    return { course: null, module: null, isFree: false }
  }

  const course = courses.docs[0]
  
  // Find isFree flag from module's contentItems array
  const contentItems = (module as any).contentItems || []
  const contentItemEntry = contentItems.find((ci: any) => {
    const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
    return itemId === contentItemId
  })
  
  const isFree = contentItemEntry?.isFree || false

  return { course, module, isFree }
}

export async function startQuizAttempt(quizId: number | string) {
  const payload = await getPayload({ config })
  const user = await getUser()

  // Fetch quiz with depth 2 to populate questions array and question relationships
  const quiz = await payload.findByID({ collection: 'content-items', id: String(quizId), depth: 2 })
  if (!quiz || quiz.status === 'archived' || quiz.contentType !== 'quiz') {
    throw new Error('Quiz not found')
  }

  // Verify quiz has questions
  if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    throw new Error('Quiz has no questions')
  }

  // Find course and module for this quiz
  const { course, module: quizModule, isFree } = await findCourseAndModuleForContentItem(quizId)
  
  if (!course) {
    throw new Error('Quiz not associated with any course')
  }

  // Require authentication even for free quizzes
  if (!user) throw new Error('Unauthorized')

  const attempts = await payload.find({
    collection: 'quiz-attempts',
    where: {
      and: [{ user: { equals: user.id.toString() } }, { quiz: { equals: String(quizId) } }],
    },
    limit: 0,
  })
  const attemptNumber = (attempts?.totalDocs || 0) + 1

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
      startedAt: new Date().toISOString(),
      answers: seededAnswers,
    },
  })

  return { attemptId: created.id }
}

export async function getQuizStartInfo(quizId: number | string) {
  const payload = await getPayload({ config })
  const user = await getUser()

  // Fetch quiz with depth 1 (we don't need questions for start info)
  const quiz = await payload.findByID({ collection: 'content-items', id: String(quizId), depth: 1 })
  if (!quiz || quiz.status === 'archived' || quiz.contentType !== 'quiz') {
    throw new Error('Quiz not found')
  }

  // Find course and module for this quiz
  const { course, isFree } = await findCourseAndModuleForContentItem(quizId)
  
  if (!course) {
    throw new Error('Quiz not associated with any course')
  }

  // Require authentication even for free quizzes
  if (!user) throw new Error('Unauthorized')

  const attempts = await payload.find({
    collection: 'quiz-attempts',
    where: { and: [{ user: { equals: String(user.id) } }, { quiz: { equals: String(quizId) } }] },
    limit: 0,
  })
  const totalAttempts = attempts?.totalDocs || 0

  const allowed = true
  const message = null

  return {
    allowed,
    message,
    totalAttempts,
    maxAttempts: null,
    remainingAttempts: null,
  }
}

export async function submitQuizAttempt(
  attemptId: number | string,
  answers: Array<{ question: string; answer: any }>,
  quizIdForGuest?: number | string,
) {
  const payload = await getPayload({ config })
  const user = await getUser()

  // Require authentication - no guest attempts allowed
  if (!user) throw new Error('Unauthorized')

  // Check if this is a guest attempt (should not happen anymore, but handle gracefully)
  const isGuestAttempt = String(attemptId).startsWith('guest-')
  if (isGuestAttempt) {
    throw new Error('Authentication required to submit quiz attempts')
  }

  const attempt = await payload.findByID({ collection: 'quiz-attempts', id: String(attemptId) })
  if (!attempt) throw new Error('Attempt not found')
  const attemptUserId =
    attempt && typeof attempt.user === 'object' && attempt.user
      ? (attempt.user as any).id
      : attempt.user
  if (String(attemptUserId) !== String(user.id)) throw new Error('Attempt not found')

  const quizId = typeof attempt.quiz === 'object' ? (attempt.quiz as any).id : attempt.quiz
  // Fetch quiz with depth 2 to ensure questions are populated
  const quiz = await payload.findByID({ collection: 'content-items', id: String(quizId), depth: 2 })
  if (!quiz || quiz.contentType !== 'quiz') throw new Error('Quiz not found')

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
  
  // Debug: Log submitted answers
  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Submitted answers:', JSON.stringify(answers, null, 2))
    console.log('📋 Question map keys:', Array.from(questionMap.keys()))
  }
  
  const evaluated = (Array.isArray(answers) ? answers : []).map((ans) => {
    const q = questionMap.get(String(ans.question))
    if (!q) {
      console.warn('⚠️ Question not found in map:', ans.question)
      return { ...ans, isCorrect: false, pointsAwarded: 0 }
    }

    const points = q.points ?? 1
    maxPoints += points

    let correct = false
    if (q.type === 'multiple-choice') {
      const correctOption = (q.options || []).find((o: any) => o.isCorrect)
      correct = correctOption && ans.answer != null && ans.answer === correctOption.text
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Multiple-choice evaluation:', {
          questionId: q.id,
          questionTitle: q.title,
          userAnswer: ans.answer,
          correctOption: correctOption?.text,
          correct,
        })
      }
    } else if (q.type === 'true-false') {
      // Use correctAnswerTrueFalse field (select field with 'true'/'false' string values)
      // Fallback to correctAnswer for backward compatibility
      const correctAnswer = q.correctAnswerTrueFalse ?? q.correctAnswer
      
      // Normalize both values to strings for comparison
      const userAnswer = String(ans.answer).toLowerCase()
      const correctAnswerStr = String(correctAnswer).toLowerCase()
      
      // Compare normalized strings
      correct = userAnswer === correctAnswerStr
      
      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 True/False evaluation:', {
          questionId: q.id,
          questionTitle: q.title,
          userAnswer: ans.answer,
          userAnswerNormalized: userAnswer,
          correctAnswer: correctAnswer,
          correctAnswerNormalized: correctAnswerStr,
          correctAnswerTrueFalse: q.correctAnswerTrueFalse,
          correct,
        })
      }
    } else if (q.type === 'short-answer') {
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Question ${q.id} evaluation:`, {
        correct,
        points,
        awarded,
        correctCount,
      })
    }
    
    return { ...ans, isCorrect: correct, pointsAwarded: awarded }
  })
  
  // Use equal-weight scoring (each question counts equally)
  const totalCount = evaluated.length
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
  const passed = score >= (quiz.quizSettings?.passingScore ?? 70)
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📈 Final scoring:', {
      totalCount,
      correctCount,
      score,
      passed,
      evaluated: evaluated.map(e => ({
        question: e.question,
        isCorrect: e.isCorrect,
        pointsAwarded: e.pointsAwarded,
      })),
    })
  }

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
      completedAt: new Date().toISOString(),
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
      collection: 'content-items',
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
    // Find course for this quiz
    const { course } = await findCourseAndModuleForContentItem(quizId)
    if (!course) {
      return { score, passed }
    }

    const courseId = Number(course.id)
    // Note: quizzes no longer have lesson relationship, so lessonId is null
    const lessonId = null

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
          lastAccessedAt: new Date().toISOString(),
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
          completedAt: new Date().toISOString(),
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
        completedAt: new Date().toISOString(),
      }
      if (qIdx >= 0) nextQuizScores[qIdx] = qEntry
      else nextQuizScores.push(qEntry)

      await payload.update({
        collection: 'user-progress',
        id: String(upsertTarget),
        data: {
          status: 'in-progress',
          lastAccessedAt: new Date().toISOString(),
          ...(lessonId ? { scores: nextScores } : {}),
          quizScores: nextQuizScores,
        },
      })
    }
  } catch {}

  return { score, passed }
}
