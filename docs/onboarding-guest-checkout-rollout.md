# Guest Checkout & Onboarding Rollout

## Feature Flag

- `ENABLE_GUEST_CHECKOUT=true` enables guest checkout on the server.
- `NEXT_PUBLIC_ENABLE_GUEST_CHECKOUT=true` enables guest checkout UI input fields on the client.

Set both values in Railway/Vercel for full activation.

## Funnel Events (logs)

The implementation emits structured logs for monitoring:

- `[checkout_funnel] checkout_started`
- `[checkout_funnel] checkout_completed`
- `[checkout_funnel] account_claimed_email_sent`
- `[onboarding_funnel] onboarding_started`
- `[onboarding_funnel] onboarding_completed`
- `[onboarding_funnel] onboarding_skipped`

## Manual Test Coverage

### 1) Authenticated Checkout (regression)

1. Log in.
2. Buy a wine tasting.
3. Verify enrollment is created and success page shows course access actions.

### 2) Guest Checkout New Email

1. Ensure `ENABLE_GUEST_CHECKOUT` and `NEXT_PUBLIC_ENABLE_GUEST_CHECKOUT` are both `true`.
2. Open checkout while logged out.
3. Enter guest email and complete payment.
4. Verify:
   - order is completed,
   - enrollment is created,
   - receipt email is sent,
   - forgot-password/claim email is sent.

### 3) Guest Checkout Existing Account Email

1. Logged out, purchase with an email that already has a user account.
2. Verify no duplicate user is created.
3. Verify enrollment is created for the existing user.

### 4) Webhook Idempotency

1. Replay the same `checkout.session.completed` event.
2. Verify no duplicate enrollment/order side effects.

### 5) Onboarding Wizard

1. Login with a user that has no `onboarding.completedAt` and no `onboarding.skippedAt`.
2. Confirm redirect to `/onboarding`.
3. Complete onboarding and verify preferences are saved.
4. Repeat with skip and verify `onboarding.skippedAt` is set.

