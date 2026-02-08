import { memo, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EnumFilter } from '@/@types/common'
import { useClickOutside } from '@/utils/hooks'
import ButtonFilter from './ButtonFilter'

const baseData = [
  { id: 'minchap-1', value: '1', label: '>= 1 chapters' },
  { id: 'minchap-3', value: '3', label: '>= 3 chapters' },
  { id: 'minchap-5', value: '5', label: '>= 5 chapters' },
  { id: 'minchap-10', value: '10', label: '>= 10 chapters' },
  { id: 'minchap-20', value: '20', label: '>= 20 chapters' },
  { id: 'minchap-30', value: '30', label: '>= 30 chapters' },
  { id: 'minchap-50', value: '50', label: '>= 50 chapters' },
]

const Length = () => {
  const [searchParams] = useSearchParams()
  const defaultValue = searchParams.get('length') || ''

  const data = useMemo(() => {
    if (!defaultValue) return baseData
    return baseData.map((item) => ({
      ...item,
      checked: item.value === defaultValue,
    }))
  }, [defaultValue])

  const [open, setOpen] = useState(false)
  const dropdownRef = useClickOutside(() => setOpen(false))
  const onToggle = () => setOpen((prev) => !prev)

  return (
    <ButtonFilter
      key={defaultValue}
      data={data}
      open={open}
      type="radio"
      ref={dropdownRef}
      onToggle={onToggle}
      value={EnumFilter.length}
      dropdownClassName="c1"
    />
  )
}

export default memo(Length)
