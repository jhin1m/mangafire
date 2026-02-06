import { useState } from 'react'

import { EnumFilter } from '@/@types/common'
import ButtonFilter from './ButtonFilter'
import { useClickOutside } from '@/utils/hooks'
import { useGenres } from '@/hooks/use-genres'

const Genre = () => {
  const { data: genres = [] } = useGenres()
  const data = genres.map((g) => ({
    id: `genre-${g.slug}`,
    value: String(g.id),
    label: g.name,
  }))

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  return (
    <ButtonFilter
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.genre}
      dropdownClassName="lg c4 dropdown-menu-right dropdown-menu-md-left"
    />
  )
}

export default Genre
