import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useMangaDetail } from '@/hooks/use-manga-detail'
import { Loading } from '@/components/shared'
import {
  ContentBottom,
  ContentTop,
  SidebarBottom,
  SidebarTop,
} from './components'

const MangaPage = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const { data: manga, isLoading, error } = useMangaDetail(slug)

  useEffect(() => {
    if (manga) {
      document.title = `${manga.title} Manga - Read Manga Online Free`
    }
  }, [manga])

  if (isLoading) {
    return (
      <Loading loading type="gif">
        <div className="container" style={{ minHeight: '50vh' }} />
      </Loading>
    )
  }

  if (error || !manga) {
    return (
      <div className="container text-center p-5">
        <h2>Manga not found</h2>
        <p>The manga you are looking for does not exist.</p>
      </div>
    )
  }

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

export default MangaPage
