/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'

import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('(payload)-admin-[[...segments]]-page')

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    return await generatePageMetadata({ config, params, searchParams })
  } catch (error: any) {
    log.error('❌ generateMetadata error:', {
      message: error?.message,
      digest: error?.digest,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    })
    throw error
  }
}

const Page = async ({ params, searchParams }: Args) => {
  try {
    log.info('🔍 Admin page render starting...')
    const result = await RootPage({ config, params, searchParams, importMap })
    log.info('✅ Admin page render successful')
    return result
  } catch (error: any) {
    // Don't log NEXT_REDIRECT as error - it's expected
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.includes('NEXT_REDIRECT')) {
      log.info('🔀 Redirecting (expected):', error?.digest)
      throw error
    }
    
    log.error('❌ Admin page render error:', {
      message: error?.message,
      digest: error?.digest,
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    })
    throw error
  }
}

export default Page
