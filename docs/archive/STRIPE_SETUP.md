# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for payment processing in the Vinakademin application.

## Prerequisites

1. **Stripe Account**: Create a free account at [stripe.com](https://stripe.com)
2. **Stripe CLI**: Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) for webhook testing

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Stripe Configuration
# Get these from your Stripe Dashboard: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Getting Your API Keys

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com
2. **Navigate to API Keys**: In the left sidebar, click "Developers" → "API keys"
3. **Copy Keys**:
   - **Publishable key**: Starts with `pk_test_` (for test mode)
   - **Secret key**: Starts with `sk_test_` (for test mode)

### Setting Up Webhooks

Webhooks are essential for handling payment events and keeping your application in sync with Stripe.

#### For Local Development:

1. **Install Stripe CLI** (if not already installed):
   ```bash
   # macOS (using Homebrew)
   brew install stripe/stripe-cli/stripe
   
   # Or download from: https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```

3. **Forward webhook events to your local server**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Copy the webhook signing secret** from the CLI output (starts with `whsec_`)

#### For Production:

1. **Go to Stripe Dashboard** → "Developers" → "Webhooks"
2. **Click "Add endpoint"**
3. **Enter your endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
4. **Select events to listen for**:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Copy the webhook signing secret**

## Stripe Dashboard Configuration

### 1. Enable Payment Methods

In your Stripe Dashboard:

1. **Go to Settings** → "Payment methods"
2. **Enable these payment methods for Swedish market**:
   - **Cards**: Visa, Mastercard, American Express
   - **Klarna**: Popular in Sweden for "buy now, pay later"

### 2. Configure Customer Portal

The customer portal allows users to manage their subscriptions:

1. **Go to Settings** → "Billing" → "Customer portal"
2. **Configure features**:
   - ✅ Update payment methods
   - ✅ View invoice history
   - ✅ Cancel subscriptions
   - ✅ Pause subscriptions

### 3. Tax Configuration (Important for Sweden)

Sweden has VAT requirements:

1. **Go to Settings** → "Tax"
2. **Enable automatic tax calculation**
3. **Add tax registrations** for Sweden (25% VAT)

## Test Cards

Use these test card numbers during development:

```
# Successful payments
4242424242424242 (Visa)
5555555555554444 (Mastercard)

# Declined payments
4000000000000002 (Generic decline)
4000000000009995 (Insufficient funds)

# 3D Secure authentication
4000000000003220 (Requires authentication)

# Klarna test
Test Klarna in Sweden using any valid Swedish personal number
```

## Currency Configuration

The application is configured for Swedish market:

- **Primary currency**: SEK (Swedish Krona)
- **Amount formatting**: Handled automatically (1 SEK = 100 öre)
- **Locale formatting**: Swedish format (`sv-SE`)

## Security Notes

⚠️ **Important Security Considerations**:

1. **Never expose secret keys** in frontend code
2. **Always validate webhook signatures** to prevent fraud
3. **Use HTTPS in production** for all payment-related endpoints
4. **Implement proper authentication** before processing payments
5. **Log all payment events** for audit trails

## Development Workflow

1. **Start your Next.js application**:
   ```bash
   npm run dev
   ```

2. **In another terminal, start Stripe webhook forwarding**:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

3. **Test payments** using the test card numbers above

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Check that your keys are correctly set in `.env.local`
2. **Webhook signature verification failed**: Ensure webhook secret is correct
3. **Payment method not available**: Check that the payment method is enabled in Stripe Dashboard
4. **Tax calculation errors**: Verify tax settings in Stripe Dashboard

### Debug Mode:

Enable debug logging by setting:
```bash
DEBUG=stripe*
```

## Next Steps

After completing this setup:

1. ✅ **Subtask 7.1 Complete**: Stripe setup and configuration
2. 🔄 **Next**: Subtask 7.2 - Configure Stripe products and pricing
3. 🔄 **Then**: Subtask 7.3 - Create PayloadCMS collections for orders

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe CLI Reference](https://stripe.com/docs/stripe-cli)
- [Swedish Market Guide](https://stripe.com/guides/atlas/sweden)
- [Klarna Integration](https://stripe.com/docs/payments/klarna) 