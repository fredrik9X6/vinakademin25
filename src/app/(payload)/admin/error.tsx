'use client'

import React from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Application Error</h1>
        <p className="mb-4 text-gray-600">
          An error occurred while loading the admin panel. This is often caused by missing media
          files or configuration issues.
        </p>
        {/* Show error details in production too - helps debugging */}
        {error.digest && (
          <details className="mb-4">
            <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
            <pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
              Error Digest: {error.digest}
              {error.message && `\nMessage: ${error.message}`}
              {error.stack && `\nStack: ${error.stack}`}
            </pre>
          </details>
        )}
        <div className="mb-4 rounded bg-yellow-50 p-4 text-sm text-yellow-800">
          <p className="font-semibold">Common causes:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Missing S3 environment variables in production</li>
            <li>Database connection issues</li>
            <li>Missing environment variables (PAYLOAD_SECRET, etc.)</li>
          </ul>
          <p className="mt-2">
            Check Railway logs for the full error message (digest: {error.digest})
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Try Again
          </button>
          <a
            href="/logga-in"
            className="rounded border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  )
}

