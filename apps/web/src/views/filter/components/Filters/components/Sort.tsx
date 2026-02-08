import { memo, useMemo, useState } from 'react'

import { EnumFilter } from '@/@types/common'
import { useClickOutside } from '@/utils/hooks'
import ButtonFilter from './ButtonFilter'

// Sort values map directly to backend sortBy enum values
const baseData = [
  { id: 'sort-updatedAt', value: 'updatedAt', label: 'Recently updated' },
  { id: 'sort-createdAt', value: 'createdAt', label: 'Recently added' },
  { id: 'sort-releaseYear', value: 'releaseYear', label: 'Release date' },
  { id: 'sort-views-trending', value: 'views', label: 'Trending' },
  { id: 'sort-title', value: 'title', label: 'Name A-Z' },
  { id: 'sort-rating', value: 'rating', label: 'Scores' },
  { id: 'sort-rating-mal', value: 'rating', label: 'MAL scores' },
  { id: 'sort-views', value: 'views', label: 'Most viewed' },
  { id: 'sort-views-fav', value: 'views', label: 'Most favourited' },
]

type SortProps = {
  defaultSort?: string
}

const Sort = ({ defaultSort }: SortProps) => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  const data = useMemo(() => {
    let matched = false
    return baseData.map((item) => {
      if (!matched && item.value === defaultSort) {
        matched = true
        return { ...item, checked: true }
      }
      return item
    })
  }, [defaultSort])
  return (
    <ButtonFilter
      data={data}
      open={open}
      ref={dropdownRef}
      dropdownClassName="c1 dropdown-menu-right dropdown-menu-xs-left"
      onToggle={onToggle}
      value={EnumFilter.sort}
      type="radio"
    />
  )
}

export default memo(Sort)
