import { memo, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EnumFilter } from '@/@types/common'
import { useClickOutside } from '@/utils/hooks'
import ButtonFilter from './ButtonFilter'

const baseData = [
  { id: 'status-completed', value: 'completed', label: 'Completed' },
  { id: 'status-releasing', value: 'ongoing', label: 'Releasing' },
  { id: 'status-on_hiatus', value: 'hiatus', label: 'On Hiatus' },
  { id: 'status-discontinued', value: 'cancelled', label: 'Discontinued' },
  { id: 'status-info', value: 'cancelled', label: 'Not Yet Published' },
]

const Status = () => {
  const [searchParams] = useSearchParams()
  const defaults = searchParams.get('status')?.split(',') || []
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
      value={EnumFilter.status}
      dropdownClassName="c1"
    />
  )
}

export default memo(Status)
