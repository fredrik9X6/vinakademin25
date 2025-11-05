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

export const generateMetadata = async ({ params, searchParams }: Args): Promise<Metadata> => {
  try {
    // generatePageMetadata expects Promise<SanitizedConfig>, not resolved config
    return generatePageMetadata({ config, params, searchParams })
  } catch (error: any) {
    console.error('generateMetadata error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    })
    throw error
  }
}

const Page = async ({ params, searchParams }: Args) => {
  try {
    // RootPage expects Promise<SanitizedConfig>, not resolved config
    return RootPage({ config, params, searchParams, importMap })
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Admin page render error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    // Re-throw to let error boundary catch it
    throw error
  }
}

export default Page
