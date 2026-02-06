import React, { useEffect, forwardRef } from 'react'
import classNames from 'classnames'
import { EffectFade } from 'swiper/modules'
import { Swiper, SwiperSlide, SwiperRef } from 'swiper/react'
import Image from '../Image'
import { fitClassName } from '../../Read'
import { PAGE_ENUM } from '@/constants/page.constant'
import {
  setActiveSwiper,
  setPageIndex,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import { useReader } from '@/contexts/reader-context'

type SingleProps = {}

const Single = forwardRef<React.RefObject<SwiperRef>, SingleProps>(
  (props, ref) => {
    const dispatch = useAppDispatch()
    const { pageType, fitType, activeSwiper, pageIndex, isSwiping } =
      useAppSelector((state) => state.theme)

    // Get real pages from API
    const { pages } = useReader()

    useEffect(() => {
      if (!ref) return
      const swiperRef = ref as React.RefObject<SwiperRef>
      if (swiperRef.current && swiperRef.current.swiper) {
        swiperRef.current?.swiper.slideTo(activeSwiper - 1)
      }
    }, [ref, activeSwiper])

    if (pageType !== PAGE_ENUM.SINGLE) return <></>

    if (isSwiping) {
      return (
        <Swiper
          ref={ref as React.RefObject<SwiperRef>}
          modules={[EffectFade]}
          speed={500}
          grabCursor={true}
          slidesPerView="auto"
          className="pages singlepage"
          wrapperClass="page fit-w"
          onSlideChange={(swiper) => {
            dispatch(setPageIndex(swiper.activeIndex + 1))
            dispatch(setActiveSwiper(swiper.activeIndex + 1))
          }}
        >
          {pages.map((page) => (
            <SwiperSlide key={page.id} className="img loaded">
              <img
                src={page.imageUrl}
                className={fitClassName[fitType]}
                referrerPolicy="no-referrer"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )
    }

    if (!isSwiping) {
      return (
        <div className={classNames('page', fitClassName[fitType])}>
          {pages.map((page, index) => (
            <Image
              key={page.id}
              src={page.imageUrl}
              number={index + 1}
              wrapperClassName={classNames(
                'loaded',
                pageIndex === index + 1 ? 'd-block' : 'd-none'
              )}
              imageClassName={fitClassName[fitType]}
            />
          ))}
        </div>
      )
    }
  }
)

export default Single
