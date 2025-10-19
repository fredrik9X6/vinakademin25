# Subscription & Payment Management System

This document outlines the subscription and payment management system implemented for Vinakademin.

## Overview

The subscription system provides users with comprehensive tools to manage their subscriptions, payment methods, and billing history. It's designed to integrate seamlessly with Stripe for payment processing.

## Components

### Frontend Components

#### 1. SubscriptionManagementForm (`src/components/profile/SubscriptionManagementForm.tsx`)
A comprehensive component that handles:

- **Current Subscription Display**: Shows subscription status, plan details, billing cycle
- **Payment Methods Management**: View, add, remove, and set default payment methods
- **Billing History**: View past invoices with download capability
- **Billing Information**: Update contact and address information
- **Subscription Actions**: Cancel subscription with confirmation dialog

**Features:**
- Swedish localization throughout
- Responsive design (mobile and desktop)
- Loading states and error handling
- Status badges with visual indicators
- Confirmation dialogs for destructive actions

#### 2. User Profile Integration (`src/components/profile/UserProfilePage.tsx`)
- Added as a third tab: "Prenumeration & Betalning"
- Maintains consistent design with existing profile sections
- Responsive tab layout that works on mobile and desktop

### Backend Collections

#### 1. Subscriptions Collection (`src/collections/Subscriptions.ts`)
Comprehensive collection for managing subscription data:

- **Subscription Details**: ID, plan, status, billing periods
- **Payment Processor Integration**: Support for Stripe and other processors
- **Billing Information**: Amount, currency, interval, payment method
- **History Tracking**: Complete audit trail of subscription changes
- **Automatic Hooks**: Updates user subscription status automatically

#### 2. Transactions Collection (`src/collections/Transactions.ts`)
Handles all financial transactions:

- **Transaction Types**: Course purchases, subscription renewals, refunds, etc.
- **Payment Details**: Amount, status, payment method, currency
- **Processor Integration**: Stripe transaction IDs and response data
- **Relationship Mapping**: Links to courses and subscriptions
- **Fee Tracking**: Payment processor fees and net amounts

### Utility Functions

#### Stripe Integration (`src/lib/stripe.ts`)
A comprehensive utility library for Stripe integration:

- **Type Definitions**: Application-specific types that align with Payload collections
- **Data Transformation**: Convert Stripe objects to app-specific formats
- **API Wrappers**: Ready-to-use functions for common Stripe operations
- **Plan Configuration**: Predefined subscription plans with pricing

**Key Functions:**
- `fetchUserSubscription()` - Get user's current subscription
- `fetchUserPaymentMethods()` - Get user's saved payment methods
- `fetchUserInvoices()` - Get billing history
- `cancelSubscription()` - Cancel subscription
- `addPaymentMethod()` - Add new payment method
- `downloadInvoice()` - Download invoice PDF

## Stripe Integration Status

### Current Implementation
- ✅ UI components with mock data
- ✅ Backend collections for data storage
- ✅ Utility functions for API integration
- ✅ Type definitions and data transformation
- ✅ Responsive design and Swedish localization

### Required for Full Stripe Integration

#### 1. Environment Variables
Add to `.env`:
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_STUDENT_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_STUDENT_ANNUAL_PRICE_ID=price_...
```

#### 2. Install Stripe Dependencies
```bash
npm install stripe @stripe/stripe-js
npm install --save-dev @types/stripe
```

#### 3. API Routes Implementation
Create the following API endpoints:

- `POST /api/subscriptions` - Create new subscription
- `GET /api/subscriptions/user/[userId]` - Get user subscription
- `POST /api/subscriptions/[id]/cancel` - Cancel subscription
- `GET /api/payment-methods/user/[userId]` - Get payment methods
- `POST /api/payment-methods` - Add payment method
- `DELETE /api/payment-methods/[id]` - Remove payment method
- `GET /api/invoices/user/[userId]` - Get user invoices
- `GET /api/invoices/[id]/download` - Download invoice
- `POST /api/setup-intent` - Create setup intent for payment methods
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

#### 4. Stripe Configuration
- Set up products and prices in Stripe Dashboard
- Configure webhooks for subscription events
- Set up customer portal (optional)

#### 5. Update Component Integration
- Replace mock data with actual API calls
- Add Stripe Elements for payment method collection
- Implement proper error handling and loading states

## Data Flow

### Subscription Creation
1. User selects plan on pricing page
2. Stripe Checkout or custom form collects payment
3. Webhook creates subscription record in Payload
4. User record updated with subscription status

### Subscription Management
1. User accesses profile subscription tab
2. Component fetches data from API endpoints
3. API endpoints query Stripe and Payload collections
4. User actions trigger API calls to update both systems

### Invoice Generation
1. Stripe automatically generates invoices
2. Webhook handler updates transaction records
3. Users can download invoices via Stripe-hosted URLs

## Security Considerations

- API keys stored securely in environment variables
- Webhook signature verification for all Stripe events
- User access control (users can only see their own data)
- Admin-only access for manual subscription management
- Secure handling of payment method data (never store card details)

## Future Enhancements

- **Plan Upgrades/Downgrades**: Prorated plan changes
- **Discount Codes**: Integration with Stripe coupons
- **Usage-Based Billing**: Metered billing for advanced features
- **Dunning Management**: Automated retry logic for failed payments
- **Analytics Dashboard**: Subscription metrics and reporting
- **Customer Portal**: Stripe-hosted customer portal integration 