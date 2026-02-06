import { Link } from 'react-router-dom'
import {
  setActiveSwiper,
  setPageIndex,
  setShowMenu,
  setShowSubPanel,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import { SubPanelType } from '@/@types/theme'
import { SUB_PANEL_ENUM } from '@/constants/panel.constant'
import { ChapVolSwitch, LangSwitch } from './Buttons'
import scrollToPage from '@/utils/scrollToPage'
import { useReader } from '@/contexts/reader-context'

const Top = () => {
  const dispatch = useAppDispatch()
  const { isShowMenu, pageIndex, isShowSubPanel, activeSwiper } =
    useAppSelector((state) => state.theme)
  const { totalPages, chapterNumber, mangaSlug, navigation, language } = useReader()

  const onToggleMenu = () => {
    dispatch(setShowMenu(!isShowMenu))
  }

  const handlePrevPage = () => {
    if (pageIndex > 1) {
      dispatch(setPageIndex(pageIndex - 1))
      dispatch(setActiveSwiper(activeSwiper - 1))
      scrollToPage(pageIndex - 1)
    }
  }

  const handleNextPage = () => {
    if (pageIndex < totalPages && pageIndex >= 1) {
      dispatch(setPageIndex(pageIndex + 1))
      dispatch(setActiveSwiper(activeSwiper + 1))
      scrollToPage(pageIndex + 1)
    }
  }

  const handleTogglePanel = (type: SubPanelType) => {
    dispatch(setShowSubPanel(type === isShowSubPanel ? null : type))
  }

  return (
    <>
      <div className="head">
        <Link to={`/manga/${mangaSlug}`}>{mangaSlug}</Link>
        <div
          onClick={onToggleMenu}
          className="close-primary btn btn-secondary1 tooltipz"
          id="ctrl-menu-close"
          title="Use M button to toggle"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </div>
      </div>
      <ChapVolSwitch />
      <LangSwitch />

      {/* Page */}
      <nav>
        <button className="page-btn" id="page-go-left" onClick={handlePrevPage}>
          <i className="fa-regular fa-chevron-left"></i>
        </button>
        <button
          className="page-toggler"
          onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_PAGE)}
        >
          <b>
            Page <span className="current-page">{pageIndex}</span>
          </b>
          <i className="fa-solid fa-sort fa-sm"></i>
        </button>
        <button
          className="page-btn"
          id="page-go-right"
          onClick={handleNextPage}
        >
          <i className="fa-regular fa-chevron-right"></i>
        </button>
      </nav>
      {/* Chapter */}
      <nav>
        <Link
          to={navigation?.prev ? `/read/${mangaSlug}/${language}/chapter-${navigation.prev.number}` : '#'}
          id="number-go-left"
          className={!navigation?.prev ? 'disabled' : ''}
        >
          <i className="fa-regular fa-chevron-left"></i>
        </Link>
        <button
          className="number-toggler"
          onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_CHAPTER)}
        >
          <b className="current-type-number text-title">chapter {chapterNumber}</b>
          <i className="fa-solid fa-sort fa-sm"></i>
        </button>
        <Link
          to={navigation?.next ? `/read/${mangaSlug}/${language}/chapter-${navigation.next.number}` : '#'}
          id="number-go-right"
          className={!navigation?.next ? 'disabled' : ''}
        >
          <i className="fa-regular fa-chevron-right"></i>
        </Link>
      </nav>
      {/* Comment */}
      <button
        id="comment-toggler"
        className="jb-btn"
        onClick={() => handleTogglePanel(SUB_PANEL_ENUM.PANEL_COMMENT)}
      >
        <i className="fa-light fa-message-dots fa-flip-horizontal fa-lg"></i>
        <span>
          <span className="current-type-number text-title">chapter {chapterNumber} </span>
          Comment
        </span>
      </button>
      {/* Bookmark */}
      <div className="dropdown favourite" data-id="26256" data-fetch="true">
        <button className="jb-btn">
          <i className="fa-light fa-folder-bookmark fa-lg"></i>
          <span>Bookmark</span>
        </button>
        <div className="dropdown-menu dropdown-menu-right w-100 folders"></div>
      </div>

      <Link to={`/manga/${mangaSlug}`} className="jb-btn">
        <i className="fa-light fa-lg fa-circle-info"></i>
        <span>Manga Detail</span>
      </Link>
      <button className="jb-btn" data-toggle="modal" data-target="#report">
        <i className="fa-light fa-lg fa-triangle-exclamation"></i>
        <span>Report Error</span>
      </button>
    </>
  )
}

export default Top
