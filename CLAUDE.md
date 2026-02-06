# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MangaFire is a manga reader web application built with React 18 + TypeScript + Vite. It features manga browsing, filtering by genre, and a dedicated reading view with configurable reading modes (long strip, page-by-page), reading directions (LTR/RTL), and fit options.

## Commands

```bash
pnpm dev          # Start dev server (Vite HMR)
pnpm build        # TypeScript check + Vite production build
pnpm preview      # Preview production build
pnpm lint         # ESLint check (.ts, .tsx, .js)
pnpm lint:fix     # ESLint auto-fix
pnpm format       # Prettier + ESLint auto-fix combined
```

Commits use conventional commits enforced by commitlint + husky (`@commitlint/config-conventional`).

## Architecture

### Path Alias
`@/` maps to `src/` (configured in both `vite.config.ts` and `tsconfig.json`).

### Routing & Layouts
- **Two layout modes**: `MainLayout` (default with header/footer/nav) and `ReadLayout` (manga reader). Layout is selected based on URL path containing "read".
- **Route definitions**: `src/configs/routes.config/` — `appsRoute.tsx` (protected) and `authRoute.tsx` (public). Routes use React `lazy()` for code-splitting.
- **Route guards**: `src/components/route/` — `AuthorityGuard`, `ProtectedRoute`, `PublicRoute` handle role-based access.

### State Management
- **Redux Toolkit** with **redux-persist** (persists `auth` and `theme` slices to localStorage).
- Store supports dynamic reducer injection via `injectReducer()` in `src/store/storeSetup.ts`.
- Typed hooks: `useAppDispatch` and `useAppSelector` from `src/store/hook.ts`.
- Slices: `auth` (session + user) and `theme` (layout, reading preferences).

### Reading Configuration
The reader has multiple configurable options managed in the theme slice:
- `pageType`: long strip vs paged reading
- `readDirection`: LTR/RTL
- `fitType`: fit width/height
- `progressPosition`: progress bar placement
- Constants defined in `src/constants/` (fit, page, panel, progress, readDirection enums).

### Component Organization
- `components/layouts/` — Layout shells (MainLayout, ReadLayout)
- `components/template/` — Layout-specific pieces (Default: Header/Footer/NavMobile, Read: Header)
- `components/shared/` — Reusable components (Card, Loading, Poster, ShareSocial)
- `components/ui/` — UI primitives (Modal, Pagination, Spinner, Toast)
- `views/` — Page-level components (welcome, home, filter, manga, read)

### Type Definitions
Custom types in `src/@types/` — `routes.tsx`, `theme.ts`, `common.ts`, `modal.ts`.

## Key Conventions
- ESLint enforces JSX prop sorting (callbacks last, shorthand first, reserved first)
- `classnames` library for conditional CSS classes
- `react-icons` for icon usage
- `swiper` for carousels/sliders
- `@tippyjs/react` for tooltips
- `react-hot-toast` for notifications (limited to 1 visible toast)
