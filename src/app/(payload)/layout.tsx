/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  try {
    return await handleServerFunctions({
      ...args,
      config,
      importMap,
    })
  } catch (error: any) {
    console.error('❌ serverFunction error:', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
    })
    throw error
  }
}

const Layout = async ({ children }: Args) => {
  try {
    console.log('🔍 Admin layout render starting...')
    const result = await RootLayout({ config, importMap, serverFunction, children })
    console.log('✅ Admin layout render successful')
    return result
  } catch (error: any) {
    console.error('❌ Admin layout error:', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n'),
    })
    throw error
  }
}

export default Layout
