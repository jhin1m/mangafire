import { useSearchParams } from 'react-router-dom'
import { useSearchFull } from '@/hooks/use-search'
import { SearchFilters } from '@/components/shared/SearchFilters'
import Loading from '@/components/shared/Loading'
import Card from '@/components/shared/Card'
import Pagination from '@/components/ui/Pagination'
import type { SearchParams } from '@mangafire/shared/types'
import { mapChaptersForCard } from '@/utils/format-manga'

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const params: SearchParams = {
    q: searchParams.get('q') || '',
    status: searchParams.get('status') || undefined,
    type: searchParams.get('type') || undefined,
    genreId: searchParams.get('genreId') ? Number(searchParams.get('genreId')) : undefined,
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
  }

  const { data, isLoading } = useSearchFull(params)
  const items = data?.items ?? []
  const meta = data?.meta

  // Build active filters for chips
  const activeFilters = []
  if (params.status) activeFilters.push({ id: 'status', label: `Status: ${params.status}`, type: 'status' as const })
  if (params.type) activeFilters.push({ id: 'type', label: `Type: ${params.type}`, type: 'type' as const })

  const handleRemoveFilter = (id: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete(id)
    newParams.set('page', '1')
    setSearchParams(newParams)
  }

  const handleClearFilters = () => {
    const newParams = new URLSearchParams()
    if (params.q) newParams.set('q', params.q)
    setSearchParams(newParams)
  }

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', String(page))
    setSearchParams(newParams)
  }

  if (!params.q) {
    return (
      <div className="container">
        <div className="unit">
          <h1>Search</h1>
          <p className="text-muted">Enter a search query to find manga.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <section className="mt-5">
        <div className="unit">
          <h1>Search results for "{params.q}"</h1>

          {activeFilters.length > 0 && (
            <SearchFilters
              filters={activeFilters}
              onRemove={handleRemoveFilter}
              onClear={handleClearFilters}
            />
          )}
        </div>

        <Loading loading={isLoading} type="gif">
          {items.length === 0 ? (
            <div className="text-center p-4">
              <p className="text-muted">No manga found for "{params.q}"</p>
            </div>
          ) : (
            <div className="original card-lg">
              {items.map((item, index) => (
                <Card
                  key={item.id}
                  item={{
                    image: item.coverImage || '/placeholder.jpg',
                    type: item.type.charAt(0).toUpperCase() + item.type.slice(1),
                    title: item.title,
                    slug: item.slug,
                    chapters: mapChaptersForCard(item.slug, item.latestChapters),
                  }}
                  index={index + 1}
                />
              ))}
            </div>
          )}
        </Loading>

        {meta && meta.total > 0 && (
          <Pagination
            total={meta.total}
            currentPage={meta.page}
            pageSize={meta.limit}
            onChange={handlePageChange}
          />
        )}
      </section>
    </div>
  )
}

export default Search
