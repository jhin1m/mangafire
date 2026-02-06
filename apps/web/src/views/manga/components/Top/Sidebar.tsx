import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CSSTransition } from 'react-transition-group'
import type { MangaWithGenres } from '@/services/manga-service'

type SidebarProps = {
  manga: MangaWithGenres
}

const Sidebar = ({ manga }: SidebarProps) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const heightRef = useRef('0px')
  const [openInfo, setOpenInfo] = useState(true)

  useEffect(() => {
    if (nodeRef.current && nodeRef.current.clientHeight) {
      heightRef.current = nodeRef.current.clientHeight + 'px'
    }
  }, [openInfo, nodeRef])

  const handleOpenInfo = () => setOpenInfo((prev) => !prev)

  return (
    <>
      <button
        id="info-rating-btn"
        className="btn collapsed"
        data-toggle="collapse"
        data-target="#info-rating"
        type="button"
        onClick={handleOpenInfo}
      >
        <i className="fa-solid fa-circle-info"></i>
        <span className="mx-2">More information & Rating</span>
        <i className="fa-solid fa-star"></i>
      </button>

      <aside
        className="sidebar"
        style={
          {
            '--height': heightRef.current,
          } as React.CSSProperties
        }
      >
        <CSSTransition
          in={openInfo}
          timeout={300}
          classNames="menu"
          mountOnEnter
          unmountOnExit
          nodeRef={nodeRef}
        >
          <div ref={nodeRef} className="collapse d-block" id="info-rating">
            <div className="meta">
              <div>
                <span>Author:</span>
                <span>{manga.author || 'Unknown'}</span>
              </div>
              <div>
                <span>Published:</span>
                <span>
                  {' '}
                  {manga.releaseYear ? `${manga.releaseYear}` : 'Unknown'} to{' '}
                  {manga.status === 'completed' ? 'Completed' : '?'}{' '}
                </span>
              </div>
              <div>
                <span>Genres:</span>
                <span>
                  {manga.genres.map((g, idx) => (
                    <span key={g.slug}>
                      {idx > 0 && ', '}
                      <Link to={`/genre/${g.slug}`}>{g.name}</Link>
                    </span>
                  ))}
                </span>
              </div>
            </div>
            <div className="rating-box" data-id={manga.id} data-score={manga.rating.toFixed(2)}>
              <div className="score">
                <div>
                  <span className="live-score">{manga.rating.toFixed(2)}</span>/ <span>10</span>
                </div>
              </div>
              <div className="stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} className={star <= Math.round(manga.rating / 2) ? 'active' : ''}>
                    <i className="fa-solid fa-star"></i>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CSSTransition>
      </aside>
    </>
  )
}

export default Sidebar
