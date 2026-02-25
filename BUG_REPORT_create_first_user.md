# Bug Report: Create First User Access Control Error

## Summary
The PayloadCMS "Create First User" functionality is blocked by an access control error, preventing initial setup of the admin panel.

## Environment
- Next.js + PayloadCMS v3.33.0
- Development server running at `localhost:3000`
- Fresh database with no existing users

## Steps to Reproduce
1. Navigate to `http://localhost:3000/admin`
2. The app redirects to `http://localhost:3000/admin/create-first-user`
3. Fill in the "Create first user" form with:
   - Email: `admin@example.com`
   - New Password: `Admin123!`
   - Confirm Password: `Admin123!`
4. Scroll down and click the "Create" button
5. **Error appears**: "You are not allowed to perform this action"

## Expected Behavior
The first user should be created successfully without any authentication/authorization requirements, and the user should be redirected to the admin dashboard.

## Actual Behavior
The form submission is blocked with an access control error: "You are not allowed to perform this action"

##Root Cause Analysis

### Users Collection Access Control (src/collections/Users.ts)
```typescript
access: {
  // ... other access rules ...
  
  // Anyone can create a user (register)
  create: () => true,  // Line 282
  
  // Allow update for form building - security handled in hooks
  update: () => true,  // Line 284
  
  // ... other access rules ...
},
```

The access control configuration explicitly allows all create operations (`create: () => true`), which should permit the first user creation.

### Possible Causes
1. **PayloadCMS v3 create-first-user Route**: The `/admin/create-first-user` route may have additional access control logic that overrides the collection-level access control.

2. **Middleware or Custom Access Control**: There may be custom middleware or global access control settings in the payload.config.ts that are blocking the operation.

3. **Hooks**: The commented-out `beforeChange` hook (lines 734-752 in Users.ts) was previously enforcing additional restrictions. While currently disabled, there may be other hooks or validation logic causing the issue.

4. **Form State Management**: The error may be related to PayloadCMS's form state management and the "lockedState" errors mentioned in code comments.

## Impact
- **Critical**: Prevents initial setup of the application
- **Blocks**: All admin panel functionality
- **Affects**: Development environment setup and onboarding

## Workaround
Currently no workaround available through the UI. Possible alternatives:
1. Create a user directly via database seed script
2. Use PayloadCMS Local API to create a user programmatically
3. Bypass access control temporarily for development

## Recommended Fix
1. Review the create-first-user route implementation in PayloadCMS
2. Check for any global access control or middleware that might be interfering
3. Add explicit access control bypass for the create-first-user operation
4. Consider adding logging to the access control functions to debug the rejection

## Testing Notes
- Dev server is running and responsive
- The form loads correctly with all fields
- All frontend routing works (redirects to create-first-user when no users exist)
- The issue is specifically with the form submission/create operation

## Date Reported
2026-02-25

## Branch
`cursor/development-environment-setup-20f1`
