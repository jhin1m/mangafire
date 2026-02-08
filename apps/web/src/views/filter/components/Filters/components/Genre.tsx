import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EnumFilter } from '@/@types/common'
import ButtonFilter from './ButtonFilter'
import { useClickOutside } from '@/utils/hooks'
import { useGenres } from '@/hooks/use-genres'
import type { GenreFilterState } from '@mangafire/shared'

const Genre = () => {
  const [searchParams] = useSearchParams()
  const includes = searchParams.get('genre')?.split(',') || []
  const excludes = searchParams.get('genre_exclude')?.split(',') || []

  const { data: genres = [] } = useGenres()
  const data = useMemo(() => genres.map((g) => {
    const val = String(g.id)
    let state: GenreFilterState = null
    if (includes.includes(val)) state = 'include'
    else if (excludes.includes(val)) state = 'exclude'
    return {
      id: `genre-${g.slug}`,
      value: val,
      label: g.name,
      checked: state !== null,
      state,
    }
  }), [genres, includes.join(','), excludes.join(',')])

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  return (
    <ButtonFilter
      key={`${includes.join(',')}-${excludes.join(',')}`}
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.genre}
      triState
      dropdownClassName="lg c4 dropdown-menu-right dropdown-menu-md-left"
    />
  )
}

export default Genre
