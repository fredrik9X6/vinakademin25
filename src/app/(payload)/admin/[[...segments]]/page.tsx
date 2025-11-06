/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

// Add detailed logging for debugging production issues
const logEnvironment = () => {
  console.log('=== PAYLOAD ADMIN DEBUG ===')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('DATABASE_URI set:', !!process.env.DATABASE_URI)
  console.log('PAYLOAD_SECRET set:', !!process.env.PAYLOAD_SECRET)
  console.log('S3_BUCKET set:', !!process.env.S3_BUCKET)
  console.log('S3_REGION set:', !!process.env.S3_REGION)
  console.log('S3_ACCESS_KEY_ID set:', !!process.env.S3_ACCESS_KEY_ID)
  console.log('S3_SECRET_ACCESS_KEY set:', !!process.env.S3_SECRET_ACCESS_KEY)
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
  console.log('PAYLOAD_PUBLIC_SERVER_URL:', process.env.PAYLOAD_PUBLIC_SERVER_URL)
  console.log('=========================')
}

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    logEnvironment()
    console.log('generateMetadata: Starting')
    
    // Test if config can be awaited
    const resolvedConfig = await config
    console.log('generateMetadata: Config resolved successfully')
    console.log('generateMetadata: DB adapter:', resolvedConfig.db?.defaultIDType)
    
    // generatePageMetadata expects Promise<SanitizedConfig>, not resolved config
    return generatePageMetadata({ config, params, searchParams })
  } catch (error: any) {
    console.error('generateMetadata CAUGHT ERROR:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
    })
    throw error
  }
}

const Page = async ({ params, searchParams }: Args) => {
  try {
    logEnvironment()
    console.log('Page: Starting render')
    
    // Test if config can be awaited
    const resolvedConfig = await config
    console.log('Page: Config resolved successfully')
    console.log('Page: Collections:', Object.keys(resolvedConfig.collections || {}))
    
    // RootPage expects Promise<SanitizedConfig>, not resolved config
    console.log('Page: Calling RootPage')
    const result = await RootPage({ config, params, searchParams, importMap })
    console.log('Page: RootPage returned successfully')
    return result
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Page CAUGHT ERROR:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
      digest: (error as any)?.digest,
    })
    // Re-throw to let error boundary catch it
    throw error
  }
}

export default Page
