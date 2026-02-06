import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Pagination, Navigation } from 'swiper/modules'
import type { Manga, Poster as PosterType } from '@mangafire/shared/types'

import Head from './Head'
import { Poster } from '@/components/shared'
import { useMangaList } from '@/hooks/use-manga-list'

function toPosterItem(m: Manga): PosterType {
  return {
    image: m.coverImage || '/placeholder.jpg',
    title: m.title,
    link: `/manga/${m.slug}`,
  }
}

const NewRelease = () => {
  const { data } = useMangaList({
    sortBy: 'createdAt',
    limit: 20,
    sortOrder: 'desc',
  })

  const items = (data?.items ?? []).map(toPosterItem)

  return (
    <section className="home-swiper">
      <Head />
      <Swiper
        modules={[EffectFade, Pagination, Navigation]}
        speed={300}
        slidesPerView="auto"
        pagination={{
          el: '.completed-pagination',
        }}
        navigation={{
          nextEl: '.complete-button-next-release',
          prevEl: '.complete-button-prev-release',
        }}
      >
        {items.map((item, index) => (
          <SwiperSlide key={index}>
            <Poster item={item} index={index + 1} />
          </SwiperSlide>
        ))}
        <div className="completed-pagination"></div>
      </Swiper>
    </section>
  )
}

export default NewRelease
