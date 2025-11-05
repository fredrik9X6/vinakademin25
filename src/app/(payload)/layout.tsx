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
    // Await config in case it's async (PayloadCMS 3.0 pattern)
    const resolvedConfig = await config
    return handleServerFunctions({
      ...args,
      config: resolvedConfig,
      importMap,
    })
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Server function error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    // Re-throw to let error boundary catch it
    throw error
  }
}

const Layout = async ({ children }: Args) => {
  try {
    // Await config in case it's async (PayloadCMS 3.0 pattern)
    const resolvedConfig = await config
    return (
      <RootLayout config={resolvedConfig} importMap={importMap} serverFunction={serverFunction}>
        {children}
      </RootLayout>
    )
  } catch (error: any) {
    // Log full error details for debugging
    console.error('Layout render error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
    })
    throw error
  }
}

export default Layout
