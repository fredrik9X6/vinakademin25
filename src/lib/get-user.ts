import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('lib-get-user')

export const getUser = async () => {
  const payload = await getPayload({ config })
  const headersList = await headers()
  const cookieString = headersList.get('cookie') || ''

  if (!cookieString) {
    log.info('getUser: No cookie header found.')
    return null
  }

  try {
    log.info('getUser: Verifying authentication...')
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    if (user) {
      log.info('getUser: User authenticated, user:', user.id)
      return user
    } else {
      log.info('getUser: No user found in authentication result.')
      return null
    }
  } catch (error) {
    log.error('getUser: Error verifying authentication:', error)
    return null
  }
}
