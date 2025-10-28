import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    useAsTitle: 'wine',
    defaultColumns: ['wine', 'user', 'rating', 'isTrusted', 'createdAt'],
    description: 'User reviews for wines, including WSET tasting notes',
  },
  access: {
    // Only owner can read their own submissions; admins/instructors can read all;
    // trusted reviews (answer keys) are publicly readable;
    // session participants can read each other's reviews in the same session
    read: async ({ req }) => {
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      const userId = req.user?.id

      if (userId) {
        try {
          // Find all sessions this user is participating in
          const userParticipations = await req.payload.find({
            collection: 'session-participants',
            where: {
              and: [{ user: { equals: Number(userId) } }, { isActive: { equals: true } }],
            },
            limit: 100,
          })

          const sessionIds = userParticipations.docs.map((p) => {
            const sessionId = typeof p.session === 'object' ? p.session.id : p.session
            return Number(sessionId)
          })

          // User can read:
          // 1. Trusted reviews (answer keys)
          // 2. Their own reviews
          // 3. Reviews from any participant in sessions they're part of
          const conditions: any[] = [
            { isTrusted: { equals: true } },
            { user: { equals: Number(userId) } },
          ]

          // Add condition for session reviews if user is in any sessions
          if (sessionIds.length > 0) {
            conditions.push({
              session: { in: sessionIds },
            })
          }

          return { or: conditions }
        } catch (error) {
          console.error('Error in reviews read access:', error)
          // Fallback to basic access
          return {
            or: [{ isTrusted: { equals: true } }, { user: { equals: Number(userId) } }],
          }
        }
      }

      // For non-logged-in users, only show trusted reviews
      return {
        or: [{ isTrusted: { equals: true } }],
      }
    },
    create: async ({ req, data }) => {
      console.log('🔍 [REVIEW CREATE ACCESS] Starting access check')
      console.log('📊 [REVIEW CREATE ACCESS] Data received:', {
        lesson: data?.lesson,
        session: data?.session,
        sessionParticipant: data?.sessionParticipant,
        wine: data?.wine,
        hasUser: !!req.user,
        userRole: req.user?.role,
      })

      // Admins/instructors can always create (including form state building)
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') {
        console.log('✅ [REVIEW CREATE ACCESS] Admin/Instructor - ALLOWED')
        return true
      }

      // If no data or no lesson, it's a form state check - allow it to pass
      // This happens when Payload is building the UI and doesn't have actual review data yet
      const lessonId = data?.lesson
      console.log('📚 [REVIEW CREATE ACCESS] Lesson ID:', lessonId)
      if (!lessonId) {
        console.log('⚠️ [REVIEW CREATE ACCESS] No lesson ID - allowing for form state building')
        return true // Allow form state building
      }

      // Beyond this point, we need a logged-in user for actual review creation
      const userId = req.user?.id
      console.log('👤 [REVIEW CREATE ACCESS] User ID:', userId)
      if (!userId) {
        console.log('❌ [REVIEW CREATE ACCESS] No user ID - DENIED')
        return false
      }

      try {
        const payload = req.payload

        // Fetch lesson to resolve module -> course
        const lesson = await payload.findByID({ collection: 'lessons', id: String(lessonId) })
        console.log('📖 [REVIEW CREATE ACCESS] Lesson found:', lesson?.id, lesson?.title)

        const moduleId =
          lesson?.module && typeof lesson.module === 'object'
            ? (lesson.module as any).id
            : lesson?.module
        console.log('📦 [REVIEW CREATE ACCESS] Module ID:', moduleId)
        if (!moduleId) {
          console.log('❌ [REVIEW CREATE ACCESS] No module ID - DENIED')
          return false
        }

        const moduleDoc = await payload.findByID({ collection: 'modules', id: String(moduleId) })
        console.log('📦 [REVIEW CREATE ACCESS] Module found:', moduleDoc?.id, moduleDoc?.title)

        const courseId =
          moduleDoc?.course && typeof moduleDoc.course === 'object'
            ? (moduleDoc.course as any).id
            : moduleDoc?.course
        console.log('🎓 [REVIEW CREATE ACCESS] Course ID:', courseId)
        if (!courseId) {
          console.log('❌ [REVIEW CREATE ACCESS] No course ID - DENIED')
          return false
        }

        // Check if user is in an active session for this course
        if (data?.session) {
          console.log('🎭 [REVIEW CREATE ACCESS] Session provided:', data.session)
          try {
            const session = await payload.findByID({
              collection: 'course-sessions',
              id: String(data.session),
            })
            console.log('🎭 [REVIEW CREATE ACCESS] Session found:', {
              id: session?.id,
              status: session?.status,
              joinCode: session?.joinCode,
            })

            // Verify session is for this course and is active
            const sessionCourseId =
              typeof session.course === 'object' ? session.course.id : session.course
            console.log('🎭 [REVIEW CREATE ACCESS] Session course ID:', sessionCourseId)
            console.log('🎭 [REVIEW CREATE ACCESS] Comparing:', {
              sessionCourseId: Number(sessionCourseId),
              courseId: Number(courseId),
              match: Number(sessionCourseId) === Number(courseId),
              sessionActive: session?.status === 'active',
            })

            if (
              session &&
              session.status === 'active' &&
              Number(sessionCourseId) === Number(courseId)
            ) {
              console.log('🎭 [REVIEW CREATE ACCESS] Session valid, checking participant...')
              // Check if user is an active participant in this session
              const participant = await payload.find({
                collection: 'session-participants',
                where: {
                  and: [
                    { session: { equals: Number(data.session) } },
                    { user: { equals: Number(userId) } },
                    { isActive: { equals: true } },
                  ],
                },
                limit: 1,
              })
              console.log('👥 [REVIEW CREATE ACCESS] Participant search result:', {
                found: participant.totalDocs,
                docs: participant.docs.map((p) => ({
                  id: p.id,
                  userId: p.user && typeof p.user === 'object' ? p.user.id : p.user,
                  sessionId: typeof p.session === 'object' ? p.session.id : p.session,
                  isActive: p.isActive,
                })),
              })

              if (participant.totalDocs > 0) {
                console.log('✅ [REVIEW CREATE ACCESS] Active session participant - ALLOWED')
                return true
              } else {
                console.log('⚠️ [REVIEW CREATE ACCESS] Not an active participant in this session')
              }
            } else {
              console.log('⚠️ [REVIEW CREATE ACCESS] Session validation failed')
            }
          } catch (error) {
            console.error('❌ [REVIEW CREATE ACCESS] Error checking session access:', error)
          }
        } else {
          console.log('ℹ️ [REVIEW CREATE ACCESS] No session provided, checking enrollment...')
        }

        // Otherwise, check enrollment (for course owners)
        console.log(
          '🎫 [REVIEW CREATE ACCESS] Checking enrollment for user:',
          userId,
          'course:',
          courseId,
        )
        const enrollments = await payload.find({
          collection: 'enrollments',
          where: {
            and: [{ user: { equals: Number(userId) } }, { course: { equals: Number(courseId) } }],
          },
          limit: 1,
        })
        console.log('🎫 [REVIEW CREATE ACCESS] Enrollment result:', {
          found: enrollments.totalDocs,
          docs: enrollments.docs.map((e) => ({
            id: e.id,
            userId: typeof e.user === 'object' ? e.user.id : e.user,
            courseId: typeof e.course === 'object' ? e.course.id : e.course,
          })),
        })

        const hasEnrollment = (enrollments?.totalDocs || 0) > 0
        if (hasEnrollment) {
          console.log('✅ [REVIEW CREATE ACCESS] Has enrollment - ALLOWED')
        } else {
          console.log('❌ [REVIEW CREATE ACCESS] No enrollment - DENIED')
        }
        return hasEnrollment
      } catch (error) {
        console.error('❌ [REVIEW CREATE ACCESS] Error in review create access:', error)
        return false
      }
    },
    update: ({ req }) => {
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      const userId = req.user?.id
      if (!userId) return false
      // Only allow updating own documents
      return { user: { equals: Number(userId) } }
    },
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      // attach createdBy/updatedBy metadata
      withCreatedByUpdatedBy,
      // force user field to current user on create; ignore client-provided user
      ({ data, req, operation }) => {
        if (operation === 'create') {
          const userId = req.user?.id
          if (userId) {
            return { ...data, user: userId }
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: true,
      admin: { description: 'The wine being reviewed' },
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      required: false,
      admin: { description: 'Associated lesson when used as a Wine Review quiz' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        description: 'User who wrote the review',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'sessionParticipant',
      type: 'relationship',
      relationTo: 'session-participants',
      required: false,
      admin: {
        description: 'Session participant who submitted this review (for guest reviews)',
        position: 'sidebar',
      },
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'course-sessions',
      required: false,
      admin: {
        description: 'Session this review was submitted in (for group tastings)',
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this review',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who last updated this review',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'rating',
      type: 'number',
      label: 'Betyg',
      min: 1,
      max: 5,
      required: true,
      admin: { description: 'User rating from 1-5' },
    },
    {
      name: 'reviewText',
      type: 'richText',
      label: 'Recensionstext',
      admin: { description: 'User review text' },
    },
    {
      name: 'isTrusted',
      type: 'checkbox',
      label: 'Trusted Review',
      defaultValue: false,
      admin: {
        description: 'Mark as trusted (admins/instructors only)',
        readOnly: false,
        position: 'sidebar',
      },
      access: {
        update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'instructor',
      },
    },
    // WSET Tasting Protocol
    {
      name: 'wsetTasting',
      type: 'group',
      label: 'WSET Provningsprotokoll',
      admin: { description: 'WSET systematiskt provningsprotokoll' },
      fields: [
        {
          name: 'appearance',
          type: 'group',
          label: 'Utseende',
          fields: [
            { name: 'clarity', type: 'select', label: 'Klarhet', options: ['Klar', 'Oklar'] },
            {
              name: 'intensity',
              type: 'select',
              label: 'Intensitet',
              options: ['Blek', 'Mellan', 'Djup'],
            },
            {
              name: 'color',
              type: 'select',
              label: 'färg',
              options: [
                'Citrongul',
                'Guld',
                'Bärnstensfärgad',
                'Rosa',
                'Rosa-orange',
                'Orange',
                'Lila',
                'Rubinröd',
                'Granatröd',
                'Läderfärgad',
              ],
            },
          ],
        },
        {
          name: 'nose',
          type: 'group',
          label: 'Doft',
          fields: [
            {
              name: 'intensity',
              type: 'select',
              label: 'Intensitet',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'primaryAromas',
              type: 'select',
              label: 'Primära aromer',
              hasMany: true,
              options: [
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ],
            },
            {
              name: 'secondaryAromas',
              type: 'select',
              label: 'Sekundära aromer',
              hasMany: true,
              options: [
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ],
            },
            {
              name: 'tertiaryAromas',
              type: 'select',
              label: 'Tertiära aromer',
              hasMany: true,
              options: [
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ],
            },
          ],
        },
        {
          name: 'palate',
          type: 'group',
          label: 'Smak',
          fields: [
            {
              name: 'sweetness',
              type: 'select',
              label: 'Sötma',
              options: ['Torr', 'Halvtorr', 'Mellan', 'Söt'],
            },
            {
              name: 'acidity',
              type: 'select',
              label: 'Syra',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'tannin',
              type: 'select',
              label: 'Tannin',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'alcohol',
              type: 'select',
              label: 'Alkohol',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'body',
              type: 'select',
              label: 'Fyllighet',
              options: ['Lätt', 'Mellan', 'Fyllig'],
            },
            {
              name: 'flavourIntensity',
              type: 'select',
              label: 'Smakintensitet',
              options: ['Låg', 'Medium', 'Uttalad'],
            },
            {
              name: 'primaryFlavours',
              type: 'select',
              label: 'Primära smaker',
              hasMany: true,
              options: [
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ],
            },
            {
              name: 'secondaryFlavours',
              type: 'select',
              label: 'Sekundära smaker',
              hasMany: true,
              options: [
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ],
            },
            {
              name: 'tertiaryFlavours',
              type: 'select',
              label: 'Tertiära smaker',
              hasMany: true,
              options: [
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ],
            },
            {
              name: 'finish',
              type: 'select',
              label: 'Eftersmak',
              options: ['Kort', 'Mellan', 'Lång'],
            },
          ],
        },
        {
          name: 'conclusion',
          type: 'group',
          label: 'Slutsats',
          fields: [
            {
              name: 'quality',
              type: 'select',
              label: 'Kvalitet',
              options: ['Dålig', 'Acceptabel', 'Bra', 'Mycket bra', 'Enastående'],
            },

            { name: 'summary', type: 'textarea', label: 'Sammanfattning/Noteringar' },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
