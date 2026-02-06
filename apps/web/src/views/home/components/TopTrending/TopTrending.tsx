import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Navigation } from 'swiper/modules'
import type { MangaListItem } from '@/services/manga-service'

import TrendingCard from './TrendingCard'
import { useMangaList } from '@/hooks/use-manga-list'

type TrendingItem = {
  slug: string
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: { name: string; slug: string }[]
}

const STATUS_MAP: Record<string, string> = {
  ongoing: 'Releasing',
  completed: 'Completed',
  hiatus: 'Hiatus',
  cancelled: 'Cancelled',
}

function toTrendingItem(m: MangaListItem): TrendingItem {
  // Build "Chap X - Vol Y" string from latest chapter
  const latest = m.latestChapters[0]
  const chapterAndVolume = latest ? `Chap ${latest.number}` : ''

  return {
    slug: m.slug,
    image: m.coverImage || '/placeholder.jpg',
    title: m.title,
    desc: m.description || '',
    releasing: STATUS_MAP[m.status] || m.status,
    chapterAndVolume,
    genres: m.genres.map((g) => ({ name: g.name, slug: g.slug })),
  }
}

const TopTrending = () => {
  const { data, isLoading } = useMangaList({
    sortBy: 'views',
    limit: 10,
    sortOrder: 'desc',
  })

  const items = (data?.items ?? []).map(toTrendingItem)

  if (isLoading || items.length === 0) return null

  return (
    <div id="top-trending">
      <div className="container">
        <Swiper
          modules={[Autoplay, EffectFade, Navigation]}
          loop
          speed={300}
          slidesPerView="auto"
          autoplay={{
            delay: 10000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          navigation={{
            nextEl: '.trending-button-next',
            prevEl: '.trending-button-prev',
          }}
        >
          {items.map((item, index) => (
            <SwiperSlide key={item.slug}>
              <TrendingCard item={item} index={index + 1} />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="trending-button-next" role="button"></div>
        <div className="trending-button-prev" role="button"></div>
      </div>
    </div>
  )
}

export default TopTrending
