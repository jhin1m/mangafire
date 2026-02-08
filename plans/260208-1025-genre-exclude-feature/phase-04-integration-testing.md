# Phase 4: Integration Testing

## Context

- [Plan](./plan.md) | [Phase 2](./phase-02-backend-api-logic.md) | [Phase 3](./phase-03-frontend-tristate-ui.md)

## Parallelization Info

- **Sequential** -- runs after Phase 2 + Phase 3 both complete
- **Blocks**: None
- **Blocked by**: Phase 2, Phase 3

## Overview

Verify end-to-end genre exclude feature: frontend tri-state UI sends correct params, API processes include/exclude correctly, results are filtered as expected.

## File Ownership

No files modified in this phase. Testing only.

## Key Insights

- No test framework configured (per project docs). Testing is manual via dev servers.
- Focus on behavioral verification: URL params, API responses, UI state transitions.
- Backend can be tested independently via curl/httpie before full integration.

## Requirements

1. Verify all backend API scenarios produce correct filtered results
2. Verify frontend tri-state cycle works visually and functionally
3. Verify URL params persist across page reloads
4. Verify backward compatibility (existing filters unchanged)

## Test Matrix

### Backend API Tests (curl)

| # | Scenario | Request | Expected |
|---|----------|---------|----------|
| 1 | No genre params | `GET /api/manga` | All manga returned |
| 2 | Include only | `GET /api/manga?genreId=1` | Only manga with genre 1 |
| 3 | Exclude only | `GET /api/manga?excludeGenres=1,2` | Manga WITHOUT genre 1 or 2 |
| 4 | Include + exclude | `GET /api/manga?genreId=3&excludeGenres=1` | Genre 3 present, genre 1 absent |
| 5 | Empty exclude | `GET /api/manga?excludeGenres=` | All manga (ignored) |
| 6 | Invalid values | `GET /api/manga?excludeGenres=abc,-1` | Zod validation error or graceful ignore |

### Frontend UI Tests (browser)

| # | Scenario | Action | Expected |
|---|----------|--------|----------|
| 1 | Initial state | Load `/filter` | All genres unchecked |
| 2 | Include genre | Click "Action" once | Green check icon, genre added to include |
| 3 | Exclude genre | Click "Action" again | Red minus icon, `.exclude` class applied |
| 4 | Clear genre | Click "Action" third time | Unchecked state, genre removed |
| 5 | Submit include | Select genres, click Filter | URL shows `genre=1,2` |
| 6 | Submit exclude | Exclude genres, click Filter | URL shows `genre_exclude=3,4` |
| 7 | Submit mixed | Include + exclude, submit | URL shows `genre=1&genre_exclude=3` |
| 8 | URL restore | Reload page with `?genre=1&genre_exclude=3` | Correct tri-states restored |
| 9 | Display count | Select 2 include + 1 exclude | Button shows "3 selected" |
| 10 | Non-genre filter | Use Type/Status dropdowns | Behavior unchanged (no regression) |

### Cross-Layer Tests

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Full flow | Include Action, exclude Romance, submit | URL updated, API called with both params, results filtered |
| 2 | Pagination | Exclude genre, navigate page 2 | Genre exclusion persists across pages |
| 3 | Genre route | Visit `/genre/action` + exclude Romance | Slug-derived include + explicit exclude both work |

## Implementation Steps

### Step 1: Start dev servers

```bash
pnpm dev
```

### Step 2: Run backend API tests

```bash
# Test 1: No params
curl -s http://localhost:3000/api/manga | jq '.meta.total'

# Test 3: Exclude only
curl -s 'http://localhost:3000/api/manga?excludeGenres=1,2' | jq '.meta.total'

# Test 4: Include + exclude
curl -s 'http://localhost:3000/api/manga?genreId=3&excludeGenres=1' | jq '.data[].genres[].name'
```

### Step 3: Run frontend tests in browser

Open `http://localhost:5173/filter` and verify tri-state behavior manually per test matrix.

### Step 4: Run type check

```bash
pnpm type-check
```

## Todo

- [ ] Start dev servers (`pnpm dev`)
- [ ] Run backend API test scenarios 1-6 via curl
- [ ] Verify frontend tri-state cycle (tests 1-4)
- [ ] Verify form submission and URL params (tests 5-8)
- [ ] Verify display count (test 9)
- [ ] Verify non-genre regression (test 10)
- [ ] Run cross-layer tests 1-3
- [ ] Run `pnpm type-check` -- passes
- [ ] Run `pnpm lint` -- no new errors

## Success Criteria

- All backend test scenarios return expected results
- Tri-state checkboxes cycle correctly with proper CSS
- URL params correctly reflect include/exclude state
- Page reload restores state from URL
- No regression in existing filter behavior
- `pnpm type-check` and `pnpm lint` pass

## Conflict Prevention

No file modifications -- read-only testing phase. No conflicts possible.

## Risk Assessment

- **Low risk**: Testing phase only; no code changes
- If tests reveal bugs, fixes go back to Phase 2 or Phase 3 files (within their ownership)

## Security Considerations

- Verify that invalid/malicious `excludeGenres` values (negative numbers, SQL fragments) are rejected by Zod validator
- Confirm no additional error information leaks in API error responses

## Next Steps

Upon successful completion, feature is ready for code review and merge.
