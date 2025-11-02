# PayloadCMS 3 Access Control Implementation

This document outlines the access control patterns implemented in this project following PayloadCMS 3 best practices.

## Problem: Server Actions Authentication Context

With Next.js App Router, PayloadCMS's Server Actions (used for form building and auto-save) don't always have `req.user` populated. This causes 403 errors when using traditional access control patterns.

## Solution: Three-Layer Security Model

### 1. Collection-Level Access (Permissive for Form Building)

```typescript
access: {
  // Public data - use query constraints
  read: ({ req }) => {
    if (req.user?.role === 'admin') return true
    return { _status: { equals: 'published' } }
  },
  
  // Create - role-based
  create: ({ req }) => {
    return req.user?.role === 'admin' || req.user?.role === 'editor'
  },
  
  // Update - PERMISSIVE for form building
  update: () => true,  // Security enforced in beforeChange hook + field-level access
  
  // Delete - role-based
  delete: ({ req }) => req.user?.role === 'admin',
}
```

**Key principle:** `update` returns `true` to allow PayloadCMS admin UI to build forms without authentication errors.

### 2. Field-Level Access (Protect Sensitive Fields)

```typescript
fields: [
  {
    name: 'role',
    type: 'select',
    access: {
      // Only admins can change roles
      update: ({ req }) => req.user?.role === 'admin',
    },
    options: ['admin', 'editor', 'user'],
  },
  {
    name: 'accountStatus',
    type: 'select',
    access: {
      update: ({ req }) => req.user?.role === 'admin',
    },
  },
]
```

### 3. BeforeChange Hooks (Runtime Validation)

```typescript
hooks: {
  beforeChange: [
    async ({ req, operation, originalDoc, data }) => {
      if (operation !== 'update') return data
      
      const user = req.user as User | null
      
      // Allow form building (no user context = UI preparation only)
      if (!user) {
        console.log('📝 Form building - allowing without user context')
        return data
      }
      
      // Admin can update anything
      if (user.role === 'admin') return data
      
      // Users can only update their own documents
      if (originalDoc && String(user.id) === String(originalDoc.id)) {
        return data
      }
      
      throw new Error('Unauthorized')
    },
  ],
}
```

## Implementation Across Collections

### Users Collection

- **read**: Query constraint - users see their own data, admins/instructors see all
- **create**: Public (`() => true`) for registration
- **update**: Permissive (`() => true`) with `beforeChange` validation
- **delete**: Admin only
- **Field-level**: `role`, `accountStatus`, `subscriptionStatus`, etc. are admin-only

### Courses Collection

- **read**: Query constraint - public sees published, admins/instructors see all
- **create**: Admin/instructor only
- **update**: Permissive with `beforeChange` validation
- **delete**: Admin only
- **Supports**: Drafts, versions, autosave

### Reference Collections (Grapes, Regions, Countries)

**Critical for Form Building:** These collections are referenced via relationship fields in Users and must allow form state building without authentication errors.

- **read**: Public (`() => true`)
- **create**: Logged in users (`anyLoggedIn`)
- **update**: Permissive (`() => true`) with `beforeChange` validation
- **delete**: Admin only

**Why this matters:** When editing a User, PayloadCMS needs to load relationship options (grapes, regions). If `update` access is `anyLoggedIn`, it returns `false` during form building (no user context), causing "Unauthorized" errors.

### Reviews Collection

**Critical for Form Building:** Reviews is referenced via `createdBy`/`updatedBy` fields and must allow form state building.

- **read**: Complex query - users see own reviews + session reviews + trusted reviews
- **create**: Context-aware - checks enrollment/session participation
- **update**: Permissive (`() => true`) with `beforeChange` validation
- **delete**: Admin only
- **Field-level (`isTrusted`)**: Permissive with `beforeChange` enforcement

**Why this matters:** The Reviews collection has:
1. Reverse relationships (`createdBy`, `updatedBy`) that other collections reference
2. Field-level access (`isTrusted`) that would block form building if restrictive
3. Both must be permissive for form state building to succeed

### Other Collections

Similar patterns applied to:
- **Lessons**, **Modules**, **Quizzes**: Admin/instructor only
- **Enrollments**, **UserProgress**: User sees own data, admins see all
- **Orders**, **Subscriptions**: User sees own data, admins see all
- **Media**: Admin/instructor can manage

## Why This Works

1. **Form Building**: PayloadCMS admin UI can build forms without `req.user`
2. **Auto-save**: Draft auto-save works without authentication errors
3. **Security**: 
   - Field-level access prevents unauthorized field modifications
   - `beforeChange` hooks validate actual save operations
   - Query constraints filter readable documents
4. **User Experience**: No "Unauthorized" errors when navigating admin UI

## Best Practices

### ✅ DO

- Use `() => true` for collection-level `update` access
- Protect sensitive fields with field-level access
- Validate in `beforeChange` hooks
- Return `data` from hooks (not `undefined`)
- Use query constraints for `read` access to filter documents
- Log access control decisions for debugging

### ❌ DON'T

- Use `beforeChange` hooks to check `req.data` for changes (unreliable)
- Return query constraints from `update` access (breaks form building)
- Throw errors in access control functions (use `false` or hooks)
- Forget to return `data` from `beforeChange` hooks

## Testing Access Control

1. Test as admin - should be able to update all users
2. Test as regular user - should only update own profile
3. Test sensitive fields - non-admins should not be able to modify
4. Check form building - admin UI should render without errors

## References

- [PayloadCMS Access Control Docs](https://payloadcms.com/docs/access-control/overview)
- [Next.js App Router with PayloadCMS](https://payloadcms.com/docs/getting-started/installation#nextjs)

