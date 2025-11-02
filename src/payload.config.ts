

import { s3Storage } from '@payloadcms/storage-s3'
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
import { Vinprovningar } from './collections/Vinprovningar'
import { Modules } from './collections/Modules'
import { ContentItems } from './collections/ContentItems'
import { UserProgress } from './collections/UserProgress'
import { Questions } from './collections/Questions'
import { QuizAttempts } from './collections/QuizAttempts'
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

const s3Enabled =
  !!process.env.S3_BUCKET &&
  !!process.env.S3_REGION &&
  !!process.env.S3_ACCESS_KEY_ID &&
  !!process.env.S3_SECRET_ACCESS_KEY

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    dateFormat: 'dd/MM/yyyy',
    // TEMPORARILY DISABLED - Testing if livePreview is causing lockedState error
    // livePreview: {
    //   breakpoints: [
    //     {
    //       label: 'Mobile',
    //       name: 'mobile',
    //       width: 375,
    //       height: 667,
    //     },
    //     {
    //       label: 'Tablet',
    //       name: 'tablet',
    //       width: 768,
    //       height: 1024,
    //     },
    //     {
    //       label: 'Desktop',
    //       name: 'desktop',
    //       width: 1440,
    //       height: 900,
    //     },
    //   ],
    // },
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
    Vinprovningar,
    Modules,
    ContentItems,
    UserProgress,
    Questions,
    QuizAttempts,
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
      connectionString:
        process.env.DATABASE_URI ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL_NON_POOLING ||
        '',
    },
  }),
  sharp,
  plugins: [
    ...(s3Enabled
      ? [
          s3Storage({
            bucket: process.env.S3_BUCKET as string,
            collections: {
              media: {
                ...(process.env.S3_PREFIX ? { prefix: process.env.S3_PREFIX } : {}),
                ...(process.env.S3_PUBLIC_URL
                  ? {
                      generateFileURL: ({ filename }: { filename: string }) =>
                        `${process.env.S3_PUBLIC_URL!.replace(/\/$/, '')}/${filename}`,
                    }
                  : {}),
              },
            },
            config: {
              region: process.env.S3_REGION,
              endpoint: process.env.S3_ENDPOINT,
              forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
              credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
              },
            },
          }),
        ]
      : []),
  ],
})
