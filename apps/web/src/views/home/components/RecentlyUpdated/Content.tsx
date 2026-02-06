import type { Manga, Genre } from '@mangafire/shared/types'

import { Card, Loading } from '@/components/shared'
import { useMangaList } from '@/hooks/use-manga-list'

function toGenreItem(m: Manga): Genre {
  const typeMap: Record<string, string> = {
    manga: 'Manga',
    manhwa: 'Manhwa',
    manhua: 'Manhua',
    one_shot: 'One-shot',
    doujinshi: 'Doujinshi',
  }

  return {
    image: m.coverImage || '/placeholder.jpg',
    type: typeMap[m.type] || m.type,
    title: m.title,
    chapters: [],
  }
}

const Content = () => {
  const { data, isLoading } = useMangaList({
    sortBy: 'createdAt',
    limit: 12,
    sortOrder: 'desc',
  })

  const items = (data?.items ?? []).map(toGenreItem)

  return (
    <Loading loading={isLoading} type="gif">
      <div className="tab-content" data-name="all">
        <div className="original card-lg">
          {items.map((item, index) => (
            <Card key={index} item={item} index={index + 1} />
          ))}
        </div>
      </div>
    </Loading>
  )
}

export default Content
