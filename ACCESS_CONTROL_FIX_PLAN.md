# Access Control Fix Plan - "Cannot destructure property 'state'" Error

## Problem
Persistent error: **"Cannot destructure property 'state' of '(intermediate value)' as it is null"**

This error occurs during PayloadCMS form building, likely in hooks that improperly access data structures.

## Root Causes Identified

1. **Incorrect `req.data` usage in hooks** - PayloadCMS v3 hooks receive `data` directly, not `req.data`
   - ✅ FIXED: `Courses.ts` beforeChange hook

2. **Hooks that don't handle null/undefined safely during form building**
   - Form building operations may pass null/undefined values

3. **Complex hooks that try to access properties that don't exist during form building**

## Solution Plan

### Phase 1: Fix Immediate Issues ✅

1. ✅ **Fixed Courses.ts hook** - Removed `req.data` usage
2. 🔄 **Review all hooks** - Check for unsafe destructuring
3. 🔄 **Simplify hooks** - Ensure all hooks return data safely

### Phase 2: Simplify Hooks (In Progress)

For each collection with hooks:

1. **beforeChange hooks**: 
   - Always return `data` parameter
   - Early return if no user (form building)
   - Never access `req.data` (use `data` parameter instead)
   - Never destructure without null checks

2. **afterChange hooks**:
   - Always return `doc` parameter
   - Handle null/undefined safely

3. **Field-level hooks**:
   - Currently disabled (commented out)
   - Will add back one by one after collections work

### Phase 3: Testing Strategy

1. **Test each collection individually**:
   - Open in admin UI
   - Try to create/edit a document
   - Check console for errors

2. **Collections to test in order**:
   - Users (most critical)
   - Courses
   - Reviews
   - Media
   - All others

3. **Minimal test collection**:
   - Create a simple test collection with no hooks
   - Verify form building works
   - Add hooks one by one

### Phase 4: Gradual Re-enablement

After everything works:

1. **Re-enable field-level access controls** (one at a time)
2. **Add back complex hooks** (if needed)
3. **Add validation logic** (if needed)

## Files to Review/Update

### Critical (Do First):
- ✅ `src/collections/Courses.ts` - FIXED
- 🔄 `src/collections/Users.ts` - Review hooks
- 🔄 `src/collections/Reviews.ts` - Review hooks
- 🔄 `src/lib/hooks.ts` - Ensure safe defaults

### Secondary:
- All other collections with hooks
- Check for any `req.data` usage
- Check for unsafe destructuring

## Safe Hook Pattern

```typescript
beforeChange: [
  async ({ req, operation, data, originalDoc }) => {
    // Always return data early if form building
    if (!req.user) return data
    
    // Only validate actual operations
    if (operation !== 'update' && operation !== 'create') return data
    
    // Validate logic here
    // ...
    
    // Always return data at the end
    return data
  },
]
```

## Next Steps

1. ✅ Fix Courses.ts hook
2. Review Users.ts hooks for safety
3. Review Reviews.ts hooks for safety
4. Test Users collection form building
5. Test Courses collection form building
6. If still failing, temporarily disable all hooks
7. Add hooks back one by one

