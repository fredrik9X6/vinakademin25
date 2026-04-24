# Admin Panel Protection & Field-Level Access Control

## Context

Any authenticated user can currently access the PayloadCMS admin panel at `/admin`. The project has a middleware gate in `src/middleware.ts` that attempts to redirect non-admin users, but PayloadCMS renders server-side and can bypass Next.js middleware. The root cause: the Users collection lacks a `access.admin` function, which is PayloadCMS's built-in mechanism for restricting admin panel access.

Additionally, six sensitive fields on the Users collection (`role`, `isVerified`, `accountStatus`, `subscriptionStatus`, `subscriptionPlan`, `subscriptionExpiry`) have no field-level access control. A user could theoretically escalate privileges via the REST API by patching their own role or subscription fields.

## Goal

1. Only users with `role === 'admin'` can access the admin panel
2. Sensitive user fields can only be modified by admins (or admins/instructors for `isVerified`)

## Design

### 1. Admin Panel Access Gate

Add `admin: isAdmin` to the Users collection `access` block in `src/collections/Users.ts`.

PayloadCMS checks this function server-side before rendering the admin panel. When it returns `false`, the user sees Payload's built-in "Unauthorized" screen. This cannot be bypassed by client-side navigation or middleware timing issues.

**Reuses existing helper:** `isAdmin` from `src/lib/access.ts` (line 8).

### 2. Field-Level Access Controls

Uncomment and activate field-level `update` access on six fields in `src/collections/Users.ts`, using existing helpers from `src/lib/access.ts`:

| Field | Line | Access Rule | Helper |
|---|---|---|---|
| `role` | ~338 | Admin only | `adminFieldLevel` |
| `isVerified` | ~371 | Admin or instructor | `adminOrInstructorFieldLevel` |
| `accountStatus` | ~385 | Admin only | `adminFieldLevel` |
| `subscriptionStatus` | ~414 | Admin only | `adminFieldLevel` |
| `subscriptionPlan` | ~450 | Admin only | `adminFieldLevel` |
| `subscriptionExpiry` | ~477 | Admin only | `adminFieldLevel` |

Field-level access in PayloadCMS 3 requires boolean return values (not `Where` query constraints). All listed helpers already return `boolean`.

## Files Modified

- `src/collections/Users.ts` — add `admin` access + activate 6 field-level access controls
- `src/lib/access.ts` — no changes (all helpers already exist)

## What Is NOT Changing

- The existing middleware admin gate in `src/middleware.ts` stays as-is
- All other collection-level access controls remain unchanged
- The Payload login screen at `/admin` still renders for unauthenticated users
- Frontend auth flow and `/profil` page are unaffected
- Users can still update their own non-sensitive profile fields (name, bio, preferences)

## Verification

1. **Admin access**: Log in as an admin user → navigate to `/admin` → should see full dashboard
2. **Non-admin blocked**: Log in as a regular user → navigate to `/admin` → should see Payload "Unauthorized" screen
3. **Field protection via API**: As a regular user, attempt `PATCH /api/users/:id` with `{ "role": "admin" }` → should be rejected (field not writable)
4. **Frontend unaffected**: Register a new user → update profile at `/profil` → should work normally
5. **Instructor access to isVerified**: Log in as an instructor → verify the `isVerified` field is editable in admin (if instructor has admin access) or via API
