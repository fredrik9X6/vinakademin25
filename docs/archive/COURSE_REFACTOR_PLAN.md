# Course Collection Refactoring Plan

## Overview
This document outlines a comprehensive refactoring plan to simplify and improve the course creation process in PayloadCMS v3. The goal is to create a logical, intuitive hierarchy that makes it easy for admins to create wine tastings ("Vinprovningar") through the admin dashboard.

**Note**: Admin dashboard will remain in English for now (using "Wine tasting" instead of "Course"). Localization can be added later.

## Current Issues

### 1. **Naming Confusion**
- Collections use "course" but should be "Vinprovning" (Swedish for wine tasting/training)
- Inconsistent terminology throughout the codebase

### 2. **Hierarchy Problems**
- **Lessons reference Modules** (wrong direction - should be modules reference lessons)
- **Quizzes reference Courses, Modules, AND Lessons** (confusing and redundant)
- **Modules have dual relationships**: 
  - `course` relationship field
  - `contents` blocks field that references lessons/quizzes
- **Courses reference Modules** (correct, but modules should reference lessons/quizzes)

### 3. **Unused/Unclear Collections**
- **ContentTemplates**: Complex collection that doesn't appear to be used in the frontend
- Unclear purpose and no integration with actual course content

### 4. **Inconsistent Fields**
- **Lessons.hasQuiz**: Not needed - quizzes are separate entities
- **Lessons.lessonType**: Includes 'quiz' option but quizzes are separate entities
- **Lessons.module**: Should be removed - lessons should be referenced FROM modules
- **Lessons.order**: Ordering should be handled at the module level
- **Quizzes.course**: Redundant if quizzes are only used within modules
- **Quizzes.module**: Should be the primary relationship
- **Quizzes.lesson**: Confusing - quizzes are not "part of" lessons

### 5. **Admin UX Issues**
- Complex relationships make it hard to understand the structure
- No clear workflow for creating courses
- Difficult to re-use lessons/quizzes across modules/courses

## Proposed Structure

### Hierarchy: Vinprovning → Module → Content Items (Lessons/Quizzes)

```
Vinprovning (Course)
  ├── Basic Info (title, description, price, etc.)
  ├── Modules (ordered array)
  │   ├── Module 1
  │   │   ├── Title & Description
  │   │   └── Content Items (ordered array)
  │   │       ├── Lesson Reference OR
  │   │       └── Quiz Reference
  │   ├── Module 2
  │   └── ...
```

### Key Principles

1. **One-way relationships**: Modules reference Lessons/Quizzes, not the other way around
2. **Reusable content**: Lessons and Quizzes are standalone entities that can be referenced by multiple modules (but modules belong to one Vinprovning)
3. **Explicit ordering**: Order is determined by the array position in Modules
4. **Simple admin flow**: Create Wine tasting → Add Modules → Add Content Items to Modules
5. **One content item = one type**: Each content item is EITHER a lesson OR a quiz, never both
6. **Free preview**: Content items can be marked as free for preview purposes

## Refactored Collections

### 1. Vinprovningar (renamed from Courses)

**Changes:**
- Rename collection from `courses` to `vinprovningar`
- Keep all existing fields except `modules` relationship and `freeItemCount`
- Add `modules` as an ordered array field directly in Vinprovning
- Remove `freeItemCount` (handled at content item level instead)

**Admin Labels:**
- Collection label: "Wine tastings"
- Singular: "Wine tasting"
- Description: "Wine education courses offered on the platform"

**Fields:**
```typescript
{
  // Existing fields
  title, slug, description, fullDescription, featuredImage,
  previewVideoProvider, previewMuxData, previewSourceVideo,
  price, level, duration, isFeatured,
  instructor, tags, stripeProductId, stripePriceId,
  
  // NEW: Ordered modules array (modules belong to this vinprovning)
  modules: {
    type: 'array',
    fields: [
      {
        name: 'module',
        type: 'relationship',
        relationTo: 'modules',
        required: true
      },
      {
        name: 'order',
        type: 'number',
        required: true,
        defaultValue: 0
      }
    ]
  }
  
  // REMOVED:
  // - freeItemCount (handled at content item level)
}
```

### 2. Modules

**Changes:**
- Remove `course` relationship field (modules belong to vinprovning via array)
- Remove `contents` blocks field
- Add `contentItems` as an ordered array field
- Modules belong to one Vinprovning (not reusable across multiple)

**Admin Labels:**
- Collection label: "Modules"
- Description: "Course modules that contain lessons and quizzes"

**Fields:**
```typescript
{
  title: string (required)
  description: textarea
  order: number (default: 0) // For ordering within a vinprovning
  
  // NEW: Ordered content items array
  // Each item is EITHER a lesson OR a quiz
  contentItems: {
    type: 'array',
    fields: [
      {
        name: 'contentType',
        type: 'select',
        options: ['lesson', 'quiz'],
        required: true
      },
      {
        name: 'lesson',
        type: 'relationship',
        relationTo: 'lessons',
        required: true,
        condition: (data) => data.contentType === 'lesson'
      },
      {
        name: 'quiz',
        type: 'relationship',
        relationTo: 'quizzes',
        required: true,
        condition: (data) => data.contentType === 'quiz'
      },
      {
        name: 'order',
        type: 'number',
        required: true,
        defaultValue: 0
      },
      {
        name: 'isFree',
        type: 'checkbox',
        defaultValue: false,
        admin: {
          description: 'Mark this content item as free preview (accessible without purchase)'
        }
      }
    ]
  }
}
```

**Note**: The `order` field in contentItems determines the sequence. The `isFree` flag marks which items are available for preview.

### 3. Lessons

**Changes:**
- Remove `module` relationship field
- Remove `order` field (ordering handled at module level)
- Remove `hasQuiz` field (not needed)
- Remove `quiz` option from `lessonType` select
- Keep `lessonType` but remove 'quiz' option

**Fields:**
```typescript
{
  // Existing fields to keep
  title, description, content,
  videoProvider, muxData, videoUrl, sourceVideo,
  lessonType, answerKeyReview, status
  
  // REMOVED:
  // - module (relationship)
  // - order (number)
  // - hasQuiz (checkbox)
}
```

### 4. Quizzes

**Changes:**
- Remove `course` relationship field
- Remove `module` relationship field  
- Remove `lesson` relationship field
- Make quizzes standalone and reusable

**Fields:**
```typescript
{
  // Existing fields to keep
  title, description, questions, quizSettings,
  grading, availability, feedback, analytics, status
  
  // REMOVED:
  // - course (relationship)
  // - module (relationship)
  // - lesson (relationship)
}
```

### 5. ContentTemplates

**Decision: Remove Entirely**
- Collection is not used in frontend
- Remove collection entirely from `payload.config.ts`
- Delete `src/collections/ContentTemplates.ts`
- Remove from Payload types

## Migration Strategy

### Phase 1: Delete Old Data & Create New Structure

**No data migration needed** - we only have test data that can be deleted.

1. **Delete old collections** from database:
   - Delete all documents from `courses` collection
   - Delete all documents from `modules` collection (will be recreated)
   - Keep `lessons` and `quizzes` (will be cleaned up but data preserved)

2. **Create refactored collections**:
   - Rename `courses` → `vinprovningar` (in code)
   - Refactor `modules` collection
   - Clean up `lessons` collection (remove fields)
   - Clean up `quizzes` collection (remove fields)
   - Remove `ContentTemplates` collection entirely

### Phase 2: Data Cleanup

1. **Remove old fields** from existing lessons/quizzes:
   - Remove `module` relationship from lessons
   - Remove `order` field from lessons
   - Remove `hasQuiz` field from lessons
   - Remove `course`, `module`, `lesson` relationships from quizzes

2. **Create new wine tastings** manually through admin UI for testing

### Phase 3: Update Frontend

1. **Update API calls** to use new collection names
2. **Update data fetching**:
   - Fetch vinprovning with modules
   - Modules already contain contentItems array
   - No need to separately fetch and group lessons/quizzes
3. **Update components** to use new structure
4. **Update types** (`payload-types.ts`)

### Phase 4: Cleanup

1. **Remove old collections** from `payload.config.ts`
2. **Delete old collection files**
3. **Remove ContentTemplates** (if not used)
4. **Update all references** throughout codebase
5. **Update admin UI** labels and descriptions

## Admin Dashboard Improvements

### New Workflow

1. **Create Wine tasting**
   - Fill out basic info (title, description, price, etc.)
   - Save draft

2. **Add Modules**
   - In Wine tasting edit page, add modules
   - Each module has:
     - Title & Description
     - Content Items array

3. **Add Content Items to Module**
   - For each module, add content items:
     - Select type: Lesson OR Quiz (one type per item)
     - If Lesson: Create new lesson OR select existing
     - If Quiz: Create new quiz OR select existing
     - Mark as free if it should be previewable
   - Reorder items with drag & drop

4. **Free Preview Configuration**
   - Mark individual content items as free using the `isFree` checkbox
   - These items will be accessible without purchase
   - Count is implicit based on how many items are marked free

### UI Improvements

1. **Nested Editing**
   - Allow inline editing of modules within Vinprovning
   - Allow inline editing of content items within modules

2. **Content Library**
   - View all lessons/quizzes in a library
   - Reuse existing lessons/quizzes when adding to modules
   - See which modules use each lesson/quiz

3. **Visual Hierarchy**
   - Clear tree view showing: Wine tasting → Modules → Content Items
   - Drag & drop for reordering
   - Visual indicator for free items (e.g., "FREE" badge)

4. **Bulk Operations**
   - Bulk create lessons/quizzes
   - Bulk assign to modules

## Technical Considerations

### Access Control
- Maintain existing access control patterns
- Update collection names in access control functions

### Hooks
- Update hooks to work with new structure
- Mux video upload hooks stay the same (on Lessons)
- Update module hooks if needed

### API Routes
- Update API routes that reference old collection names
- Update frontend API calls

### Database Indexes
- Add indexes on new relationship fields
- Optimize queries for new structure

### Search & Filtering
- Update search to work with new structure
- Consider full-text search improvements

## Testing Checklist

- [ ] Create new Wine tasting
- [ ] Add modules to Wine tasting
- [ ] Add lessons to modules
- [ ] Add quizzes to modules
- [ ] Mark content items as free
- [ ] Reorder content items
- [ ] Reuse existing lesson/quiz in multiple modules
- [ ] View Wine tasting in frontend
- [ ] Free preview items accessible without purchase
- [ ] Paid items require purchase
- [ ] User progress tracking
- [ ] Quiz attempts
- [ ] Enrollments
- [ ] Mux video uploads
- [ ] Stripe integration
- [ ] Remove ContentTemplates collection

## Rollback Plan

1. Create feature branch for refactoring
2. Test thoroughly before merging
3. Keep git history for easy rollback
4. Test on local development environment first

## Timeline Estimate

- **Phase 1 (Refactor Collections)**: 2-3 days
- **Phase 2 (Data Cleanup)**: 0.5 days (delete old data)
- **Phase 3 (Frontend Updates)**: 3-4 days
- **Phase 4 (Cleanup & Remove ContentTemplates)**: 1 day
- **Testing & Polish**: 2-3 days

**Total**: ~9-12 days (reduced from original estimate due to no migration needed)

## Next Steps

1. **Review and approve** this plan
2. **Create detailed task breakdown** using Task Master
3. **Set up development branch** for refactoring
4. **Begin Phase 1** implementation
5. **Test thoroughly** before merging

## Resolved Questions

1. ✅ **Modules reuse**: No - modules belong to one Wine tasting only
2. ✅ **Free item count**: Handled at content item level with `isFree` checkbox - no need for `freeItemCount` field
3. ✅ **ContentTemplates**: Remove entirely - not used
4. ✅ **Multiple types**: No - one content item = one type (lesson OR quiz)

## Free Preview Implementation

Instead of counting free items, we mark individual content items as free:
- Each content item in a module has an `isFree` checkbox
- Free items are accessible without purchase
- Frontend can count free items if needed for display
- More flexible than a single `freeItemCount` number

### Frontend Access Logic

When checking if a user can access a content item:
1. Check if user has enrollment/purchase (existing logic)
2. If no purchase, check if content item has `isFree: true`
3. If `isFree: true`, allow access for preview
4. If `isFree: false` and no purchase, show paywall

### Frontend Display

- Show "FREE" badge on free content items
- Count free items for display: "X free lessons available"
- Progress tracking works the same for free and paid items

