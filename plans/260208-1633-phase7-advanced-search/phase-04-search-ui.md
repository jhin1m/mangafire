# Phase 04 - Search UI Components

## Context

- Research: [Frontend Search UX Report](./research/researcher-frontend-search-ux-report.md)
- Docs: [Code Standards](../../docs/code-standards.md), [Design Guidelines](../../docs/design-guidelines.md)
- Existing: Header.tsx search bar (lines 172-189), `dropdown.css` styles

## Parallelization

- **Runs with**: Phase 01, Phase 03 (no dependencies)
- **Blocks**: Phase 05 (integration needs these components)

## Overview

| Field | Value |
|---|---|
| Date | 2026-02-08 |
| Priority | P1 |
| Status | pending |
| Effort | 2h |
| Description | Build presentational search components: input, autocomplete dropdown, filters, history display |

## Key Insights from Research

- **Downshift** (useCombobox) provides headless WAI-ARIA autocomplete — works with plain CSS
- **Max 8 suggestions** in dropdown to avoid decision paralysis
- **Keyboard nav**: ArrowUp/Down, Enter to select, Escape to close
- **Dark theme** (#0e1726 background) — match existing dropdown.css patterns
- Existing Header.tsx has a placeholder search form (`.search-inner`) — Phase 05 replaces it

## Requirements

1. **SearchInput**: Controlled input with magnifying glass icon, clear button, loading spinner
2. **SearchAutocomplete**: Dropdown list of suggestions (manga title + cover thumbnail), Downshift-powered
3. **SearchFilters**: Compact filter chips for genre, status, type facets
4. **SearchHistory**: Recent searches list (receives items as props, stateless)
5. **search.css**: Styles for all search components
6. All components are **presentational** (props-driven, no API calls, no hooks)
7. Install `downshift` dependency

## Architecture

```
apps/web/src/components/shared/
├── SearchInput/
│   ├── SearchInput.tsx       ← Controlled input + icons
│   └── index.ts              ← Re-export
├── SearchAutocomplete/
│   ├── SearchAutocomplete.tsx ← Downshift useCombobox dropdown
│   └── index.ts
├── SearchFilters/
│   ├── SearchFilters.tsx      ← Filter chips with remove/clear
│   └── index.ts
├── SearchHistory/
│   ├── SearchHistory.tsx      ← Recent searches list
│   └── index.ts

apps/web/src/assets/styles/
└── search.css                 ← All search-related styles
```

## File Ownership (Exclusive)

| File | Action |
|---|---|
| `apps/web/src/components/shared/SearchInput/` | New directory + files |
| `apps/web/src/components/shared/SearchAutocomplete/` | New directory + files |
| `apps/web/src/components/shared/SearchFilters/` | New directory + files |
| `apps/web/src/components/shared/SearchHistory/` | New directory + files |
| `apps/web/src/assets/styles/search.css` | New file |
| `apps/web/package.json` | Add `downshift` dependency |

No other phase creates or modifies these files.

## Implementation Steps

1. **Install dependency**: `pnpm add downshift --filter @mangafire/web`

2. **Create SearchInput component**:
   - Props: `value`, `onChange`, `onFocus`, `onClear`, `isLoading`, `placeholder`, `inputProps` (spread from Downshift)
   - Renders: input with `fa-magnifying-glass` icon (react-icons: `FaMagnifyingGlass`), conditional Spinner, clear button (X)
   - ARIA: Do NOT set `role="combobox"` manually — Downshift's `useCombobox` auto-injects ARIA via `getInputProps()`. Component only adds `aria-label="Search manga"`.
   - CSS class: `.search-input-wrapper`
   - **Important**: Accept `...inputProps` spread for Downshift integration in Phase 05

3. **Create SearchAutocomplete component**:
   - Props: `items`, `isOpen`, `highlightedIndex`, `getItemProps`, `onSelect`, `inputValue`
   - Receives Downshift props from parent (Phase 05 will connect)
   - Renders: `<ul role="listbox">` with `<li role="option">` items
   - Each item: cover thumbnail (40x56), title, type badge
   - Highlights matched text in title using `inputValue`
   - Max 8 items displayed
   - ARIA: `aria-live="polite"`, `aria-selected` on highlighted item

4. **Create SearchFilters component**:
   - Props: `filters` (array of {id, label, type}), `onRemove(id)`, `onClear()`
   - Renders: horizontal chip row with remove buttons + "Clear all" button
   - CSS class: `.search-filters-chips`

5. **Create SearchHistory component**:
   - Props: `items` (string[]), `onSelect(query)`, `onRemove(query)`, `onClear()`
   - Renders: list of recent queries with clock icon, click to re-search
   - Shows when input focused + empty query + history exists

6. **Create `search.css`**:
   - `.search-input-wrapper` — flex row, dark border, rounded, matches existing `.dropdown` style
   - `.search-autocomplete` — absolute dropdown, dark bg (#1a2332), shadow, z-index 50
   - `.search-autocomplete-item` — flex row, hover/highlighted state, padding
   - `.search-filters-chips` — horizontal scroll, gap, chip styling
   - `.search-history` — similar to autocomplete dropdown but with history icon
   - Match existing dark theme variables from `app.css`

7. **Verify**: All components render in isolation (no API dependencies)

## Todo

- [ ] Install downshift
- [ ] Create SearchInput component
- [ ] Create SearchAutocomplete component
- [ ] Create SearchFilters component
- [ ] Create SearchHistory component
- [ ] Create search.css styles
- [ ] Verify components accept correct props (TypeScript)
- [ ] Test keyboard navigation with Downshift

## Success Criteria

- All components render without errors given valid props
- SearchAutocomplete handles keyboard navigation (Arrow keys, Enter, Escape)
- ARIA attributes present: `role="listbox"`, `role="option"`, `aria-expanded`, `aria-autocomplete`
- Styles match existing dark theme
- No API calls or state management in any component (pure presentational)
- TypeScript strict mode passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Downshift version incompatibility with React 18 | Low | Medium | Downshift v9+ supports React 18 |
| CSS conflicts with existing dropdown.css | Medium | Low | Use `.search-*` prefix for all classes |
| Cover image layout inconsistency | Low | Low | Use fixed 40x56 thumbnail with object-fit: cover |

## Security Considerations

- No user data handling in presentational components
- SearchInput applies `maxLength={200}` to prevent oversized input
- No dangerouslySetInnerHTML — text highlighting uses safe string split

## Next Steps

Phase 05 composes these components with Downshift useCombobox hook, TanStack Query, and wires into Header.tsx.
