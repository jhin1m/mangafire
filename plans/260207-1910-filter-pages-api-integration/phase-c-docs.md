# Phase C: Documentation Update

**Effort**: 15min | **Parallel**: Runs independently of Phase A and B

## Context
`docs/project-roadmap.md` Phase 5 marks filter integration as completed but doesn't mention the gaps being fixed. Add a note under Phase 5 about the fix, and update the "Search and Filtering" checklist.

## Changes

### `docs/project-roadmap.md`

#### 1. Update Phase 5 "Search and Filtering" section (around line 158-162)

**Current**:
```md
### Search and Filtering
- [x] Genre multi-select filtering (via filter page URL params)
- [x] Status and type dropdowns (via filter page)
- [x] Sort options (rating, views, newest)
- [ ] Full search with autocomplete (deferred to Phase 7)
```

**Target**:
```md
### Search and Filtering
- [x] Genre multi-select filtering (via filter page URL params)
- [x] Status and type dropdowns (via filter page)
- [x] Sort options aligned with backend enum (rating, views, createdAt, updatedAt, title)
- [x] Route-specific default sorting (/newest, /updated, /added)
- [x] Dynamic filter page title and count from API
- [x] Genre slug auto-filter on /genre/:slug route
- [ ] Full search with autocomplete (deferred to Phase 7)
```

#### 2. Add note about the fix in Phase 5 Status (around line 164-166)

Add after existing status line:
```md
- **Filter fix**: 7 Feb 2026 — sort value mismatch, route defaults, dynamic Head, genre slug
```

## Verification
Read the updated roadmap and confirm checklist items are accurate.
