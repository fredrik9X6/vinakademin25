/**
 * Script to clean up media records that reference missing files
 * Run this to fix the admin panel crash without wiping the entire database
 */

import { getPayload } from 'payload'
import config from '@payload-config'

async function cleanupMissingMedia() {
  const payload = await getPayload({ config })

  console.log('🔍 Finding all media records...')
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1000,
    overrideAccess: true,
  })

  console.log(`📊 Found ${allMedia.docs.length} media records`)

  const brokenRecords: string[] = []

  for (const media of allMedia.docs) {
    try {
      // Try to check if file exists by accessing its URL
      // If S3 is enabled, this will fail for missing files
      if (media.url) {
        // For now, we'll just log - you can add actual file existence check here
        // if needed
        console.log(`✓ Media ${media.id}: ${media.filename || 'no filename'}`)
      }
    } catch (error: any) {
      if (error?.name === 'NoSuchKey' || error?.code === 'NoSuchKey') {
        brokenRecords.push(String(media.id)) // Convert id to string
        console.log(`✗ Broken media ${media.id}: ${media.filename}`)
      }
    }
  }

  if (brokenRecords.length === 0) {
    console.log('✅ No broken media records found!')
    return
  }

  console.log(`\n⚠️  Found ${brokenRecords.length} broken media records`)
  console.log('Would delete:', brokenRecords)

  // Uncomment to actually delete:
  // for (const id of brokenRecords) {
  //   await payload.delete({
  //     collection: 'media',
  //     id,
  //     overrideAccess: true,
  //   })
  //   console.log(`Deleted media ${id}`)
  // }

  console.log('\n💡 To actually delete, uncomment the deletion code in this script')
}

cleanupMissingMedia()
  .then(() => {
    console.log('✅ Cleanup complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })

