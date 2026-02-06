import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Navigation } from 'swiper/modules'
import type { Manga } from '@mangafire/shared/types'

import TrendingCard from './TrendingCard'
import { useMangaList } from '@/hooks/use-manga-list'

type TrendingItem = {
  slug: string
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

function toTrendingItem(m: Manga): TrendingItem {
  const statusMap: Record<string, string> = {
    ongoing: 'Releasing',
    completed: 'Completed',
    hiatus: 'Hiatus',
    cancelled: 'Cancelled',
  }

  return {
    slug: m.slug,
    image: m.coverImage || '/placeholder.jpg',
    title: m.title,
    desc: m.description || '',
    releasing: statusMap[m.status] || m.status,
    chapterAndVolume: '',
    genres: [],
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
