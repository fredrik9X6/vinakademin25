/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import type { Metadata } from 'next'

import config from '@payload-config'
import { NotFoundPage, generatePageMetadata } from '@payloadcms/next/views'
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
  const resolvedConfig = await config
  return generatePageMetadata({ config: resolvedConfig, params, searchParams })
}

const NotFound = async ({ params, searchParams }: Args) => {
  const resolvedConfig = await config
  return NotFoundPage({ config: resolvedConfig, params, searchParams, importMap })
}

export default NotFound
