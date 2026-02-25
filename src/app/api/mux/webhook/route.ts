import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@/payload.config'
import mux from '@/lib/mux'

export async function POST(req: NextRequest) {
  console.log('🔔 Mux webhook received')

  const webhookSecret = process.env.MUX_WEBHOOK_SIGNING_SECRET

  if (!webhookSecret) {
    console.error('❌ MUX_WEBHOOK_SIGNING_SECRET is not configured')
    return NextResponse.json({ message: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!mux) {
    console.error('❌ Mux client is not configured')
    return NextResponse.json({ message: 'Mux not configured' }, { status: 500 })
  }

  try {
    const body = await req.text()

    // Convert NextRequest headers to a plain object for the Mux SDK
    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Verify signature and parse event using the Mux SDK
    // This properly validates the t=timestamp,v1=signature format
    let event: ReturnType<typeof mux.webhooks.unwrap>
    try {
      event = mux.webhooks.unwrap(body, headers, webhookSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
    }

    console.log('📦 Verified webhook event:', event.type, (event.data as any)?.id)

    const payload = await getPayload({ config: configPromise })

    switch (event.type) {
      case 'video.asset.ready': {
        const asset = event.data as any
        const passthrough = asset.passthrough as string | undefined

        if (!passthrough) {
          console.log('ℹ️ Asset ready but no passthrough — skipping')
          break
        }

        console.log('✅ Asset ready:', passthrough)

        if (passthrough.startsWith('vinprovning-preview-')) {
          await updateVinprovningMuxData(payload, passthrough, {
            assetId: asset.id,
            playbackId: asset.playback_ids?.[0]?.id || '',
            status: 'ready' as const,
            duration: asset.duration || 0,
            aspectRatio: asset.aspect_ratio || '16:9',
          })
        } else {
          await updateContentItemMuxData(payload, passthrough, {
            assetId: asset.id,
            playbackId: asset.playback_ids?.[0]?.id || '',
            status: 'ready' as const,
            duration: asset.duration || 0,
            aspectRatio: asset.aspect_ratio || '16:9',
          })
        }
        break
      }

      case 'video.asset.errored': {
        const asset = event.data as any
        const passthrough = asset.passthrough as string | undefined

        if (!passthrough) break

        const errorMsg =
          asset.errors?.messages?.join('; ') ||
          asset.errors?.type ||
          'Video processing failed'

        console.log('❌ Asset errored:', passthrough, errorMsg)

        if (passthrough.startsWith('vinprovning-preview-')) {
          await updateVinprovningMuxData(payload, passthrough, {
            assetId: asset.id,
            status: 'errored' as const,
          })
        } else {
          await updateContentItemMuxData(payload, passthrough, {
            assetId: asset.id,
            status: 'errored' as const,
          })
        }
        break
      }

      case 'video.upload.asset_created': {
        // Direct Upload completed — asset was created and is now processing
        const data = event.data as any
        const assetId = data.asset_id
        const passthrough = data.new_asset_settings?.passthrough as string | undefined

        if (!passthrough || !assetId) break

        console.log('📤 Upload completed, asset created:', passthrough, assetId)

        if (passthrough.startsWith('vinprovning-preview-')) {
          await updateVinprovningMuxData(payload, passthrough, {
            assetId,
            status: 'preparing' as const,
          })
        } else {
          await updateContentItemMuxData(payload, passthrough, {
            assetId,
            status: 'preparing' as const,
          })
        }
        break
      }

      case 'video.upload.errored': {
        const data = event.data as any
        const passthrough = data.new_asset_settings?.passthrough as string | undefined

        if (!passthrough) break

        console.log('❌ Upload errored:', passthrough)

        if (passthrough.startsWith('vinprovning-preview-')) {
          await updateVinprovningMuxData(payload, passthrough, {
            status: 'errored' as const,
          })
        } else {
          await updateContentItemMuxData(payload, passthrough, {
            status: 'errored' as const,
          })
        }
        break
      }

      case 'video.upload.cancelled': {
        const data = event.data as any
        const passthrough = data.new_asset_settings?.passthrough as string | undefined
        if (passthrough) {
          console.log('ℹ️ Upload cancelled:', passthrough)
        }
        break
      }

      default:
        console.log('ℹ️ Unhandled webhook event:', event.type)
    }

    return NextResponse.json({ message: 'Webhook processed successfully' })
  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// ---------- helpers ----------

type MuxDataUpdate = {
  assetId?: string
  playbackId?: string
  status?: 'preparing' | 'ready' | 'errored'
  duration?: number
  aspectRatio?: string
}

async function updateVinprovningMuxData(
  payload: Awaited<ReturnType<typeof getPayload>>,
  passthrough: string,
  data: MuxDataUpdate,
) {
  const vinprovningId = passthrough.replace('vinprovning-preview-', '')

  try {
    // Idempotency: check current state before updating
    const current = await payload.findByID({
      collection: 'vinprovningar',
      id: String(vinprovningId),
      overrideAccess: true,
    })

    const currentMux = current.previewMuxData as MuxDataUpdate | undefined
    if (
      currentMux?.assetId === data.assetId &&
      currentMux?.status === data.status &&
      (data.status !== 'ready' || currentMux?.playbackId === data.playbackId)
    ) {
      console.log('ℹ️ Vinprovning already up to date — skipping')
      return
    }

    const updatePayload = { previewMuxData: data }

    // Update published version
    try {
      await payload.update({
        collection: 'vinprovningar',
        id: String(vinprovningId),
        data: updatePayload,
        overrideAccess: true,
        draft: false,
      })
      console.log('✅ Updated published vinprovning:', vinprovningId)
    } catch (err) {
      console.error('❌ Error updating published vinprovning:', err)
    }

    // Also update draft version if it exists
    try {
      await payload.update({
        collection: 'vinprovningar',
        id: String(vinprovningId),
        data: updatePayload,
        overrideAccess: true,
        draft: true,
      })
      console.log('✅ Updated draft vinprovning:', vinprovningId)
    } catch {
      // Draft may not exist — that's fine
    }
  } catch (error) {
    console.error('❌ Error updating vinprovning:', vinprovningId, error)
  }
}

async function updateContentItemMuxData(
  payload: Awaited<ReturnType<typeof getPayload>>,
  contentItemId: string,
  data: MuxDataUpdate,
) {
  try {
    // Idempotency: check current state before updating
    const current = await payload.findByID({
      collection: 'content-items',
      id: contentItemId,
      overrideAccess: true,
    })

    const currentMux = current.muxData as MuxDataUpdate | undefined
    if (
      currentMux?.assetId === data.assetId &&
      currentMux?.status === data.status &&
      (data.status !== 'ready' || currentMux?.playbackId === data.playbackId)
    ) {
      console.log('ℹ️ Content item already up to date — skipping')
      return
    }

    await payload.update({
      collection: 'content-items',
      id: contentItemId,
      data: { muxData: data },
      overrideAccess: true,
    })
    console.log('✅ Updated content item:', contentItemId)
  } catch (error) {
    console.error('❌ Error updating content item:', contentItemId, error)
  }
}
