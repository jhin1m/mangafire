# Tri-State Checkbox Implementation Research
**Date**: 2026-02-08 | **Project**: MangaFire Genre Filter

## Current Genre.tsx Implementation

**Location**: `apps/web/src/views/filter/components/Filters/components/Genre.tsx`

Currently implements **binary checkbox only**:
- Reads `genre` URL param: `searchParams.get('genre')?.split(',') || []`
- Maps genres to checkbox items with `checked: defaults.includes(String(g.id))`
- No exclude/negative selection logic
- Single state: item is either selected (included) or not selected
- No `genre_exclude` param parsing

**Data structure passed to ButtonFilter**:
```typescript
{ id, value, label, checked: boolean }
```

## ButtonFilter.tsx Checkbox Handler

**Location**: `apps/web/src/views/filter/components/Filters/components/ButtonFilter.tsx` (lines 49-61)

Current `handleChange` logic:
- Tracks `selectedItems: Set<string>` for UI display count only
- No state management for include vs exclude
- For checkbox type: adds/removes label from Set based on `e.target.checked`
- **Problem**: Input attributes don't have tri-state capability; only changes to `Set<string>` for display

## CSS `.exclude` Styling Analysis

**Location**: `apps/web/src/assets/styles/app.css` (lines 11670-11732)

Three visual states defined:
1. **Unchecked**: Icon `\f0c8` (empty checkbox)
2. **Checked (include)**: Icon `\f0fe` (filled checkbox), white text
3. **Checked + `.exclude` class**: Icon `\f146` (minus/prohibited), muted text `rgba(116, 124, 136, 0.5)`, dark background

**CSS selectors**:
- `input[type='checkbox']:checked + label:before` → shows filled checkbox icon `\f0fe`
- `input.exclude[type='checkbox']:checked + label:before` → shows minus icon `\f146`
- `.exclude:checked + label` → applies muted styling (grayed out appearance)

**Gap identified**: CSS exists but no JavaScript logic to toggle `.exclude` class on checkboxes.

## Tri-State Checkbox Patterns

Three approaches for tri-state (include/exclude/none):

### Approach 1: Toggle Class on Checkbox (Current CSS Viable)
- Use `checked` attribute + `.exclude` class to create 3 visual states:
  - Unchecked: Neither checked nor .exclude
  - Include: checked, no .exclude class
  - Exclude: checked + .exclude class
- **Cycle logic**: `null → true → false → null` (click cycles through states)
- **Advantage**: Leverages existing CSS styling; minimal DOM changes
- **Tracking**: Store state as `'include' | 'exclude' | null` per genre ID

### Approach 2: Hidden Metadata Array
- Single `.checked-items` array tracks visual state (UI display)
- Separate `.include` and `.exclude` arrays track backend param values
- Checkbox only shown as checked/unchecked; exclude visual via separate data structure
- **Disadvantage**: Decouples visual state from data state

### Approach 3: Custom State Enum
- Convert checkbox data to: `{ id, value, label, state: 'include' | 'exclude' | null }`
- Render `<input hidden>` + manual checkbox element with click handlers
- Full control over tri-state cycling and visual feedback
- **Disadvantage**: Removes HTML form semantics

## URL Parameter Strategy

**Current**: `?genre=1,2,3`

**Proposed**: Separate positive/negative filters
- `?genre=1,2,3&genre_exclude=4,5` (include these genres AND exclude these)
- Alternative: `?genre_include=1,2,3&genre_exclude=4,5` (explicit keys)

**Form submission**: Must produce two sets of params:
- Include genres → `genre[]` in FormData (OR `genre=1&genre=2...`)
- Exclude genres → `genre_exclude[]` in FormData (NEW)

**Backend impact**: API must support both filters simultaneously (AND logic for includes, NOT IN for excludes).

## FormData Handling

**Current flow**: ButtonFilter → native `<input>` elements → form submission collects `genre[]`

**Required changes**:
1. Add second `<input>` elements with `name="genre_exclude[]"` when exclude state active
2. OR: Use hidden `<input type="hidden">` to track exclude list separately
3. Parse both `genre` and `genre_exclude` arrays on submission

**Example**:
```javascript
// Current: only genre[] sent
// Proposed: both sent
genre: ['1', '2', '3'],
genre_exclude: ['4', '5']
```

## State Management Architecture

**Recommended**: Approach 1 (Cycle with .exclude class)

**Data structure per genre**:
```typescript
type GenreFilterState = 'include' | 'exclude' | null

// Internal tracking
const genreStates = new Map<string, GenreFilterState>()
// or
const genreStates: Record<string, GenreFilterState> = {
  'genre-123': 'include',
  'genre-456': 'exclude',
  'genre-789': null
}
```

**Cycle logic**:
```javascript
const cycleState = (current) => {
  const cycle = { include: 'exclude', exclude: null, null: 'include' }
  return cycle[current]
}
```

**Derived URL params**:
```javascript
const includes = Object.entries(genreStates)
  .filter(([_, state]) => state === 'include')
  .map(([id, _]) => id)

const excludes = Object.entries(genreStates)
  .filter(([_, state]) => state === 'exclude')
  .map(([id, _]) => id)
```

## Implementation Considerations

1. **HTML Semantics**: Using `.exclude` class + checked state maintains form input semantics (submittable)
2. **Accessibility**: ARIA attributes needed: `aria-checked="mixed"` for tri-state perception
3. **Mobile UX**: Multiple clicks to cycle through states — consider tooltip/context menu alternative
4. **Server-side**: No changes needed if backend already supports `genre` and `genre_exclude` query params
5. **Form reset**: Must handle both genre + genre_exclude arrays when clearing filters

## Unresolved Questions

1. **Backend support**: Does API already accept `genre_exclude` param? Or only `genre`?
2. **User intent**: How should user learn about tri-state cycling? Tooltip or context menu needed?
3. **Mobile UX**: Should exclude be accessible via right-click or long-press, or just cycling?
4. **Persistence**: Should exclude preferences persist in URL when navigating away and returning?
5. **Semantic form**: Should `.exclude` checkboxes submit as separate form field or be handled in JS before submission?

---

## References

- [react-three-state-checkbox - npm](https://www.npmjs.com/package/react-three-state-checkbox)
- [Using a indeterminate React Checkbox](https://www.robinwieruch.de/react-checkbox-indeterminate/)
- [PrimeReact TriStateCheckbox](https://primereact.org/tristatecheckbox/)
- [Deque: Checkbox (Tri-State) ARIA](https://dequeuniversity.com/library/aria/checkbox-tri)
