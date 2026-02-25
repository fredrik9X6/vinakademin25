import Mux from '@mux/mux-node'

// Only initialize Mux if environment variables are present
const mux =
  process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET
    ? new Mux({
        tokenId: process.env.MUX_TOKEN_ID,
        tokenSecret: process.env.MUX_TOKEN_SECRET,
      })
    : null

export const uploadVideoToMux = async (videoUrl: string, lessonId: string) => {
  if (!mux) {
    throw new Error(
      'Mux is not configured. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables.',
    )
  }

  try {
    const asset = await mux.video.assets.create({
      inputs: [{ url: videoUrl }],
      passthrough: lessonId,
      playback_policy: ['public'],
      encoding_tier: 'smart',
    })

    return asset
  } catch (error) {
    console.error('Error uploading video to Mux:', error)
    throw error
  }
}

export const createDirectUpload = async (passthrough: string, corsOrigin: string) => {
  if (!mux) {
    throw new Error(
      'Mux is not configured. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables.',
    )
  }

  try {
    const upload = await mux.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policies: ['public'],
        encoding_tier: 'smart',
        passthrough,
      },
      timeout: 3600,
    })

    return upload
  } catch (error) {
    console.error('Error creating Mux direct upload:', error)
    throw error
  }
}

export const deleteAssetFromMux = async (assetId: string) => {
  if (!mux) {
    throw new Error(
      'Mux is not configured. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET environment variables.',
    )
  }

  try {
    await mux.video.assets.delete(assetId)
  } catch (error) {
    console.error('Error deleting asset from Mux:', error)
    throw error
  }
}

export default mux
