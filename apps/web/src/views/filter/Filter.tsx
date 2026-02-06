import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { Filter, Head } from './components'

import { Card, Loading } from '@/components/shared'
import { Pagination } from '@/components/ui'
import { useMangaList } from '@/hooks/use-manga-list'
import type { MangaQueryParams, MangaStatus, MangaType } from '@mangafire/shared/types'
import type { MangaListItem } from '@/services/manga-service'
import { mapChaptersForCard } from '@/utils/format-manga'

function buildApiParams(searchParams: URLSearchParams): MangaQueryParams {
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
  if (genre) params.genreId = Number(genre.split(',')[0])
  if (status) params.status = status.split(',')[0] as MangaStatus
  if (sort) {
    params.sortBy = sort as MangaQueryParams['sortBy']
    params.sortOrder = 'desc'
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
  const [searchParams, setSearchParams] = useSearchParams({
    page: '1',
  })
  const page = searchParams.get('page') || 1

  const apiParams = buildApiParams(searchParams)
  const { data, isLoading } = useMangaList(apiParams)
  const items = data?.items ?? []
  const meta = data?.meta

  useEffect(() => {
    document.title = 'Filter - MangaFire'
  }, [])

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
        <Head />
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
