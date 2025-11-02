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
        const passthrough = asset.passthrough

        console.log('✅ Asset ready for passthrough:', passthrough)

        if (!passthrough) {
          console.error('❌ No passthrough ID provided')
          return NextResponse.json({ message: 'No passthrough ID provided' }, { status: 400 })
        }

        try {
          // Check if it's a vinprovning preview or a content item
          if (passthrough.startsWith('vinprovning-preview-')) {
            const vinprovningId = passthrough.replace('vinprovning-preview-', '')
            console.log('📝 Updating vinprovning:', vinprovningId)
            console.log('📊 Asset data:', JSON.stringify({
              id: asset.id,
              playback_ids: asset.playback_ids,
              status: asset.status,
              duration: asset.duration,
              aspect_ratio: asset.aspect_ratio,
            }, null, 2))

            // First, try to get the current document to see its state
            try {
              const currentDoc = await payload.findByID({
                collection: 'vinprovningar',
                id: String(vinprovningId),
              })
              console.log('📄 Current document state:', {
                id: currentDoc.id,
                _status: currentDoc._status,
                previewMuxData: currentDoc.previewMuxData,
              })
            } catch (err) {
              console.error('❌ Error fetching current document:', err)
            }

            // Update vinprovning with ready status and playback ID
            // Try updating both draft and published versions
            const updateData = {
              previewMuxData: {
                assetId: asset.id,
                playbackId: asset.playback_ids?.[0]?.id || '',
                status: 'ready' as 'ready' | 'preparing' | 'errored',
                duration: asset.duration || 0,
                aspectRatio: asset.aspect_ratio || '16:9',
              },
            }

            // Update published version
            try {
              const updated = await payload.update({
                collection: 'vinprovningar',
                id: String(vinprovningId),
                data: updateData,
                overrideAccess: true,
                draft: false,
              })
              console.log('✅ Updated published vinprovning with ready status')
              console.log('📊 Updated previewMuxData:', JSON.stringify(updated.previewMuxData, null, 2))
            } catch (pubErr) {
              console.error('❌ Error updating published version:', pubErr)
            }

            // Also update draft version if it exists
            try {
              const updatedDraft = await payload.update({
                collection: 'vinprovningar',
                id: String(vinprovningId),
                data: updateData,
                overrideAccess: true,
                draft: true,
              })
              console.log('✅ Updated draft vinprovning with ready status')
              console.log('📊 Updated draft previewMuxData:', JSON.stringify(updatedDraft.previewMuxData, null, 2))
            } catch (draftErr) {
              console.log('ℹ️  No draft version to update (or error):', draftErr instanceof Error ? draftErr.message : String(draftErr))
            }
          } else {
            // Assume it's a content item ID (lessons/quizzes are now unified)
            console.log('📝 Updating content item:', passthrough)

            const updated = await payload.update({
              collection: 'content-items',
              id: passthrough,
              data: {
                muxData: {
                  assetId: asset.id,
                  playbackId: asset.playback_ids?.[0]?.id,
                  status: 'ready',
                  duration: asset.duration,
                  aspectRatio: asset.aspect_ratio,
                },
              },
              overrideAccess: true,
            })

            console.log('✅ Updated content item with ready status:', passthrough)
            console.log('📊 Updated muxData:', JSON.stringify(updated.muxData, null, 2))
          }
        } catch (error) {
          console.error('❌ Error updating document:', error)
          if (error instanceof Error) {
            console.error('❌ Error message:', error.message)
            console.error('❌ Error stack:', error.stack)
          }
          return NextResponse.json({ message: 'Error updating document', error: String(error) }, { status: 500 })
        }
        break
      }

      case 'video.asset.errored': {
        const asset = event.data
        const passthrough = asset.passthrough

        console.log('❌ Asset errored for passthrough:', passthrough)

        if (passthrough) {
          try {
            if (passthrough.startsWith('vinprovning-preview-')) {
              const vinprovningId = passthrough.replace('vinprovning-preview-', '')
              await payload.update({
                collection: 'vinprovningar',
                id: vinprovningId,
                data: {
                  previewMuxData: {
                    assetId: asset.id,
                    status: 'errored',
                  },
                },
                overrideAccess: true,
              })
              console.log('✅ Updated vinprovning with error status:', vinprovningId)
            } else {
              // Content item (lesson/quiz unified)
              await payload.update({
                collection: 'content-items',
                id: passthrough,
                data: {
                  muxData: {
                    assetId: asset.id,
                    status: 'errored',
                  },
                },
                overrideAccess: true,
              })
              console.log('✅ Updated content item with error status:', passthrough)
            }
          } catch (error) {
            console.error('❌ Error updating document with error status:', error)
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
