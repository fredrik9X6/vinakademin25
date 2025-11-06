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

// Use different prefix for development vs production to avoid conflicts
// This allows you to test file uploads in dev without affecting production
const s3Prefix =
  process.env.S3_PREFIX || (process.env.NODE_ENV === 'development' ? 'dev' : 'production')

// Always include S3 storage plugin in config so it's included in import map
// This ensures the import map is generated even if S3 env vars aren't set during build
// The plugin will gracefully handle missing credentials at runtime
// Only create the plugin if S3 is actually enabled, otherwise use a no-op config
const s3StoragePlugin = s3Enabled
  ? s3Storage({
      bucket: process.env.S3_BUCKET as string,
      collections: {
        media: {
          prefix: s3Prefix, // Use dev/production prefix to separate environments
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
    })
  : // When S3 is disabled, still include plugin for import map, but with minimal config
    s3Storage({
      bucket: 'placeholder',
      collections: {
        media: {},
      },
      config: {
        region: 'auto',
        credentials: {
          accessKeyId: 'placeholder',
          secretAccessKey: 'placeholder',
        },
      },
    })

// Log config initialization for debugging
console.log('=== PAYLOAD CONFIG INITIALIZATION ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('DATABASE_URI set:', !!process.env.DATABASE_URI)
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL)
console.log('POSTGRES_URL set:', !!process.env.POSTGRES_URL)
console.log('PAYLOAD_SECRET set:', !!process.env.PAYLOAD_SECRET)
console.log('S3 enabled:', s3Enabled)
console.log('S3 prefix:', s3Prefix)
console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
console.log('PAYLOAD_PUBLIC_SERVER_URL:', process.env.PAYLOAD_PUBLIC_SERVER_URL)
console.log('=====================================')

const databaseConnectionString =
  process.env.DATABASE_URI ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  // Use placeholder for build time when env vars aren't available
  'postgresql://placeholder:placeholder@localhost:5432/placeholder'

const isProductionBuild = process.env.NODE_ENV === undefined && !process.env.DATABASE_URI

if (isProductionBuild) {
  console.log('⚠️  Build mode detected: Using placeholder database connection')
  console.log('⚠️  Database will be connected at runtime with actual credentials')
} else {
  console.log('✓ Database connection string found (length:', databaseConnectionString.length, ')')
}

const payloadSecret = process.env.PAYLOAD_SECRET || 'development-secret-change-in-production'

if (!process.env.PAYLOAD_SECRET && !isProductionBuild) {
  console.warn('⚠️  WARNING: Using default PAYLOAD_SECRET in development. Set PAYLOAD_SECRET in production!')
} else if (process.env.PAYLOAD_SECRET) {
  console.log('✓ PAYLOAD_SECRET found (length:', process.env.PAYLOAD_SECRET.length, ')')
}

console.log('✓ Starting buildConfig...')

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
  // Log environment for debugging
  onInit: async (payload) => {
    console.log('✓ Payload initialized successfully')
    console.log('✓ Collections:', Object.keys(payload.config.collections))
  },
  cors: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://www.vinakademin.se',
    'https://vinakademin25-production.up.railway.app',
    ...(process.env.PAYLOAD_PUBLIC_SERVER_URL ? [process.env.PAYLOAD_PUBLIC_SERVER_URL] : []),
    ...(process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : []),
  ],
  csrf: [
    'http://localhost:3000',
    'http://localhost:3002',
    'https://www.vinakademin.se',
    'https://vinakademin25-production.up.railway.app',
    ...(process.env.PAYLOAD_PUBLIC_SERVER_URL ? [process.env.PAYLOAD_PUBLIC_SERVER_URL] : []),
    ...(process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : []),
  ],
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
  secret: payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: databaseConnectionString,
    },
  }),
  sharp,
  plugins: [
    // Always include S3 storage plugin so it's in the import map
    // This ensures import map generation works even if S3 env vars aren't set during build
    s3StoragePlugin,
  ],
})

console.log('✓ Payload config built successfully')
