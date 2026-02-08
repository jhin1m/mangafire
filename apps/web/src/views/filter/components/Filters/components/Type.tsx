import { memo, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EnumFilter } from '@/@types/common'
import { useClickOutside } from '@/utils/hooks'
import ButtonFilter from './ButtonFilter'

const baseData = [
  { id: 'type-manga', value: 'manga', label: 'Manga' },
  { id: 'type-one_shot', value: 'one_shot', label: 'One-Shot' },
  { id: 'type-doujinshi', value: 'doujinshi', label: 'Doujinshi' },
  { id: 'type-novel', value: 'novel', label: 'Novel' },
  { id: 'type-manhwa', value: 'manhwa', label: 'Manhwa' },
  { id: 'type-manhua', value: 'manhua', label: 'Manhua' },
]

const Type = () => {
  const [searchParams] = useSearchParams()
  const defaults = searchParams.get('type')?.split(',') || []
  const defaultsKey = defaults.join(',')

  const data = useMemo(
    () => baseData.map((item) => ({
      ...item,
      checked: defaults.includes(item.value),
    })),
    [defaultsKey]
  )

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  return (
    <ButtonFilter
      key={defaultsKey}
      data={data}
      open={open}
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.type}
      dropdownClassName="c1"
    />
  )
}

export default memo(Type)
