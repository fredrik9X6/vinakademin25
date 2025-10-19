import { config } from 'dotenv'
import { syncAllCoursesWithStripe } from '../src/lib/stripe-products'

// Load environment variables
config({ path: '.env.local' })

async function main() {
  try {
    console.log('🔄 Syncing all courses with Stripe...')
    await syncAllCoursesWithStripe()
    console.log('✅ Successfully synced all courses with Stripe!')
  } catch (error) {
    console.error('❌ Error syncing courses with Stripe:', error)
    process.exit(1)
  }
}

main()
