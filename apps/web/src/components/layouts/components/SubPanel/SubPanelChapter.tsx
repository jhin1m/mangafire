import { useState, useMemo } from 'react'
import classNames from 'classnames'
import { Link } from 'react-router-dom'
import { isMobile } from 'react-device-detect'
import { useWindowDimensions } from '@/utils/hooks'
import { SUB_PANEL_ENUM } from '@/constants/panel.constant'
import { setShowSubPanel, useAppDispatch, useAppSelector } from '@/store'
import { useReader } from '@/contexts/reader-context'

const SubPanelChapter = () => {
  const { isShowSubPanel } = useAppSelector((state) => state.theme)
  const dispatch = useAppDispatch()
  const { height } = useWindowDimensions()
  const { chapterList, mangaSlug, language, chapterNumber } = useReader()

  // Local search filter for finding chapters by number
  const [search, setSearch] = useState('')

  const handleClosePanel = () => dispatch(setShowSubPanel(null))

  // Filter chapters by search input
  const filteredChapters = useMemo(() => {
    if (!search.trim()) return chapterList
    return chapterList.filter((ch) =>
      ch.number.includes(search.trim()) ||
      ch.title?.toLowerCase().includes(search.trim().toLowerCase())
    )
  }, [chapterList, search])

  return (
    <div
      className={classNames(
        'sub-panel scroll-sm',
        isShowSubPanel === SUB_PANEL_ENUM.PANEL_CHAPTER && 'active'
      )}
      id="number-panel"
      style={isMobile ? { maxHeight: height, position: 'fixed' } : {}}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="head">
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className="form-group">
            <i className="fa-regular fa-magnifying-glass" />
            <input
              type="text"
              className="form-control"
              placeholder="Find number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>
        <button
          className="close-primary btn btn-secondary1"
          id="number-close"
          onClick={handleClosePanel}
        >
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
      <ul>
        {filteredChapters.map((chapter) => (
          <li key={chapter.id}>
            <Link
              to={`/read/${mangaSlug}/${language}/chapter-${chapter.number}`}
              title={chapter.title || `Chapter ${chapter.number}`}
              className={classNames(chapter.number === chapterNumber && 'active')}
            >
              <span>
                {chapter.number}. {chapter.title || `Chapter ${chapter.number}`}
              </span>
            </Link>
          </li>
        ))}
        {filteredChapters.length === 0 && (
          <li className="text-muted" style={{ padding: '12px 16px' }}>
            No chapters found
          </li>
        )}
      </ul>
    </div>
  )
}

export default SubPanelChapter
