import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const getUser = async () => {
  const payload = await getPayload({ config })
  const headersList = await headers()
  const cookieString = headersList.get('cookie') || ''

  if (!cookieString) {
    console.log('getUser: No cookie header found.')
    return null
  }

  try {
    console.log('getUser: Verifying authentication...')
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    if (user) {
      console.log('getUser: User authenticated, user:', user.id)
      return user
    } else {
      console.log('getUser: No user found in authentication result.')
      return null
    }
  } catch (error) {
    console.error('getUser: Error verifying authentication:', error)
    return null
  }
}
