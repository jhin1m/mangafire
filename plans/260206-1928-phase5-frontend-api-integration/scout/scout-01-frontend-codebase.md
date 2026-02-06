# Scout Report: Frontend Codebase Analysis
**Date**: 2026-02-06  
**Phase**: Phase 5 - Frontend API Integration  
**Target**: MangaFire Frontend (`apps/web/src/`)

---

## 1. Current Data Sources (Mock Data Analysis)

### 1.1 Hardcoded Mock Data Locations

**Trending Section** (`apps/web/src/views/home/components/TopTrending/TopTrending.tsx`)
- 24 hardcoded trending manga items with:
  - image (CDN URLs from bunnycdn.ru)
  - title, description
  - releasing status, chapter info, genres
- Status: Static array, no API call

**Most Viewed** (`apps/web/src/views/home/components/MostViewed/MostViewed.tsx`)
- 10 hardcoded poster items
- Fields: image, title
- Status: Uses fake data, 300ms loading state

**Recently Updated** (`apps/web/src/views/home/components/RecentlyUpdated/Content.tsx`)
- 12 hardcoded manga cards with chapters
- Fields: image, type, title, chapters array
- Status: Labeled as `fakeData`, 300ms loading delay

**New Release** (`apps/web/src/views/home/components/NewRelease/NewRelease.tsx`)
- 20 hardcoded posters with links
- Fields: image, title, link (manga slug references)
- Status: All have internal `/manga/` links

**Filter Page** (`apps/web/src/views/filter/Filter.tsx`)
- 30+ hardcoded manga cards
- Fields: image, type, title, chapters with dates/languages
- Status: Uses search params for filtering (not API-driven yet)

**Manga Detail Page** (`apps/web/src/views/manga/Manga.tsx`)
- Hardcoded single manga "Jujutsu Kaisen"
- Hardcoded background image `/detail.jpg`
- Status: No dynamic slug-based loading

**Manga Top Content** (`apps/web/src/views/manga/components/Top/Content.tsx`)
- Hardcoded title, status, description
- Hardcoded links: `/read/jujutsu-kaisen`, `/type/manga`
- Status: No API integration

---

## 2. Existing API Setup

### 2.1 Auth Service (Only HTTP Client)
**File**: `/apps/web/src/services/auth-service.ts`

```typescript
// API base URL
const API_BASE = '/api/auth'

// Generic fetch wrapper
async function request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // send cookies
    ...options,
  })
  return res.json()
}
```

**Auth endpoints implemented**:
- `POST /login` - Login (returns token + user)
- `POST /register` - Registration
- `POST /logout` - Logout
- `POST /refresh` - Token refresh
- `GET /profile` - Get user profile (requires auth token)
- `PATCH /profile` - Update profile (requires auth token)

**Note**: Auth service is functional. NO other service files exist for manga/genres/chapters.

### 2.2 App Configuration
**File**: `/apps/web/src/configs/app.config.ts`

```typescript
const appConfig = {
  apiPrefix: '/api',
  authenticatedEntryPath: '/',
  unAuthenticatedEntryPath: '/',
  locale: 'en',
  enableMock: false,
}
```

- API prefix is `/api`
- Mock mode is disabled (but no mock implementation exists)

### 2.3 HTTP Client Analysis
- **No axios/fetch wrapper**: Direct fetch used in auth-service
- **No interceptors**: Token handling done manually in each request
- **No error handling framework**: Each service must implement own error handling
- **No request/response transformers**

---

## 3. Auth Integration & Token Management

### 3.1 Session Slice (Redux)
**File**: `/apps/web/src/store/slices/auth/sessionSlice.ts`

**State structure**:
```typescript
interface SessionState {
  signedIn: boolean
  token: string | null
  loading: boolean
}
```

**Async thunks**:
- `signIn(dto: LoginDto)` - Calls `authService.login()`, stores `accessToken`
- `signUp(dto: RegisterDto)` - Calls `authService.register()`, stores `accessToken`
- `signOut()` - Calls `authService.logout()`

**Token storage**: In Redux state (also persisted via redux-persist)

**Actions exported**:
- `signInSuccess(token: string)`
- `signOutSuccess()`

### 3.2 User Slice (Redux)
**File**: `/apps/web/src/store/slices/auth/userSlice.ts`

**State structure**:
```typescript
type UserState = {
  avatar?: string
  userName?: string
  email?: string
  authority?: string[]
}
```

**Populated from**:
- `signIn.fulfilled` - Extracts `user` from response
- `signUp.fulfilled` - Extracts `user` from response
- `signOut.fulfilled` - Resets to initial state

**Key**: User data comes from auth service response, not a separate profile API call.

### 3.3 Token Usage Pattern
- **Not implemented**: No automatic request interceptor to attach token to all requests
- **Manual**: Each service must pass token in headers
- Auth service example:
  ```typescript
  Authorization: `Bearer ${token}`
  ```

---

## 4. Views Requiring API Integration

| View | File | Data Needed | Current Status |
|------|------|-------------|-----------------|
| **Home** | `Home.tsx` | Trending, Most Viewed, Recently Updated, New Release | Mock data only |
| **Top Trending** | `TopTrending.tsx` | 24 trending manga | Hardcoded |
| **Most Viewed** | `MostViewed.tsx` | 10 most viewed posters | Hardcoded |
| **Recently Updated** | `RecentlyUpdated/Content.tsx` | 12 recent manga | Hardcoded as `fakeData` |
| **New Release** | `NewRelease.tsx` | 20 new release posters | Hardcoded |
| **Filter Page** | `Filter.tsx` | Paginated manga, filtered by params | Hardcoded 30+ items |
| **Manga Detail** | `Manga.tsx` | Single manga by slug | Hardcoded "Jujutsu Kaisen" |
| **Manga Top Content** | `Top/Content.tsx` | Title, status, description, rating | Hardcoded |
| **Manga Bottom** | `Bottom/Content/Menu.tsx` | Tabs: Chapters, Volumes, Comments | Not found in search |
| **Chapters** | `Bottom/Content/Chapters.tsx` | Chapter list for manga | Not found in search |

---

## 5. Shared Package Types

**File**: `/packages/shared/src/types/index.ts`

### 5.1 Exported Type Categories

#### Manga Types
- `Genre` - (deprecated?) Old format with chapters array
- `GenreTrending` - Trending format with image, title, desc, releasing, genres[]
- `Poster` - Minimal: image, title, link?
- `Manga` - Full entity with id, title, slug, description, author, artist, coverImage, status, type, language, releaseYear, rating, views, createdAt, updatedAt
- `CreateMangaDto` - For creating manga (with optional genreIds[])
- `UpdateMangaDto` - For updating manga

#### Manga Enums
- `MangaStatus` - `ongoing`, `completed`, `hiatus`, `cancelled`
- `MangaType` - `manga`, `manhwa`, `manhua`, `one_shot`, `doujinshi`
- `Language` - `en`, `jp`, `ko`, `zh`

#### Auth Types
- `AuthUser` - id, email, username, avatar, role
- `AuthResponse` - { accessToken, user: AuthUser }
- `LoginDto` - email, password
- `RegisterDto` - email, username, password, confirmPassword
- `UpdateProfileDto` - Partial user fields

#### API Response
- `ApiResponse<T>` - Generic response wrapper with success, data, error, message

#### Reading Types
- `PageType` - Enum for page display mode
- `ReadDirectionType` - LTR/RTL
- `FitType` - Zoom fit options
- `ENUM_READ_BY` - `chapter` or `volume`

### 5.2 Validators
All types have corresponding Zod validators in `/packages/shared/src/validators/`:
- `api.ts` - ApiResponse validator
- `auth.ts` - Auth validators
- `manga.ts` - Manga validators
- `chapter.ts` - Chapter validators
- `filter.ts` - Filter query validators

---

## 6. Available API Endpoints (Backend)

**Base URL**: `/api`

### 6.1 Manga Routes (`/manga`)
- `GET /` - List manga (paginated, filterable, sortable)
  - Query params: page, limit, sortBy, sortOrder, genreId, status, type, language, year, search
  - Returns: paginated items with metadata
- `GET /:slug` - Get single manga by slug
- `POST /` - Create manga (protected)
- `PATCH /:slug` - Update manga (protected)
- `DELETE /:slug` - Delete manga (protected)

### 6.2 Genres Routes (`/genres`)
- `GET /` - List all genres (ordered by name)

### 6.3 Chapters Routes (`/chapters`)
- CRUD operations (file exists: `/apps/api/src/routes/chapters.ts`)
- Implementation not detailed yet

### 6.4 Volumes Routes (`/volumes`)
- CRUD operations (file exists: `/apps/api/src/routes/volumes.ts`)
- Implementation not detailed yet

### 6.5 Auth Routes (`/auth`)
- `POST /register` - Register user
- `POST /login` - Login user
- `POST /logout` - Logout
- `POST /refresh` - Refresh access token
- `GET /profile` - Get user profile (protected)
- `PATCH /profile` - Update profile (protected)

### 6.6 Health Check (`/health`)
- Route exists

---

## 7. Dependencies Analysis

### 7.1 HTTP Clients
- **Fetch API**: Used in auth-service (native browser API)
- **No Axios**: Not installed
- **No Other HTTP Library**: Only fetch

### 7.2 State Management
- **Redux Toolkit**: ^1.9.7 - Present
- **Redux Persist**: ^6.0.0 - Persists auth & theme slices
- **React Redux**: ^8.1.3 - Hooks integration

### 7.3 UI & Components
- **React Icons**: ^4.11.0
- **Swiper**: ^11.0.3 - Carousels
- **React Hot Toast**: ^2.4.1 - Notifications
- **React Device Detect**: ^2.2.3 - Responsive
- **Tippy.js**: Tooltips

### 7.4 Styling
- **Plain CSS**: No Tailwind, no CSS-in-JS
- **Classnames**: ^2.3.2 - Conditional classes

### 7.5 Testing
- **No test framework installed**
- No jest, vitest, or testing-library

---

## 8. Critical Missing Components

### 8.1 Service Layer
Missing services:
- `manga-service.ts` - For manga CRUD operations
- `genre-service.ts` - For genre listing
- `chapter-service.ts` - For chapter operations
- `volume-service.ts` - For volume operations

### 8.2 HTTP Request Abstraction
- No centralized request factory
- No token injection middleware
- No error handling wrapper
- No request/response transformation

### 8.3 Error Handling
- No global error boundary
- No toast error notifications from API calls
- No retry logic

### 8.4 Loading States
- Manual `useState` for loading in each component
- No global loading state
- 300ms timeout used as fake loading animation

### 8.5 Type Safety
- No automatic API type validation (Zod validators exist but not used in fetch)
- Manual response type casting in fetch

---

## 9. Current Architecture Problems

### 9.1 Data Flow Issues
1. **No API integration**: All data is hardcoded
2. **No pagination**: Filter page shows 30 items max
3. **No real-time updates**: Everything is static
4. **No error states**: Errors not handled
5. **No loading states for data**: Only mock 300ms delay

### 9.2 Code Duplication
- 5+ components with hardcoded data arrays
- Repeated `useState(loading)` + `setTimeout` pattern
- No shared data fetching hooks

### 9.3 Token Management
- Token stored in Redux but not auto-attached to requests
- Manual header passing needed in each service
- No refresh token rotation strategy
- No token expiration handling

### 9.4 Component Structure
- Views directly hardcode data (not fetching)
- No container/presenter separation
- No custom hooks for data fetching
- No request deduplication

---

## 10. Integration Entry Points

### 10.1 Priority 1 (Homepage - Critical)
- `TopTrending` → `/api/manga` (list, limit 24, sortBy trending)
- `MostViewed` → `/api/manga` (list, limit 10, sortBy views)
- `RecentlyUpdated` → `/api/manga` (list, limit 12, sortBy updated)
- `NewRelease` → `/api/manga` (list, limit 20, sortBy releaseYear)

### 10.2 Priority 2 (Listing & Filtering)
- `FilterPage` → `/api/manga` (with query params from form)
- Pagination logic integration

### 10.3 Priority 3 (Detail Pages)
- `MangaPage` → `/api/manga/:slug` (fetch on mount with useParams)
- `ChaptersSection` → `/api/chapters?mangaId=X`
- `VolumesSection` → `/api/volumes?mangaId=X`

### 10.4 Priority 4 (Genre Listing)
- Genre filter dropdown → `/api/genres`

---

## 11. Recommended Approach

### Phase 1: Infrastructure
1. Create HTTP client wrapper with token injection
2. Create service layer for manga, genres, chapters
3. Create custom hooks for data fetching (useMangas, useMangaDetail, etc)
4. Setup React Query or TanStack Query for caching

### Phase 2: Homepage
1. Replace TopTrending with API call
2. Replace MostViewed with API call
3. Replace RecentlyUpdated with API call
4. Replace NewRelease with API call

### Phase 3: Listing
1. Integrate FilterPage with `/api/manga` endpoint
2. Add pagination integration
3. Integrate genre filter dropdown

### Phase 4: Detail Pages
1. Integrate MangaPage with slug parameter
2. Integrate chapters listing
3. Integrate volumes listing

---

## Unresolved Questions

1. **Read view data**: Where do chapter images come from? (not in API structure yet)
2. **Comment system**: Is there a comments endpoint? (not visible)
3. **Bookmark functionality**: How are bookmarks stored? (not visible)
4. **User favorites**: How are user favorites persisted? (not visible)
5. **Chapter metadata**: Do chapters have read progress tracking? (schema not visible)
6. **Rating system**: How are ratings submitted and stored? (not visible)
7. **Search functionality**: Is full-text search implemented? (query param exists, needs validation)
