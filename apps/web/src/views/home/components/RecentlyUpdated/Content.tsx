import type { Genre } from '@mangafire/shared/types'
import type { MangaListItem } from '@/services/manga-service'

import { Card, Loading } from '@/components/shared'
import { useMangaList } from '@/hooks/use-manga-list'
import { mapChaptersForCard } from '@/utils/format-manga'

const TYPE_MAP: Record<string, string> = {
  manga: 'Manga',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  one_shot: 'One-shot',
  doujinshi: 'Doujinshi',
}

function toGenreItem(m: MangaListItem): Genre {
  return {
    image: m.coverImage || '/placeholder.jpg',
    type: TYPE_MAP[m.type] || m.type,
    title: m.title,
    slug: m.slug,
    chapters: mapChaptersForCard(m.slug, m.latestChapters),
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
