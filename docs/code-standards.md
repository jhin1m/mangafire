# Code Standards & Guidelines

## TypeScript

**General**
- Strict mode enabled (`strict: true`)
- `isolatedModules: true` required for proper ESM support
- No implicit `any` types
- Explicit return types on functions

**Path Alias**
- `@/` resolves to `src/` (configured in vite.config.ts and tsconfig.json)
- Use path alias for all imports within apps

**Example**
```typescript
// Good
import { useMangaList } from '@/hooks/useMangaList'
import { MangaCard } from '@/components/shared/MangaCard'

// Avoid
import { useMangaList } from '../../../hooks/useMangaList'
```

## File Organization

**Directories**
```
src/
├── components/          # UI and layout components
│   ├── layouts/         # MainLayout, ReadLayout
│   ├── template/        # Layout-specific sections
│   ├── shared/          # Reusable components across pages
│   ├── ui/              # UI primitives (Modal, Button, etc.)
│   └── route/           # Route guards
├── views/               # Page-level components
├── store/               # Redux store, slices
├── hooks/               # Custom React hooks
├── configs/             # App config, routes, theme
├── constants/           # Enums, constants
├── lib/                 # Utilities and helpers
├── @types/              # Type definitions
└── App.tsx
```

## Component Conventions

**Functional Components**
- Use `FC` or explicit return type
- Props interface named `{ComponentName}Props`
- Default exports for route components, named exports for shared components

**Example**
```typescript
interface MangaCardProps {
  manga: Manga
  onClick?: (id: number) => void
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, onClick }) => {
  return <div onClick={() => onClick?.(manga.id)}>{manga.title}</div>
}
```

**JSX Props Ordering** (ESLint enforced)
1. Reserved props first (`key`, `ref`)
2. Data props second (`manga`, `items`)
3. Boolean/value props third
4. Callbacks last (`onClick`, `onChange`)

**CSS Classes**
- Use `classnames` library for conditional classes
- Keep styles scoped (CSS modules or inline styles)

**Icons & UI Libraries**
- Icons: `react-icons`
- Carousels: `swiper`
- Tooltips: `@tippyjs/react`
- Toast: `react-hot-toast` (max 1 visible toast)

## State Management

**Redux Toolkit**
- Define slices in `src/store/slices/`
- Use `useAppDispatch` and `useAppSelector` from `src/store/hook.ts`
- Persist critical slices: auth, theme

**Example Slice**
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ThemeState {
  pageType: 'long-strip' | 'paged'
  readDirection: 'ltr' | 'rtl'
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: { pageType: 'long-strip', readDirection: 'ltr' },
  reducers: {
    setPageType: (state, action: PayloadAction<'long-strip' | 'paged'>) => {
      state.pageType = action.payload
    },
  },
})

export default themeSlice.reducer
```

## Routing

**Protected Routes**
- Use `ProtectedRoute` component for authenticated paths
- Use `PublicRoute` for auth pages only
- Define in `src/configs/routes.config/appsRoute.tsx`

**Lazy Loading**
- Use React `lazy()` for route components
- Wrap with Suspense for fallback UI

**Example**
```typescript
const HomePage = lazy(() => import('@/views/home/Home'))

const appsRoute = [
  {
    path: '/',
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
  },
]
```

## Error Handling (Backend)

**API Responses**
```typescript
// Success
successResponse(c, data, meta?)
createdResponse(c, data)
noContentResponse(c)

// Error
errorResponse(c, message, code?, statusCode?)
```

**Validation**
- Use Zod schemas with `zValidator` middleware
- Validation errors automatically formatted in ApiResponse

**Example**
```typescript
mangaRoutes.post('/', zValidator('json', createMangaDtoSchema), async (c) => {
  const body = c.req.valid('json')
  // body is type-safe
})
```

**Database Errors**
- Caught by error handler middleware
- Returned as ApiResponse with message and code
- Never leak raw SQL errors to client

## API Design

**Pagination**
- Default limit: 20 items
- Max limit: 100 items
- Response includes meta: `{ total, page, limit, pages }`

**Sorting**
- Default: `createdAt` descending
- Supported fields: `rating`, `views`, `createdAt`, `title`
- Only `asc` and `desc` orders allowed

**Filtering**
- Optional query parameters
- Validated via Zod schemas
- Conditions combined with AND logic

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `manga-card.tsx`, `use-manga.ts` |
| Components | PascalCase | `MangaCard`, `HomePage` |
| Variables/Functions | camelCase | `mangaList`, `fetchManga()` |
| Constants | UPPER_SNAKE_CASE | `MAX_TITLE_LENGTH`, `API_BASE_URL` |
| Types/Interfaces | PascalCase | `Manga`, `CreateMangaDto` |
| Enums | PascalCase | `MangaStatus`, `ReadDirection` |

## Commits

**Format**: `<type>(<scope>): <subject>`

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**
```
feat(manga): add genre filtering to list endpoint
fix(api): handle missing manga gracefully
docs(readme): update setup instructions
chore(deps): update drizzle-orm to 0.30
```

## Testing

- Unit tests: Co-located with component/function
- Integration tests: Isolated test files
- E2E tests: Separate test directory
- Minimum coverage: 80% for critical paths

## ESLint & Prettier

**Commands**
```bash
pnpm lint          # Check all files
pnpm lint:fix      # Auto-fix issues
pnpm format        # Prettier + ESLint combined
```

**Rules Enforced**
- No unused variables
- No implicit `any`
- JSX prop sorting
- No console logs in production code
- No @ts-ignore without explanation

## Comments

**Use comments for**
- Complex business logic
- Non-obvious workarounds
- API integration notes
- Performance-critical sections

**Avoid comments for**
- Obvious code (`count++` doesn't need a comment)
- Outdated information (update code instead)
- Multiple redundant comments

**Example**
```typescript
// Cache manga list for 5 minutes to reduce API calls
const cachedManga = useMemo(() => mangaList, [mangaList])
```
