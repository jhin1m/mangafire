import classNames from 'classnames'
import {
  setActiveSwiper,
  setPageIndex,
  useAppDispatch,
  useAppSelector,
} from '@/store'
import scrollToPage from '@/utils/scrollToPage'
import { useReader } from '@/contexts/reader-context'

const ProgressBar = () => {
  const { progressPosition, pageIndex } = useAppSelector((state) => state.theme)
  const { totalPages } = useReader()
  const dispatch = useAppDispatch()

  const handleChangePage = (page: number) => {
    dispatch(setPageIndex(page))
    dispatch(setActiveSwiper(page))
    scrollToPage(page)
  }

  // Ẩn hoàn toàn khi không có pages hoặc khi user chọn "No Progress" (progressPosition rỗng)
  if (totalPages === 0 || !progressPosition) return null

  return (
    <div id="progress-bar" className={classNames('d-flex', progressPosition)}>
      <div>
        <p>1</p>
        <ul>
          {Array.from({ length: totalPages }, (_, index) => (
            <li
              key={index}
              data-page={index + 1}
              data-name={index + 1}
              className={classNames(pageIndex === index + 1 && 'active')}
              onClick={() => handleChangePage(index + 1)}
            >
              <div>{index + 1}</div>
            </li>
          ))}
        </ul>
        <p className="total-page">{totalPages}</p>
      </div>
    </div>
  )
}

export default ProgressBar
