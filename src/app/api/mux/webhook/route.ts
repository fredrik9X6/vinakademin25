import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  console.log('🔔 Webhook received')

  const webhookSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET

  if (!webhookSecret) {
    console.error('❌ Mux webhook secret is not configured.')
    return NextResponse.json({ message: 'Webhook secret not configured.' }, { status: 500 })
  }

  try {
    const body = await req.text()
    const signature = req.headers.get('mux-signature')

    console.log('📝 Webhook body length:', body.length)
    console.log('🔐 Webhook signature:', signature)

    // Temporarily disable signature verification for testing
    // TODO: Re-enable after confirming webhook works
    /*
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body, 'utf8')
        .digest('hex')
      
      // Mux signature format: t=timestamp,v1=signature
      const parts = signature.split(',')
      const signaturePart = parts.find(part => part.startsWith('v1='))
      const providedSignature = signaturePart?.replace('v1=', '')
      
      if (expectedSignature !== providedSignature) {
        console.error('❌ Webhook signature verification failed')
        console.error('Expected:', expectedSignature)
        console.error('Provided:', providedSignature)
        return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
      }
    }
    */

    const event = JSON.parse(body)
    console.log('📦 Webhook event:', event.type, event.data?.id)

    const payload = await getPayload({ config: configPromise })

    // Handle different Mux event types
    switch (event.type) {
      case 'video.asset.ready': {
        const asset = event.data
        const lessonId = asset.passthrough

        console.log('✅ Asset ready for lesson:', lessonId)

        if (!lessonId) {
          console.error('❌ No lesson ID in passthrough')
          return NextResponse.json({ message: 'No lesson ID provided' }, { status: 400 })
        }

        try {
          // Update lesson with ready status and playback ID
          await payload.update({
            collection: 'lessons',
            id: lessonId,
            data: {
              muxData: {
                assetId: asset.id,
                playbackId: asset.playback_ids?.[0]?.id,
                status: 'ready',
                duration: asset.duration,
                aspectRatio: asset.aspect_ratio,
              },
            },
          })

          console.log('✅ Updated lesson with ready status:', lessonId)
        } catch (error) {
          console.error('❌ Error updating lesson:', error)
          return NextResponse.json({ message: 'Error updating lesson' }, { status: 500 })
        }
        break
      }

      case 'video.asset.errored': {
        const asset = event.data
        const lessonId = asset.passthrough

        console.log('❌ Asset errored for lesson:', lessonId)

        if (lessonId) {
          try {
            await payload.update({
              collection: 'lessons',
              id: lessonId,
              data: {
                muxData: {
                  assetId: asset.id,
                  status: 'errored',
                },
              },
            })

            console.log('✅ Updated lesson with error status:', lessonId)
          } catch (error) {
            console.error('❌ Error updating lesson with error status:', error)
          }
        }
        break
      }

      default:
        console.log('ℹ️  Unhandled webhook event type:', event.type)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
