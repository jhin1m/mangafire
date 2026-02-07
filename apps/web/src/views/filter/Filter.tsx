import React, { useEffect } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'

import { Filter, Head } from './components'

import { Card, Loading } from '@/components/shared'
import { Pagination } from '@/components/ui'
import { useMangaList } from '@/hooks/use-manga-list'
import { useGenres } from '@/hooks/use-genres'
import type { MangaQueryParams, MangaStatus, MangaType } from '@mangafire/shared/types'
import type { MangaListItem } from '@/services/manga-service'
import { mapChaptersForCard } from '@/utils/format-manga'

// Route-specific defaults: each page gets its own sort + title
const ROUTE_CONFIG: Record<
  string,
  { title: string; sortBy: MangaQueryParams['sortBy']; sortOrder: 'asc' | 'desc' }
> = {
  '/newest': { title: 'Newest', sortBy: 'releaseYear', sortOrder: 'desc' },
  '/updated': { title: 'Updated', sortBy: 'updatedAt', sortOrder: 'desc' },
  '/added': { title: 'Recently Added', sortBy: 'createdAt', sortOrder: 'desc' },
  '/filter': { title: 'Filter', sortBy: 'createdAt', sortOrder: 'desc' },
}

const DEFAULT_ROUTE_CONFIG = ROUTE_CONFIG['/filter']

function buildApiParams(
  searchParams: URLSearchParams,
  routeDefaults: { sortBy?: MangaQueryParams['sortBy']; sortOrder?: 'asc' | 'desc' },
  genreIdFromSlug?: number
): MangaQueryParams {
  const params: MangaQueryParams = { limit: 30 }
  const page = searchParams.get('page')
  const keyword = searchParams.get('keyword')
  const type = searchParams.get('type')
  const genre = searchParams.get('genre')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort')

  if (page) params.page = Number(page)
  if (keyword) params.search = keyword
  if (type) params.type = type.split(',')[0] as MangaType
  if (status) params.status = status.split(',')[0] as MangaStatus

  // Genre: URL query param takes priority, then slug-derived genreId
  if (genre) {
    params.genreId = Number(genre.split(',')[0])
  } else if (genreIdFromSlug) {
    params.genreId = genreIdFromSlug
  }

  // Sort: URL query param takes priority, then route defaults
  if (sort) {
    params.sortBy = sort as MangaQueryParams['sortBy']
    params.sortOrder = 'desc'
  } else if (routeDefaults) {
    params.sortBy = routeDefaults.sortBy
    params.sortOrder = routeDefaults.sortOrder
  }

  return params
}

function mapMangaToCard(m: MangaListItem) {
  return {
    image: m.coverImage || '/placeholder.jpg',
    type: m.type.charAt(0).toUpperCase() + m.type.slice(1),
    title: m.title,
    slug: m.slug,
    chapters: mapChaptersForCard(m.slug, m.latestChapters),
  }
}

const FilterPage = () => {
  const location = useLocation()
  const { slug: genreSlug } = useParams<{ slug: string }>()
  const { data: genres = [] } = useGenres()
  const [searchParams, setSearchParams] = useSearchParams({ page: '1' })
  const page = searchParams.get('page') || 1

  // Derive route config based on current pathname
  const pathname = location.pathname
  const isGenreRoute = pathname.startsWith('/genre/')
  const routeConfig = isGenreRoute
    ? { title: '', sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
    : ROUTE_CONFIG[pathname] || DEFAULT_ROUTE_CONFIG

  // Resolve genre slug to genreId for /genre/:slug routes
  const genreFromSlug = genreSlug
    ? genres.find((g) => g.slug === genreSlug)
    : undefined
  const pageTitle = isGenreRoute && genreFromSlug ? genreFromSlug.name : routeConfig.title

  const apiParams = buildApiParams(searchParams, routeConfig, genreFromSlug?.id)
  const { data, isLoading } = useMangaList(apiParams)
  const items = data?.items ?? []
  const meta = data?.meta

  useEffect(() => {
    document.title = `${pageTitle} - MangaFire`
  }, [pageTitle])

  const handleChangePage = (page: number) => {
    setSearchParams(
      (prev) => {
        prev.set('page', page.toString())
        return prev
      },
      { replace: true }
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.target as HTMLFormElement)
    const keyword = formData.get('keyword') || ''
    const type = formData.getAll('type[]') || ''
    const genre = formData.getAll('genre[]') || ''
    const status = formData.getAll('status[]') || ''
    const year = formData.getAll('year[]') || ''
    const language = formData.getAll('language[]') || ''
    const length = formData.get('length') || ''
    const sort = formData.get('sort') || ''
    setSearchParams(
      (prev) => {
        prev.set('page', page.toString())
        keyword && prev.set('keyword', keyword.toString())
        type && prev.set('type', type.join(',').toString())
        genre && prev.set('genre', genre.join(',').toString())
        status && prev.set('status', status.join(',').toString())
        year && prev.set('year', year.join(',').toString())
        language && prev.set('language', language.join(',').toString())
        length && prev.set('length', length.toString())
        sort && prev.set('sort', sort?.toString())
        return prev
      },
      { replace: true }
    )
  }

  return (
    <div className="container">
      <section className="mt-5">
        <Head title={pageTitle} count={meta?.total} />
        <Filter handleSubmit={handleSubmit} />
        <Loading loading={isLoading} type="gif">
          {items.length > 0 ? (
            <div className="original card-lg">
              {items.map((item, index) => (
                <Card key={item.slug} item={mapMangaToCard(item)} index={index + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center p-4">No manga found</div>
          )}
        </Loading>
        {meta && (
          <Pagination
            total={meta.total}
            currentPage={meta.page}
            pageSize={meta.limit}
            onChange={handleChangePage}
          />
        )}
      </section>
    </div>
  )
}

export default FilterPage
