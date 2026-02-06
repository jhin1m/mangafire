# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MangaFire is a manga reader web application with a monorepo architecture managed by **pnpm workspaces**. It consists of three packages:

- **`apps/web`** (`@mangafire/web`) — React 18 + TypeScript + Vite frontend
- **`apps/api`** (`@mangafire/api`) — Hono 4 + Drizzle ORM backend (PostgreSQL)
- **`packages/shared`** (`@mangafire/shared`) — Shared types and Zod validators

The app features manga browsing, genre filtering, and a dedicated reading view with configurable reading modes (long strip, single/double page), reading directions (LTR/RTL), and fit options.

## Commands

### Root (monorepo)

```bash
pnpm dev              # Run all app dev servers in parallel
pnpm dev:web          # Web frontend only (Vite HMR on :5173)
pnpm dev:api          # API server only (tsx watch on :3000)
pnpm build            # TypeScript check + build all apps
pnpm lint             # ESLint across all apps
pnpm type-check       # TypeScript --noEmit across all apps
pnpm format           # Prettier write across all source files
```

### Web app (`apps/web`)

```bash
pnpm build            # tsc && vite build → dist/
pnpm lint             # ESLint (.ts, .tsx, .js)
pnpm lint:fix         # ESLint auto-fix
pnpm type-check       # tsc --noEmit
```

### API (`apps/api`)

```bash
pnpm build            # tsc → dist/
pnpm start            # node dist/index.js
pnpm type-check       # tsc --noEmit
pnpm db:generate      # drizzle-kit generate (migrations)
pnpm db:push          # drizzle-kit push (apply schema)
pnpm db:studio        # drizzle-kit studio (DB GUI)
```

### Database

```bash
docker compose up -d  # Start PostgreSQL 16 (mangafire:mangafire@localhost:5432/mangafire)
```

### Commit Conventions

Commits use **conventional commits** enforced by commitlint + husky (`@commitlint/config-conventional`). The husky `commit-msg` hook runs `commitlint --edit` on every commit. Standard types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

## Architecture

### Monorepo Structure

```
mangafire/
├── apps/
│   ├── web/              # React frontend
│   └── api/              # Hono backend
├── packages/
│   └── shared/           # Shared types & validators (Zod)
├── pnpm-workspace.yaml   # Workspace config
├── docker-compose.yml    # PostgreSQL dev database
├── vercel.json           # Frontend deployment (SPA rewrite)
└── .husky/               # Git hooks (commitlint)
```

Both `apps/web` and `apps/api` depend on `@mangafire/shared` via `workspace:*`.

### Path Alias

`@/` maps to `src/` in the web app (configured in both `vite.config.ts` and `tsconfig.json`).

### Web App Source Layout (`apps/web/src/`)

```
src/
├── @types/            # Local type definitions (routes, theme, common, modal)
├── assets/            # Images and CSS files
├── components/
│   ├── layouts/       # MainLayout, ReadLayout, layout switcher
│   ├── route/         # Route guards (AppRoute, AuthorityGuard, ProtectedRoute, PublicRoute)
│   ├── shared/        # Reusable components (Card, Loading, Poster, ShareSocial)
│   ├── template/      # Layout-specific pieces (Default: Header/Footer/NavMobile, Read: Header)
│   └── ui/            # UI primitives (Modal, Pagination, Spinner, Toast)
├── configs/           # App config, theme defaults, route definitions
├── constants/         # Enums (page, fit, panel, progress, readDirection, roles, app)
├── store/             # Redux Toolkit store, slices (auth, theme), typed hooks
├── utils/             # Custom hooks and utilities
├── views/             # Page-level components (welcome, home, filter, manga, read)
├── App.tsx            # Root: Redux Provider, PersistGate, BrowserRouter, Toaster
├── main.tsx           # Entry point
└── index.css          # Imports all CSS modules
```

### Routing & Layouts

- **Two layout modes**: `MainLayout` (default with header/footer/nav) and `ReadLayout` (manga reader). Layout is selected based on URL path containing "read".
- **Route definitions**: `src/configs/routes.config/` — `appsRoute.tsx` (protected) and `authRoute.tsx` (public). All routes use `React.lazy()` for code-splitting.
- **Route guards**: `src/components/route/` — `AuthorityGuard`, `ProtectedRoute`, `PublicRoute` handle role-based access.
- **Key routes**: `/` (welcome), `/home`, `/filter`, `/genre/:slug`, `/manga/:slug`, `/read/:slug/:lang?/:chapter?`, `/random`, `/newest`, `/updated`, `/added`.

### State Management

- **Redux Toolkit** with **redux-persist** (persists `auth` and `theme` slices to localStorage).
- Store supports dynamic reducer injection via `injectReducer()` in `src/store/storeSetup.ts`.
- Typed hooks: `useAppDispatch` and `useAppSelector` from `src/store/hook.ts`.
- **Auth slice** (`slices/auth/`): session state (`signedIn`, `token`) and user info. Currently mock — `ProtectedRoute` always grants access.
- **Theme slice** (`slices/theme/themeSlice.ts`): layout state, reader config (`pageType`, `readDirection`, `fitType`, `progressPosition`), UI visibility (`isShowHeader`, `isShowMenu`, `isShowSubPanel`), and progress tracking (`pageIndex`, `activeSwiper`, `isSwiping`).

### Reading Configuration

The reader has multiple configurable options managed in the theme slice:
- `pageType`: `SINGLE`, `DOUBLE`, `LONG_STRIP` (from `PAGE_ENUM`)
- `readDirection`: `LTR`, `RTL` (from `READ_DIRECTION_ENUM`)
- `fitType`: `WIDTH`, `HEIGHT`, `BOTH`, `NO_LIMIT` (from `FIT_ENUM`)
- `progressPosition`: `LEFT`, `RIGHT`, `BOTTOM`, `TOP` (from `PROGRESS_OFFSET_ENUM`)
- Constants defined in `src/constants/`.

### API Backend

- **Framework**: Hono 4 with `@hono/node-server`
- **Database**: PostgreSQL via Drizzle ORM + `postgres` driver
- **Current state**: Skeleton with health check endpoint (`GET /api/health`)
- **Config**: Environment variables via dotenv (see `apps/api/.env.example`)
- **CORS**: Configured for `http://localhost:5173` (dev frontend)

### Shared Package

- Located at `packages/shared/`
- Exports types via `@mangafire/shared` and `@mangafire/shared/types`
- Exports validators via `@mangafire/shared/validators`
- Uses Zod for runtime validation
- Key types: `PageType`, `ReadDirectionType`, `FitType`, `Genre`, `GenreTrending`, `Poster`, `FilterDropdown`, `TableQueries`

### Styling

- **Plain CSS** — no Tailwind or CSS-in-JS
- Modular CSS files imported in `src/index.css`: `app.css`, `card.css`, `modal.css`, `read.css`, `swiper.css`, `toast.css`, `dropdown.css`, `footer.css`
- **Dark theme** by default (background: `#0e1726`)
- Dynamic body class management in `ReadLayout` for reader mode styling
- `classnames` library for conditional CSS class composition

## Key Conventions

- **Code style**: Prettier (single quotes, no semicolons, 2-space indent) + ESLint
- **JSX prop sorting**: callbacks last, shorthand first, reserved first (ESLint enforced)
- **Imports**: No duplicate imports (error), newline after import block (warning)
- **Icons**: `react-icons` library
- **Carousels**: `swiper`
- **Tooltips**: `@tippyjs/react`
- **Notifications**: `react-hot-toast` (limited to 1 visible toast)
- **Mobile detection**: `react-device-detect` for responsive behavior
- **Animations**: `react-transition-group`
- **Custom hooks**: `useAuthority`, `useClickOutside`, `useOnScreen`, `useScrollStatus`, `useWindowDimensions` (in `src/utils/`)

## Development Setup

1. Install dependencies: `pnpm install`
2. Start database: `docker compose up -d`
3. Push DB schema: `cd apps/api && pnpm db:push`
4. Copy env file: `cp apps/api/.env.example apps/api/.env`
5. Start dev servers: `pnpm dev` (or `pnpm dev:web` / `pnpm dev:api` individually)

## Testing

No test framework is currently configured. There are no test files or test runner configs (jest, vitest, etc.) in the project.

## Deployment

- **Frontend**: Vercel — SPA rewrite configured in `vercel.json` (`/(.*) → /`)
- **Backend**: Not yet configured for production deployment
- **Database**: Docker Compose for local dev; production DB not configured
