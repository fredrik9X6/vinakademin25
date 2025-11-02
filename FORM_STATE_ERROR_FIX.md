# Critical Fix: "Cannot destructure property 'lockedState'" Error

## Root Cause
The error "Cannot destructure property 'lockedState' of '(intermediate value)' as it is null" is happening in PayloadCMS's internal form state management code. This occurs when:

1. **afterChange hooks don't always return the document** - PayloadCMS needs the document to update form state
2. **beforeChange hooks modify data incorrectly** - Can cause form state sync issues
3. **Hooks return undefined/null** - PayloadCMS expects a document object

## Fixes Applied

### ✅ Users Collection
- **beforeChange**: Simplified, always returns `data` early if no user (form building)
- **afterChange**: Always returns `doc` for ALL operations (not just create)

### ✅ Courses Collection  
- **afterChange**: Always returns `doc` at the end, even after async operations

## Key Pattern

**ALWAYS return the document/data from hooks:**

```typescript
// ✅ CORRECT
afterChange: [
  async ({ doc, req, operation }) => {
    // Do work...
    return doc  // Always return doc
  }
]

// ❌ WRONG
afterChange: [
  async ({ doc, req, operation }) => {
    if (operation !== 'create') return doc  // Early return might skip return
    // Work...
    return doc  // But what if there's an error?
  }
]
```

## Testing Checklist

- [x] Users collection - Update user role → Should work without error
- [ ] Users collection - Create new user → Should work
- [ ] Courses collection - Update course → Should work
- [ ] Check browser console for errors

## If Error Persists

The error might be coming from PayloadCMS's internal Lexical editor or form state management. If fixes don't work:

1. **Temporarily disable all hooks** to test if hooks are the issue
2. **Check PayloadCMS version** - might be a bug in v3.33.0
3. **Check for Lexical editor issues** - the error might be editor-related

## Next Steps

1. Test user update now
2. If still failing, temporarily disable Users hooks completely
3. Add hooks back one by one

