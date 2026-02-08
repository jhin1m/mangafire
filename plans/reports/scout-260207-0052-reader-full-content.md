# Reader Files - Full Content

## 1. read.css (505 lines)

```css
html,
body {
  scroll-behavior: smooth;
}

body.read {
  --header-padding: 4.3rem;
}

body.read.header-hidden {
  --header-padding: 0rem;
}

body.read .viewing {
  margin-left: 1rem;
}

body.read .viewing b {
  white-space: nowrap;
}

body.read #show-ctrl-menu {
  margin-left: 1rem;
  white-space: nowrap;
}

body.read #show-ctrl-menu span {
  margin-left: 0.2rem;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.1rem;
}

body.read header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  transition: right 0.3s;
  height: 1.5rem;
  border: none;
}

body.read.header-hidden header {
  height: 0px;
}

body.read header .inner {
  background: #141d2c;
  border-bottom: 1px solid #1e2c43;
  top: 0;
  position: relative;
  transition: top 0.3s;
}

body.read header.hidden .inner {
  top: -4.3rem;
}

body.read header:hover .inner {
  top: 0;
}

body.read main {
  display: flex;
  width: 100%;
  height: 100vh;
  padding: 0;
  overflow: hidden;
}

body.read main .m-content {
  width: 1px;
  flex-grow: 1;
  position: relative;
  padding-top: var(--header-padding);
}

body.read main .m-content .message {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.read main .m-content .message .inner {
  background: #141d2c;
  border-radius: 0.5rem;
  padding: 1rem;
  max-width: 20rem;
  text-align: center;
}

body.read main .m-content .loading:before {
  content: '';
  background: url(/loading.gif) no-repeat center;
  width: 50px;
  height: 50px;
  animation: unset;
  background-size: contain;
  border: none;
  opacity: 0.5;
}

body.read main .m-content #page-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  display: block;
  --number-nav-height: 0rem;
}

body.read main .m-content #page-wrapper.on-last-page {
  --number-nav-height: 3rem;
}

body.read main .m-content #page-wrapper .pages {
  width: 100%;
}

body.read main .m-content #page-wrapper .pages.longstrip {
  display: block;
}

body.read main .m-content #page-wrapper .pages.doublepage,
body.read main .m-content #page-wrapper .pages.singlepage {
  display: block;
  width: auto;
  height: calc(100% - var(--number-nav-height));
}

body.read main .m-content #page-wrapper .pages.doublepage .page,
body.read main .m-content #page-wrapper .pages.singlepage .page {
  display: flex;
  width: 100%;
  min-height: 100%;
  align-items: center;
}

body.read main .m-content #page-wrapper .pages.doublepage .page .img,
body.read main .m-content #page-wrapper .pages.singlepage .page .img {
  flex-grow: 1;
  flex-shrink: 0;
  flex-basis: fit-content;
}

body.read main .m-content #page-wrapper .pages.doublepage .page.fit-w .img,
body.read main .m-content #page-wrapper .pages.singlepage .page.fit-w .img {
  flex-shrink: 1;
}

body.read main .m-content #page-wrapper .pages.doublepage.swiper,
body.read main .m-content #page-wrapper .pages.singlepage.swiper {
  overflow: hidden;
}

body.read
  main
  .m-content
  #page-wrapper
  .pages.doublepage.swiper
  .page.fit-w
  .img,
body.read
  main
  .m-content
  #page-wrapper
  .pages.singlepage.swiper
  .page.fit-w
  .img {
  flex-shrink: 0;
}

body.read main .m-content #page-wrapper .pages.doublepage.swiper .page .img,
body.read main .m-content #page-wrapper .pages.singlepage.swiper .page .img {
  flex-basis: auto;
  display: flex;
  align-items: center;
}

body.read main .m-content #page-wrapper .pages.doublepage.swiper .page .img img,
body.read
  main
  .m-content
  #page-wrapper
  .pages.singlepage.swiper
  .page
  .img
  img {
  max-height: 100%;
}

body.read main .m-content #page-wrapper .page {
  margin: 0 auto;
  width: 100%;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  --max-height: calc(100vh - var(--header-padding) - var(--number-nav-height));
}

body.read main .m-content #page-wrapper .page .img {
  position: relative;
  display: block;
  min-width: 50px;
  min-height: 50px;
  width: 100%;
  text-align: center;
  pointer-events: none;
}

body.read main .m-content #page-wrapper .swiper-wrapper.page .img {
  pointer-events: unset;
}

body.read main .m-content #page-wrapper .page .img:not(.loaded):after {
  content: '';
  background: url(/loading.gif) no-repeat center;
  width: 50px;
  height: 50px;
  animation: unset;
  background-size: contain;
  border: none;
  opacity: 0.5;
  display: block;
  margin: 0 auto;
}

body.read main .m-content #page-wrapper .page .img:before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 5%;
  z-index: 9;
}

body.read main .m-content #page-wrapper .page .img.left {
  text-align: right;
}

body.read main .m-content #page-wrapper .page .img.right {
  text-align: left;
}

body.read main .m-content #page-wrapper .page .img.left:before {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0) 0,
    rgba(0, 0, 0, 0.5) 100%
  );
  right: 0;
}

body.read main .m-content #page-wrapper .page .img.right:before {
  left: 0;
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.5) 0,
    rgba(0, 0, 0, 0) 100%
  );
}

body.read main .m-content #page-wrapper .page img {
  margin-left: auto;
  margin-right: auto;
  -o-object-fit: contain;
  object-fit: contain;
  transition: all 0.3s;
}

body.read
  main
  .m-content
  #page-wrapper
  .page
  img.stretch:not(.fit-h):not(.limit-h) {
  min-width: 100%;
}

body.read main .m-content #page-wrapper .page img.fit-w {
  max-width: 100%;
  min-width: 0;
}

body.read main .m-content #page-wrapper .page img.fit-h {
  max-height: var(--max-height);
  min-height: 0;
}

body.read main .m-content .number-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
  padding-bottom: 3rem;  /* KEY: 3rem bottom padding */
}

body.read main .m-content .number-nav.ltr .rtl-icon {
  display: none;
}

body.read main .m-content .number-nav.rtl .ltr-icon {
  display: none;
}

body.read main .m-content .number-nav a {
  padding: 0.6rem 1rem;
  text-align: center;
  border-radius: 0.3rem;
  color: #fff;
  display: block;
  text-transform: capitalize;
  border: none;
  outline: none;
  cursor: pointer;
}

body.read main .m-content .number-nav a.prev:hover {
  color: #3c8bc6;
}

body.read main .m-content .number-nav a.next {
  background: #3c8bc6;
  margin-top: 0.5rem;
  border: none;
  outline: none;
}

body.read main .m-content .number-nav a.next:hover {
  background: #235479;
}

body.read main .m-content .number-nav.abs {
  margin: 0;
  padding: 0;
  width: 100%;
  left: 0;
  bottom: 0;
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-end;
  z-index: 10;
  height: 0;
  overflow: hidden;
  transition: height 0.2s;
}

body.read main .m-content .number-nav.abs.show {
  height: var(--number-nav-height);
}

body.read main .m-content .number-nav.abs a {
  height: 100%;
  flex-grow: 1;
  background: #235479;
  font-weight: 500;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  margin: 0;
  padding: 0;
}

body.read main .m-content .number-nav.abs a:hover {
  background: #3c8bc6;
  color: #fff;
}

body.read main .m-content .number-nav.abs a + a {
  border-left: 2px solid #182335;
}

body.read.ctrl-menu-active header {
  right: 22rem;
}

@media (max-width: 1587.9px) {
  body.read #nav-menu > ul > li:nth-child(n + 3) {
    display: none;
  }
}

@media (max-width: 1199.98px) {
  body.read .nav-user .u-notify {
    display: none;
  }

  body.read header {
    right: 0 !important;
  }

  body.read main .m-content #page-wrapper.on-last-page {
    --number-nav-height: 5rem;
  }

  body.read .sub-panel {
    top: 0;
  }

  body.read #ctrl-menu {
    position: fixed;
    top: 0;
    bottom: 0;
    right: 0;
  }
}

@media (max-width: 1024px) {
  body.read main.longstrip {
    overflow: unset;
    height: auto !important;
    max-height: unset !important;
  }
}

@media (max-width: 991.98px) {
  body.read {
    height: 100%;
    min-height: 100%;
  }

  body.read #nav-user .u-notify {
    display: block;
  }
}

@media (max-width: 767.98px) {
  body.read #nav-search-btn {
    display: block;
  }

  body.read #nav-search {
    position: fixed;
    left: 0;
    right: 0;
    margin: -5rem 0 0 0;
    padding: 1rem;
    top: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 3;
    opacity: 0;
    transition: margin 0.3s, opacity 0.3s;
  }

  body.read #nav-search .overlay {
    position: absolute;
    content: '';
    background: rgba(14, 23, 38, 0.9);
    top: 0;
    height: 100%;
    left: 0;
    width: 100%;
    opacity: 0;
    transition: opacity 0.3s, display 0.3s;
  }

  body.read #nav-search.active {
    pointer-events: unset;
    margin-top: 0;
    opacity: 1;
  }

  body.read #nav-search.active .overlay {
    opacity: 1;
  }

  body.read #nav-search .search-inner form {
    height: 3.2rem;
  }

  body.read #nav-search .search-inner form > a {
    height: 2.4rem;
  }
}

@media (max-width: 575.98px) {
  body.read header .viewing > span {
    display: block;
    line-height: 1.3rem;
    height: 1.3rem;
  }

  body.read header .viewing > span:first-child {
    font-size: 0.85rem;
    color: rgba(116, 124, 136, 0.8);
  }

  body.read header .viewing > span:last-child {
    font-weight: 500;
  }

  body.read header .viewing > span:last-child:after {
    content: ' ';
  }

  body.read #show-ctrl-menu span {
    display: none;
  }
}
```

---

## 2. ReadLayout.tsx (154 lines)

```tsx
import { useEffect, useState } from 'react'
import classNames from 'classnames'
import { toast } from 'react-hot-toast'
import { isMobile } from 'react-device-detect'
import Views from '@/views'
import {
  setActiveSwiper,
  setPageIndex,
  setShowHeader,
  setShowMenu,
  setShowSubPanel,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import Toast from '../ui/Toast'
import Header from '../template/Read/Header'
import ControlMenu from './components/ControlMenu'
import ProgressBar from './components/ProgressBar'
import { useWindowDimensions } from '@/utils/hooks'
import {
  SubPanelChapter,
  SubPanelComment,
  SubPanelPage,
} from './components/SubPanel'
import { PAGE_ENUM } from '@/constants/page.constant'
import scrollToPage from '@/utils/scrollToPage'
import { ReaderProvider, useReader } from '@/contexts/reader-context'

// Inner component that uses ReaderContext (must be inside ReaderProvider)
const ReadLayoutInner = () => {
  const {
    pageType,
    isShowMenu,
    isShowHeader,
    pageIndex,
    activeSwiper,
    isSwiping,
  } = useAppSelector((state) => state.theme)
  const [isClickable, setIsClickable] = useState(true)
  const dispatch = useAppDispatch()
  const { height } = useWindowDimensions()
  const { totalPages } = useReader()

  useEffect(() => {
    if (!isShowHeader && !isShowMenu) {
      let content = 'Press H or move your mouse to the top to show header'
      if (isMobile) {
        content = 'Double tap to show header'
      }
      toast.custom((t) => <Toast t={t} title={content} />)
    }
  }, [isShowMenu, isShowHeader])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keyup', handleKeyPress)
    }
    return () => {
      window.removeEventListener('keyup', handleKeyPress)
    }
  }, [pageIndex, isShowMenu, isShowHeader, totalPages])

  function handleKeyPress(event: KeyboardEvent) {
    switch (event.key) {
      case 'm':
        dispatch(setShowMenu(!isShowMenu))
        return
      case 'h':
        dispatch(setShowHeader(!isShowHeader))
        return
      case 'n':
        return
      case 'b':
        return
      case 'ArrowLeft':
        if (pageIndex > 1) {
          dispatch(setPageIndex(pageIndex - 1))
          dispatch(setActiveSwiper(activeSwiper - 1))
          scrollToPage(pageIndex - 1)
        }
        return
      case 'ArrowRight':
        if (pageIndex < totalPages && pageIndex >= 1) {
          dispatch(setPageIndex(pageIndex + 1))
          dispatch(setActiveSwiper(activeSwiper + 1))
          scrollToPage(pageIndex + 1)
        }
        return
      default:
        return
    }
  }

  function handleDoubleClick() {
    if (!isMobile) return
    if (!isClickable) return
    setIsClickable(false)
    dispatch(setShowHeader(!isShowHeader))
    setTimeout(() => setIsClickable(true), 1500)
  }

  function handleCloseControl() {
    if (!isMobile) {
      dispatch(setShowSubPanel(null))
    } else {
      dispatch(setShowMenu(false))
      dispatch(setShowSubPanel(null))
    }
  }

  const styleMaxHeight =
    pageType === PAGE_ENUM.SINGLE && isMobile
      ? {
          maxHeight: height,
        }
      : {}

  return (
    <>
      <span className="bg" />
      <div className="wrapper" onDoubleClick={handleDoubleClick}>
        <Header />
        <main className={pageType} style={styleMaxHeight}>
          <div className="m-content">
            <div
              id="page-wrapper"
              className={classNames(
                !isMobile && totalPages > 0 && pageIndex === totalPages && !isSwiping && 'on-last-page'
              )}
              onClick={handleCloseControl}
            >
              <Views />
            </div>
            <ProgressBar />
            <SubPanelChapter />
            <SubPanelPage />
            <SubPanelComment />
          </div>
          <ControlMenu />
        </main>
      </div>
    </>
  )
}

// Outer wrapper: provides ReaderContext to all child components
const ReadLayout = () => (
  <ReaderProvider>
    <ReadLayoutInner />
  </ReaderProvider>
)

export default ReadLayout
```

---

## 3. Read.tsx (155 lines)

```tsx
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
```

---

## 4. LongStripImage.tsx (54 lines)

```tsx
import classNames from 'classnames'
import { useRef, useEffect, memo } from 'react'
import Image from '../Image'
import { fitClassName } from '../../Read'
import { useOnScreen } from '@/utils/hooks'
import { setPageIndex, useAppDispatch, useAppSelector } from '@/store'

type LongStripImageProps = {
  index: number
  src: string
}

const LongStripImage = (props: LongStripImageProps) => {
  const { index, src } = props
  const dispatch = useAppDispatch()
  const imageRef = useRef<HTMLDivElement | null>(null)
  const indexOnScreen = useOnScreen(imageRef)

  const { pageIndex, fitType } = useAppSelector((state) => state.theme)

  useEffect(() => {
    if (!indexOnScreen) return
    dispatch(setPageIndex(index + 1))
  }, [indexOnScreen])

  useEffect(() => {
    const image = document.getElementById(`page-${pageIndex}`)
    image?.scrollIntoView({
      behavior: 'auto',
      block: 'start',
    })
  }, [])

  return (
    <div
      className={classNames('page', fitClassName[fitType])}
      style={{ marginBottom: '30px' }}  /* <-- KEY: 30px margin-bottom */
      ref={imageRef}
      id={`page-${index + 1}`}
    >
      <Image
        src={src}
        number={index + 1}
        wrapperClassName={classNames('loaded d-block')}
        imageClassName={fitClassName[fitType]}
      />
    </div>
  )
}

LongStripImage.displayName = 'LongStripImage'

export default memo(LongStripImage)
```

---

## 5. Image.tsx (26 lines)

```tsx
import classNames from 'classnames'

type ImageProps = {
  wrapperClassName: string
  imageClassName: string
  number: number
  src?: string
}

const Image = (props: ImageProps) => {
  const { wrapperClassName, imageClassName, number, src } = props

  return (
    <div data-number={number} className={classNames('img', wrapperClassName)}>
      <img
        data-number={number}
        className={imageClassName}
        src={src}
        alt={`Page ${number}`}
      />
    </div>
  )
}

export default Image
```

---

## 6. Single.tsx (87 lines)

```tsx
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
```

---

## 7. DoubleImage.tsx (34 lines)

```tsx
import { useAppSelector } from '@/store'
import { fitClassName } from '../../Read'
import Image from '../Image'
import classNames from 'classnames'

type DoubleImageProps = {
  index: number
  src: string
  left?: boolean
  right?: boolean
}

const DoubleImage = (props: DoubleImageProps) => {
  const { index, src, left, right } = props
  const { pageIndex, fitType } = useAppSelector((state) => state.theme)

  return (
    <Image
      key={index}
      src={src}
      number={index + 1}
      wrapperClassName={classNames(
        pageIndex + 4 > index + 1 && 'loaded',
        left && 'left',
        right && 'right',
        index + 1 === pageIndex ? 'd-block' : 'd-none'
      )}
      imageClassName={fitClassName[fitType]}
    />
  )
}

export default DoubleImage
```

---

## index.css (9 lines)

```css
@import './assets/styles/app.css';
@import './assets/styles/modal.css';
@import './assets/styles/swiper.css';
@import './assets/styles/read.css';
@import './assets/styles/card.css';
@import './assets/styles/toast.css';
@import './assets/styles/footer.css';
@import './assets/styles/dropdown.css';
```

