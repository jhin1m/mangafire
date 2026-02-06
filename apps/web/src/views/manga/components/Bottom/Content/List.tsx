import { ENUM_READ_BY } from '@/@types/common'
import { Loading } from '@/components/shared'
import { Link } from 'react-router-dom'
import { useChapterList } from '@/hooks/use-chapters'
import { useVolumeList } from '@/hooks/use-volumes'

type ChapterListProps = {
  tab: ENUM_READ_BY
  slug: string
}

const ChapterList = (props: ChapterListProps) => {
  const { tab, slug } = props
  const { data: chapData, isLoading: chapLoading } = useChapterList(slug, {
    sortOrder: 'desc',
  })
  const { data: volData, isLoading: volLoading } = useVolumeList(slug)

  const chapters = chapData?.items ?? []
  const volumes = volData?.items ?? []

  return (
    <div className="list-body">
      {tab === ENUM_READ_BY.CHAPTER && (
        <>
          {chapLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Loading loading type="gif">
                <div style={{ minHeight: '200px' }} />
              </Loading>
            </div>
          ) : chapters.length > 0 ? (
            <ul className="scroll-sm">
              {chapters.map((ch) => (
                <Item
                  key={ch.id}
                  time={new Date(ch.createdAt).toLocaleDateString()}
                  title={ch.title || ''}
                  chapNumber={ch.number.toString()}
                  slug={slug}
                />
              ))}
            </ul>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              No chapters available
            </div>
          )}
        </>
      )}

      {tab === ENUM_READ_BY.VOLUME && (
        <>
          {volLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <Loading loading type="gif">
                <div style={{ minHeight: '200px' }} />
              </Loading>
            </div>
          ) : volumes.length > 0 ? (
            <div className="card-md vol-list scroll-sm">
              {volumes.map((vol) => (
                <div
                  key={vol.id}
                  className="unit item"
                  data-number={vol.number}
                >
                  <Link to={`/read/${slug}/en/volume-${vol.number}`}>
                    <div className="poster">
                      <div>
                        <img
                          src={vol.coverImage || '/placeholder.jpg'}
                          alt={`Vol ${vol.number}`}
                          loading="lazy"
                        />
                      </div>
                    </div>
                    <span>Vol {vol.number}</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              No volumes available
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ChapterList

type ItemProps = {
  time: string
  chapNumber: string
  title: string
  slug: string
}

function Item(props: ItemProps) {
  const { time, chapNumber, title, slug } = props
  return (
    <li className="item" data-number={chapNumber}>
      <Link
        to={`/read/${slug}/en/chapter-${chapNumber}`}
        title={chapNumber}
      >
        <span>
          Chapter {chapNumber}
          {title ? `: ${title}` : ''}
        </span>
        <span>{time}</span>
      </Link>
    </li>
  )
}
