import { useRef, useState } from 'react'
import classNames from 'classnames'
import { SwiperRef } from 'swiper/react'
import { Link } from 'react-router-dom'
import { FIT_ENUM } from '@/constants/fit.constant'
import { PAGE_ENUM } from '@/constants/page.constant'
import {
  setActiveSwiper,
  setPageIndex,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import { DoubleImage, LongStripImage, Single } from './components'
import { useReader } from '@/contexts/reader-context'
import Spinner from '@/components/ui/Spinner'

export const fitClassName = {
  [FIT_ENUM.FIT_WIDTH]: 'fit-w',
  [FIT_ENUM.FIT_HEIGHT]: 'fit-h',
  [FIT_ENUM.FIT_BOTH]: 'fit-w fit-h',
  [FIT_ENUM.FIT_NO_LIMIT]: '',
}

const Read = () => {
  const swiperRef = useRef<SwiperRef>(null)
  const [isClickable, setIsClickable] = useState(true)
  const dispatch = useAppDispatch()
  const { pageType, pageIndex, fitType, activeSwiper, isSwiping } =
    useAppSelector((state) => state.theme)

  // Real data from API via ReaderContext
  const { pages, navigation, totalPages, mangaSlug, language, isLoading, isError } =
    useReader()

  const handleChangePage = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (!isClickable) return
    if (!['singlepage', 'doublepage'].includes(pageType)) return
    const clickX =
      e.clientX - (e.target as HTMLDivElement).getBoundingClientRect().left
    const divWidth = (e.target as HTMLDivElement).offsetWidth
    const leftPercentage = (clickX / divWidth) * 100
    const rightPercentage = 100 - leftPercentage
    setIsClickable(false)
    if (leftPercentage <= 30 && pageIndex > 1) {
      dispatch(setPageIndex(pageIndex - 1))
      dispatch(setActiveSwiper(activeSwiper - 1))
      isSwiping && swiperRef.current?.swiper.slidePrev()
    }
    if (rightPercentage <= 30 && pageIndex < totalPages && pageIndex >= 1) {
      dispatch(setPageIndex(pageIndex + 1))
      dispatch(setActiveSwiper(activeSwiper + 1))
      isSwiping && swiperRef.current?.swiper.slideNext()
    }
    setTimeout(() => setIsClickable(true), isSwiping ? 300 : 0)
  }

  // Build chapter navigation links
  const prevChapterLink = navigation?.prev
    ? `/read/${mangaSlug}/${language}/chapter-${navigation.prev.number}`
    : null
  const nextChapterLink = navigation?.next
    ? `/read/${mangaSlug}/${language}/chapter-${navigation.next.number}`
    : null

  if (isLoading) {
    return (
      <div className="pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Spinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-muted">Failed to load chapter. Please try again.</p>
      </div>
    )
  }

  if (pages.length === 0) {
    return (
      <div className="pages" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <p className="text-muted">No pages available for this chapter.</p>
      </div>
    )
  }

  return (
    <div
      className={classNames(
        'pages',
        pageType,
        pageType === PAGE_ENUM.SINGLE && isSwiping && 'swiper'
      )}
      dir="ltr"
      onClick={handleChangePage}
    >
      {pageType === PAGE_ENUM.LONG_STRIP && (
        <>
          {pages.map((page, index) => (
            <LongStripImage key={page.id} src={page.imageUrl} index={index} />
          ))}
        </>
      )}
      <Single
        ref={swiperRef as React.ForwardedRef<React.RefObject<SwiperRef>>}
      />
      {pageType === PAGE_ENUM.DOUBLE && (
        <div className={classNames('page', fitClassName[fitType])}>
          {pages.map((page, index) => (
            <DoubleImage key={page.id} src={page.imageUrl} index={index + 1} />
          ))}
        </div>
      )}

      <div
        className={classNames(
          'number-nav ltr',
          pageType !== PAGE_ENUM.LONG_STRIP && 'abs show'
        )}
      >
        {prevChapterLink ? (
          <Link to={prevChapterLink} className="prev">
            <i className="ltr-icon fa-light fa-arrow-left mr-1"></i>
            <i className="rtl-icon fa-light fa-arrow-right ml-1"></i>
            Previous chapter
          </Link>
        ) : (
          <span className="prev disabled">
            <i className="ltr-icon fa-light fa-arrow-left mr-1"></i>
            Previous chapter
          </span>
        )}
        {nextChapterLink ? (
          <Link to={nextChapterLink} className="next">
            Next chapter
            <i className="ltr-icon fa-light fa-arrow-right ml-1"></i>
            <i className="rtl-icon fa-light fa-arrow-left mr-1"></i>
          </Link>
        ) : (
          <span className="next disabled">
            Next chapter
            <i className="ltr-icon fa-light fa-arrow-right ml-1"></i>
          </span>
        )}
      </div>
    </div>
  )
}

export default Read
