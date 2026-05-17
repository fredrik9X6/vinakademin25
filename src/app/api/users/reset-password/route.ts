import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-users-reset-password')

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    // Use PayloadCMS's built-in reset password method
    const result = await payload.resetPassword({
      collection: 'users',
      data: {
        token,
        password,
      },
      overrideAccess: true,
    })

    // Auto-verify the account on successful reset. The reset token was
    // delivered to the user's email, so they've already proven email
    // ownership — same level of proof as the verification email. Without
    // this, an unverified user who resets their password is still blocked
    // from logging in by auth.verify (silent failure that required an admin
    // to manually flip _verified before login worked).
    const userId =
      (result as { user?: { id?: number | string } } | null)?.user?.id ?? null
    if (userId != null) {
      try {
        await payload.update({
          collection: 'users',
          id: userId,
          data: { _verified: true } as never,
          overrideAccess: true,
        })
      } catch (verifyErr) {
        // Don't fail the reset on a verify-flip error — the password is
        // already updated. Worst case the user stays unverified and we
        // surface that via a follow-up support ticket.
        log.warn(
          { err: verifyErr, userId },
          'reset_password_auto_verify_failed',
        )
      }
    }

    return NextResponse.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    log.error('Reset password error:', error)

    // Handle PayloadCMS validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json({ errors: (error as any).errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Password reset failed' }, { status: 400 })
  }
}
