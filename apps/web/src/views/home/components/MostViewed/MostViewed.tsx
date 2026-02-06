import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Pagination } from 'swiper/modules'
import type { Manga, Poster as PosterType } from '@mangafire/shared/types'

import Head from './Head'
import { Loading, Poster } from '@/components/shared'
import { useMangaList } from '@/hooks/use-manga-list'

function toPosterItem(m: Manga): PosterType {
  return {
    image: m.coverImage || '/placeholder.jpg',
    title: m.title,
    link: `/manga/${m.slug}`,
    views: m.views,
  }
}

const MostViewed = () => {
  const { data, isLoading } = useMangaList({
    sortBy: 'views',
    limit: 10,
    sortOrder: 'desc',
  })

  const items = (data?.items ?? []).map(toPosterItem)

  return (
    <section className="home-swiper" id="most-viewed">
      <Head />
      <Loading loading={isLoading} type="gif">
        <div
          className="tab-content"
          data-name="day"
          style={{ display: 'block' }}
        >
          <Swiper
            modules={[EffectFade, Pagination]}
            speed={300}
            slidesPerView="auto"
            pagination={{
              progressbarFillClass: 'swiper-pagination-progressbar-fill',
              type: 'progressbar',
            }}
          >
            {items.map((item, index) => (
              <SwiperSlide key={index}>
                <Poster item={item} index={index + 1} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </Loading>
    </section>
  )
}

export default MostViewed
