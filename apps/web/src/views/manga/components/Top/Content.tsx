import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { MangaWithGenres } from '@/services/manga-service'
import { ShareSocial } from '@/components/shared'
import Modal from '@/components/ui/Modal'

type ContentProps = {
  manga: MangaWithGenres
}

const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1)

const Content = ({ manga }: ContentProps) => {
  const [isReadMore, setIsReadMore] = useState(false)

  const handleOpenModal = () => setIsReadMore(true)
  const handleCloseModal = () => setIsReadMore(false)

  const description = manga.description || 'No description available.'
  const truncatedDescription =
    description.length > 150 ? description.slice(0, 150) + '...' : description

  return (
    <aside className="content">
      <div className="poster">
        <div>
          <img src={manga.coverImage || '/detail.jpg'} alt={manga.title} />
        </div>
      </div>
      <div className="info">
        <p>{capitalize(manga.status)}</p>
        <h1>{manga.title}</h1>
        <h6>{manga.alternativeTitles?.join('; ') || ''}</h6>
        <div className="actions">
          <Link
            className="btn btn-lg btn-primary readnow"
            to={`/read/${manga.slug}`}
          >
            <span>Start Reading</span>
            <span>Read Now</span>
            <i className="fa-solid fa-play fa-xs"></i>
          </Link>
          <div className="bookmark dropright favourite">
            <button className="btn btn-lg btn-secondary1 h-100" type="button">
              <span>Bookmark</span>
              <i className="fa-solid fa-bookmark fa-xs"></i>
            </button>
            <div className="dropdown-menu dropdown-menu-right folders"></div>
          </div>
        </div>
        <div className="min-info">
          <Link to={`/type/${manga.type}`}>{capitalize(manga.type)}</Link>
          <span>
            <i className="fa-regular fa-folder-bookmark"></i> {manga.views || 0}
          </span>
          <span>
            <b>{manga.rating.toFixed(2)}</b>
          </span>
        </div>
        <div className="description">{truncatedDescription}</div>
        <button className="readmore" onClick={handleOpenModal}>
          Read more +
        </button>
        <ShareSocial className="mt-3 justify-content-center justify-content-md-start" />
      </div>

      <Modal open={isReadMore} onClose={handleCloseModal}>
        {description}
      </Modal>
    </aside>
  )
}

export default Content
