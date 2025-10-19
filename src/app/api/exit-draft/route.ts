import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') || '/'

  try {
    // Disable draft mode
    const draft = await draftMode()
    draft.disable()

    // Redirect to the specified URL or home
    redirect(url)
  } catch (error) {
    console.error('Exit draft mode error:', error)
    return new Response('Error disabling draft mode', { status: 500 })
  }
}
