import { config } from 'dotenv'
import { getPayload } from 'payload'
import payloadConfig from '../src/payload.config.js'

// Load environment variables
config({ path: '.env.local' })

async function updateCourseStripeIds() {
  try {
    console.log('🔄 Updating course Stripe IDs...')

    const payload = await getPayload({ config: payloadConfig })

    // Find the existing "Vinprovning 101" course
    const courses = await payload.find({
      collection: 'courses',
      where: {
        title: { equals: 'Vinprovning 101' },
      },
      limit: 1,
    })

    if (courses.docs.length > 0) {
      const course = courses.docs[0]

      // Update with the existing Stripe product and price IDs
      await payload.update({
        collection: 'courses',
        id: course.id,
        data: {
          stripeProductId: 'prod_SkyXrToPEgGgmo',
          stripePriceId: 'price_1RpSacPTy61KUOOsdV83aCKY',
        },
      })

      console.log(`✅ Updated course "${course.title}" with Stripe IDs`)
      console.log(`  Product ID: prod_SkyXrToPEgGgmo`)
      console.log(`  Price ID: price_1RpSacPTy61KUOOsdV83aCKY`)
    } else {
      console.log('❌ Course "Vinprovning 101" not found')
    }
  } catch (error) {
    console.error('❌ Error updating course Stripe IDs:', error)
    process.exit(1)
  }
}

updateCourseStripeIds()
