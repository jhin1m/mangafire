import { useMangaList } from '@/hooks/use-manga-list'
import { Link } from 'react-router-dom'
import { Loading } from '@/components/shared'

const Recommend = () => {
  const { data, isLoading } = useMangaList({
    limit: 6,
    sortBy: 'rating',
    sortOrder: 'desc',
  })
  const items = data?.items ?? []

  return (
    <section className="side-manga default-style">
      <div className="head">
        <h2>You may also like</h2>
      </div>
      <div className="original card-sm body">
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Loading loading type="gif">
              <div style={{ minHeight: '200px' }} />
            </Loading>
          </div>
        ) : items.length > 0 ? (
          items.map((m) => (
            <Link key={m.slug} className="unit" to={`/manga/${m.slug}`}>
              <div className="poster">
                <div>
                  <img
                    src={m.coverImage || '/placeholder.jpg'}
                    alt={m.title}
                  />
                </div>
              </div>
              <div className="info">
                <h6>{m.title}</h6>
              </div>
            </Link>
          ))
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            No recommendations available
          </div>
        )}
      </div>
    </section>
  )
}

export default Recommend
