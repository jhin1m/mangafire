# Phase 05 - Manga Detail + Chapters Integration

**Status**: ✅ COMPLETED (2026-02-06)
**Report**: [fullstack-developer-260206-1950-phase05-manga-detail.md](../../reports/fullstack-developer-260206-1950-phase05-manga-detail.md)

## Context Links
- Parent: [plan.md](./plan.md)
- Depends on: Phase 01, Phase 02
- Blocks: nothing

## Parallelization Info
- **Can run in parallel with**: Phase 03, Phase 04
- **Exclusive files**: `Manga.tsx`, `Top/Content.tsx`, `Top/Sidebar.tsx`, `Bottom/Content/Chapters.tsx`, `Bottom/Content/List.tsx`, `Bottom/Content/Menu.tsx`, `Bottom/Sidebar/Recommend.tsx`
- **No shared files with any other phase**

## Overview
Replace all hardcoded "Jujutsu Kaisen" data in the manga detail page with dynamic data loaded from `useMangaDetail`, `useChapterList`, and `useVolumeList` hooks. Components read the manga slug from URL params.

## Key Insights
- Manga page currently hardcodes everything: title, description, author, genres, rating, chapter list, volume list, related manga, recommended manga
- URL route is `/manga/:slug` -- slug extracted via `useParams()`
- `Manga.tsx` is the parent that composes: `ContentTop` (poster, info, actions), `SidebarTop` (meta, rating), `ContentBottom` (chapters/volumes), `SidebarBottom` (related, recommend)
- `GET /api/manga/:slug` returns manga + genres in one call
- Chapter list: `GET /api/manga/:slug/chapters` (paginated)
- Volume list: `GET /api/manga/:slug/volumes` (paginated)
- No "related manga" or "recommended manga" endpoint exists -- keep hardcoded or use `useMangaList` with some filter
- `Top/Content.tsx` has `Poster` type (image, title) -- matches coverImage/title
- `Top/Sidebar.tsx` displays author, published date, genres, rating -- all from manga detail
- `List.tsx` has hardcoded 44 chapters + 23 volumes
- `Menu.tsx` has hardcoded language dropdown with chapter counts

## Requirements
1. Manga.tsx: extract slug from URL, pass to children or use hooks in children
2. Top/Content.tsx: display manga poster, title, status, description, type from API
3. Top/Sidebar.tsx: display author, genres, rating from API
4. Bottom/Content/Chapters.tsx + List.tsx: real chapter/volume list from API
5. Bottom/Content/Menu.tsx: language filter connected to chapter query params
6. Loading/error states for all sections
7. Dynamic document title based on manga name

## Architecture

```
Manga.tsx (reads slug from useParams)
  ├── useMangaDetail(slug)
  ├── ContentTop -- receives manga data
  │     └── poster, title, status, description, type, bookmarks
  ├── SidebarTop -- receives manga data
  │     └── author, genres, rating
  ├── ContentBottom
  │     ├── Chapters.tsx
  │     │     ├── Menu.tsx -- language filter (state)
  │     │     └── List.tsx
  │     │           ├── useChapterList(slug, { language })
  │     │           └── useVolumeList(slug)
  └── SidebarBottom
        ├── Related.tsx -- keep hardcoded or useMangaList
        └── Recommend.tsx -- useMangaList({ limit: 6 })
```

## Related Code Files (Exclusive to Phase 05)

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/views/manga/Manga.tsx` | MODIFY | Add useParams, useMangaDetail, pass data to children |
| `apps/web/src/views/manga/components/Top/Content.tsx` | MODIFY | Dynamic poster, title, description, status, type |
| `apps/web/src/views/manga/components/Top/Sidebar.tsx` | MODIFY | Dynamic author, genres, rating |
| `apps/web/src/views/manga/components/Bottom/Content/Chapters.tsx` | MODIFY | Wire chapter/volume hooks |
| `apps/web/src/views/manga/components/Bottom/Content/List.tsx` | MODIFY | Replace hardcoded chapters/volumes with API data |
| `apps/web/src/views/manga/components/Bottom/Content/Menu.tsx` | MODIFY | Dynamic language filter |
| `apps/web/src/views/manga/components/Bottom/Sidebar/Recommend.tsx` | MODIFY | Fetch recommended manga from API |

## Implementation Steps

### Step 1: Update Manga.tsx (parent)
- Add `useParams()` to extract slug
- Add `useMangaDetail(slug)` hook
- Pass manga data as props to child components
- Dynamic document title

```tsx
import { useParams } from 'react-router-dom'
import { useMangaDetail } from '@/hooks/use-manga-detail'

const MangaPage = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: manga, isLoading, error } = useMangaDetail(slug)

  useEffect(() => {
    if (manga) document.title = `${manga.title} Manga - Read Manga Online Free`
  }, [manga])

  if (isLoading) return <Loading loading type="gif"><div /></Loading>
  if (error || !manga) return <div>Manga not found</div>

  return (
    <div id="manga-page">
      <div className="manga-detail">
        <div className="detail-bg">
          <img src={manga.coverImage || '/detail.jpg'} alt={manga.title} />
        </div>
        <div className="container">
          <div className="main-inner">
            <ContentTop manga={manga} />
            <SidebarTop manga={manga} />
          </div>
        </div>
      </div>
      <div className="container">
        <div className="main-inner manga-bottom">
          <ContentBottom slug={slug} />
          <SidebarBottom />
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Update Top/Content.tsx
- Accept `manga` prop instead of hardcoded values
- Display: coverImage, title, alternativeTitles, status, type, description, rating/views

```tsx
type ContentProps = {
  manga: MangaDetail // type from useMangaDetail
}

const Content = ({ manga }: ContentProps) => {
  // Replace hardcoded "Jujutsu Kaisen" with manga.title
  // Replace hardcoded description with manga.description
  // Replace hardcoded status with manga.status
  // Replace hardcoded type link with manga.type
  // Replace hardcoded rating with manga.rating
  // Keep modal for "Read more" with full description
  ...
}
```

### Step 3: Update Top/Sidebar.tsx
- Accept `manga` prop
- Render author, genres (from manga.genres array), rating dynamically
- Genre links: `/genre/${genre.slug}`

```tsx
type SidebarProps = {
  manga: MangaDetail
}

const Sidebar = ({ manga }: SidebarProps) => {
  // ...existing toggle logic...
  // Replace hardcoded author "Gege Akutami" with manga.author
  // Replace hardcoded genre links with manga.genres.map(...)
  // Replace hardcoded rating "9.28" with manga.rating
}
```

### Step 4: Update Chapters.tsx + List.tsx
- Chapters.tsx: accept `slug` prop, pass to List.tsx
- List.tsx: use `useChapterList(slug, { language, sortOrder: 'desc' })` and `useVolumeList(slug)`
- Remove `dataChapters` (44 items) and `dataVolumes` (23 items) hardcoded arrays
- Chapter item: link to `/read/${slug}/chapter-${chapter.number}`
- Volume item: link to `/read/${slug}/volume-${volume.number}`

```tsx
// List.tsx
const ChapterList = ({ tab, slug }: { tab: ENUM_READ_BY; slug: string }) => {
  const { data: chapData, isLoading: chapLoading } = useChapterList(slug, { sortOrder: 'desc' })
  const { data: volData, isLoading: volLoading } = useVolumeList(slug)

  const chapters = chapData?.items ?? []
  const volumes = volData?.items ?? []

  return (
    <div className="list-body">
      {tab === ENUM_READ_BY.CHAPTER && (
        <ul className="scroll-sm">
          {chapters.map((ch) => (
            <Item
              key={ch.number}
              time={new Date(ch.createdAt).toLocaleDateString()}
              title={ch.title || ''}
              chapNumber={ch.number}
              slug={slug}
            />
          ))}
        </ul>
      )}
      {tab === ENUM_READ_BY.VOLUME && (
        <div className="card-md vol-list scroll-sm">
          {volumes.map((vol) => (
            <div key={vol.id} className="unit item" data-number={vol.number}>
              <Link to={`/read/${slug}/volume-${vol.number}`}>
                <div className="poster">
                  <div><img src={vol.coverImage || '/placeholder.jpg'} alt={`Vol ${vol.number}`} loading="lazy" /></div>
                </div>
                <span>Vol {vol.number}</span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### Step 5: Update Menu.tsx
- Replace hardcoded language links with dynamic data
- Language state managed locally, passed to parent to trigger chapter refetch
- For MVP: keep simple EN-only or derive languages from chapter data in future

```tsx
// Simplified: keep existing language dropdown UI
// Add onLanguageChange callback to propagate to List.tsx
// For now, default to 'en' and keep hardcoded language options
// Dynamic language detection is a follow-up enhancement
```

### Step 6: Update Recommend.tsx
- Replace hardcoded 6-item recommend list with `useMangaList({ limit: 6, sortBy: 'rating', sortOrder: 'desc' })`
- Map to simple card display

```tsx
const Recommend = () => {
  const { data } = useMangaList({ limit: 6, sortBy: 'rating', sortOrder: 'desc' })
  const items = data?.items ?? []

  return (
    <section className="side-manga default-style">
      <div className="head"><h2>You may also like</h2></div>
      <div className="original card-sm body">
        {items.map((m) => (
          <a key={m.slug} className="unit" href={`/manga/${m.slug}`}>
            <div className="poster">
              <div><img src={m.coverImage || '/placeholder.jpg'} alt={m.title} /></div>
            </div>
            <div className="info">
              <h6>{m.title}</h6>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
```

## Todo
- [x] Update Manga.tsx -- add useParams, useMangaDetail, pass props
- [x] Update Top/Content.tsx -- accept manga prop, render dynamic data
- [x] Update Top/Sidebar.tsx -- accept manga prop, render genres/author/rating
- [x] Update Chapters.tsx -- accept slug prop, pass to children
- [x] Update List.tsx -- replace hardcoded data with useChapterList + useVolumeList
- [x] Update Menu.tsx -- keep language dropdown functional (MVP: static options)
- [x] Update Recommend.tsx -- fetch from useMangaList
- [ ] Test with real manga slug in URL (manual testing required)
- [ ] Verify chapter links point to correct read routes (manual testing required)

## Success Criteria
- `/manga/some-real-slug` loads manga data from API
- Title, description, author, genres, rating all dynamic
- Chapter list populated from API with correct links
- Volume list populated from API
- Recommend section shows real manga
- Loading states shown during fetch
- 404-like state shown for invalid slugs
- `pnpm type-check` passes

## Conflict Prevention
- Only manga detail view files modified
- No overlap with home page (Phase 03) or filter (Phase 04)
- Shared components (Card, Poster, Loading, Modal) used but NOT modified
- Hooks imported but NOT modified

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Props threading through 3+ levels | Medium | Low | Keep prop drilling simple; context overkill for this |
| Missing coverImage in API data | Medium | Low | Fallback to `/detail.jpg` or placeholder |
| Chapter links format mismatch with read route | Medium | High | Verify read route pattern: `/read/:slug/:lang?/:chapter?` |
| No related manga endpoint | High | Low | Keep Related.tsx hardcoded or fetch top-rated |

## Security
- Manga detail is public, no auth needed
- Chapters are public reads
- No user data exposed

## Next Steps
After this phase, all 3 major page types (home, filter, detail) are API-driven. Future work: reader page integration, bookmark functionality, admin CRUD UI.

## Unresolved Questions
1. Read route format is `/read/:slug/:lang?/:chapter?` -- how should chapter links format the URL? e.g., `/read/jujutsu-kaisen/en/chapter-241` or `/read/jujutsu-kaisen/en/241`? Need to check existing read route config.
2. Menu.tsx language dropdown -- should languages be dynamically fetched (e.g., by querying chapters with distinct languages)? Recommendation: defer, keep static for MVP.
3. Related.tsx has hardcoded related manga -- no API endpoint. Keep hardcoded or remove section? Recommendation: keep hardcoded for now, note as future backend work.
4. `manga.genres` shape from `GET /api/manga/:slug` -- confirmed returns `{ id, name, slug }[]` from `fetchMangaGenres`. Need to ensure shared type covers this.
