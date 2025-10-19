import { draftMode } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { isEnabled } = await draftMode()

    return NextResponse.json({
      draftMode: isEnabled,
      timestamp: new Date().toISOString(),
      message: isEnabled ? 'Draft mode is ENABLED' : 'Draft mode is DISABLED',
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to check draft mode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
