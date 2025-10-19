# Payment Debug Guide 🔍

## What Was Wrong

❌ **Environment variable format issues in `.env.local`:**
- Duplicate variable names (`STRIPE_SECRET_KEY=STRIPE_SECRET_KEY=...`)
- Line breaks in the middle of values
- This prevented `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from loading

## Steps to Fix & Test

### 1. ✅ Environment Variables Fixed
I've corrected your `.env.local` file format.

### 2. 🔄 **RESTART YOUR DEV SERVER** (Critical!)

Stop your current `npm run dev` and restart it:

```bash
# Press Ctrl+C to stop current server
# Then restart:
npm run dev
```

**Why?** Next.js only loads environment variables on startup.

### 3. 🧪 Test the Payment Flow

1. **Go to course page**: `/kurser/vinprovning-101`
2. **Click purchase button**
3. **Check the debug info** at bottom of checkout form:
   ```
   Debug: stripe=true, isProcessing=false, clientSecret=true, isInitialized=true
   Button disabled: false
   ```

### 4. 🔍 If Button Still Disabled

**Check browser console (F12)** for errors:

**Expected working flow:**
```
createPaymentIntent: Calling /api/payments/create-payment-intent for course: 1 with method: card
createPaymentIntent: Payment intent clientSecret received.
createPaymentIntent: State updated: clientSecret set, isInitialized true.
```

**Common error messages:**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined` → Restart dev server
- `Failed to create payment intent` → Check server logs
- `Du måste vara inloggad` → Make sure you're logged in

### 5. 🎯 Test Card Details

Use **Stripe test cards**:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Any future date** for expiry
- **Any 3-digit CVC**

### 6. 🚀 Expected Working Flow

1. ✅ Button should be **enabled** (blue, clickable)
2. ✅ Fill in test card `4242 4242 4242 4242`
3. ✅ Click "Betala 149,00 kr"
4. ✅ Should show "Behandlar..." (Processing...)
5. ✅ Payment succeeds → Success page

### 7. 🔧 Still Having Issues?

**Check these in browser console:**

```javascript
// Test if Stripe is loading
console.log('Stripe key:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

// Should show your pk_test_... key
```

**Check server logs** for payment intent creation errors.

## Debug Button State

The button is disabled when **any** of these are false:
- `stripe` - Stripe SDK loaded
- `!isProcessing` - Not currently processing payment  
- `clientSecret` - Payment intent created successfully
- `isInitialized` - Component fully initialized

The checkout form shows exactly which condition is failing in the debug section.

---

🎯 **Most likely fix**: Just restart your dev server after the environment variable fix! 