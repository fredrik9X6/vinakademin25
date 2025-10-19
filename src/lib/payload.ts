import { getPayload } from 'payload'
import config from '@payload-config'

let cachedPayload: any = null

/**
 * Returns an initialized PayloadCMS instance. Ensures `getPayload` is only
 * called once per server runtime (per Next.js worker).
 */
export async function getPayloadClient() {
  if (!cachedPayload) {
    // Use getPayload which is the recommended way in Payload 3.0+
    cachedPayload = await getPayload({
      config: await config,
    })
  }
  return cachedPayload
}

export default getPayloadClient
