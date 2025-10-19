

// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { resendAdapter } from '@payloadcms/email-resend'
import { Media } from './collections/Media'
import { Users } from './collections/Users'
import { Courses } from './collections/Courses'
import { Modules } from './collections/Modules'
import { Lessons } from './collections/Lessons'
import { UserProgress } from './collections/UserProgress'
import { Questions } from './collections/Questions'
import { Quizzes } from './collections/Quizzes'
import { QuizAttempts } from './collections/QuizAttempts'
import { ContentTemplates } from './collections/ContentTemplates'
import { Enrollments } from './collections/Enrollments'
import { Wines } from './collections/Wines'
import { UserWines } from './collections/UserWines'
import { Transactions } from './collections/Transactions'
import { Subscriptions } from './collections/Subscriptions'
import { Orders } from './collections/Orders'
import { Grapes } from './collections/Grapes'
import { Countries } from './collections/Countries'
import { Regions } from './collections/Regions'
import { UserWineLists } from './collections/UserWineLists'
import { Reviews } from './collections/Reviews'
import { CourseReviews } from './collections/CourseReviews'
import { BlogPosts } from './collections/BlogPosts'
import { BlogCategories } from './collections/BlogCategories'
import { BlogTags } from './collections/BlogTags'
import { CourseSessions } from './collections/CourseSessions'
import { SessionParticipants } from './collections/SessionParticipants'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'dd/MM/yyyy',
    // Enable live preview in admin
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  cors: ['http://localhost:3000', 'http://localhost:3002', 'https://www.vinakademin.se'],
  csrf: ['http://localhost:3000', 'http://localhost:3002', 'https://www.vinakademin.se'],
  email: resendAdapter({
    defaultFromAddress: 'noreply@dineonline.se',
    defaultFromName: 'Vinakademin',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  collections: [
    Media,
    Users,
    Courses,
    Modules,
    Lessons,
    UserProgress,
    Questions,
    Quizzes,
    QuizAttempts,
    ContentTemplates,
    Enrollments,
    Wines,
    UserWines,
    Transactions,
    Subscriptions,
    Orders,
    Grapes,
    Countries,
    Regions,
    UserWineLists,
    Reviews,
    CourseReviews,
    BlogPosts,
    BlogCategories,
    BlogTags,
    CourseSessions,
    SessionParticipants,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    // storage-adapter-placeholder
  ],
})
