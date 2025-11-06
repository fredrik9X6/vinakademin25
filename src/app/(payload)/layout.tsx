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
    console.log('serverFunction: Called')

    // Test if config can be awaited
    const resolvedConfig = await config
    console.log('serverFunction: Config resolved successfully')

    // handleServerFunctions expects Promise<SanitizedConfig>, not resolved config
    const result = await handleServerFunctions({
      ...args,
      config,
      importMap,
    })
    console.log('serverFunction: handleServerFunctions returned successfully')
    return result
  } catch (error: any) {
    // Log full error details for debugging
    console.error('serverFunction CAUGHT ERROR:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
    })
    // Re-throw to let error boundary catch it
    throw error
  }
}

const Layout = async ({ children }: Args) => {
  try {
    console.log('Layout: Starting render')

    // Test if config can be awaited
    const resolvedConfig = await config
    console.log('Layout: Config resolved successfully')
    console.log('Layout: Admin route:', resolvedConfig.routes?.admin)

    // RootLayout expects Promise<SanitizedConfig>, not resolved config
    console.log('Layout: Calling RootLayout')
    const result = await RootLayout({ config, importMap, serverFunction, children })
    console.log('Layout: RootLayout returned successfully')
    return result
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Layout CAUGHT ERROR:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      cause: error?.cause,
      digest: (error as any)?.digest,
    })
    throw error
  }
}

export default Layout
