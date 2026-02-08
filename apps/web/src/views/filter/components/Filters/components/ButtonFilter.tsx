import { forwardRef, memo, useRef, useState, useEffect } from 'react'
import classNames from 'classnames'

import { CommonFilterProps, EnumFilter } from '@/@types/common'
import { CSSTransition } from 'react-transition-group'
import type { GenreFilterState } from '@mangafire/shared'

// Placeholder labels for each filter type (shown when nothing selected)
const FILTER_PLACEHOLDERS: Record<string, string> = {
  [EnumFilter.sort]: 'Sort by',
  [EnumFilter.type]: 'Type',
  [EnumFilter.genre]: 'Genre',
  [EnumFilter.status]: 'Status',
  [EnumFilter.language]: 'Language',
  [EnumFilter.year]: 'Year',
  [EnumFilter.length]: 'Length',
}

const ButtonFilter = forwardRef<HTMLDivElement, CommonFilterProps>(
  (props, dropdownRef) => {
    const {
      open,
      data,
      value,
      dropdownClassName,
      type = 'checkbox',
      onToggle,
      triState = false,
    } = props
    const overlayRef = useRef(null)
    const isResponsive = [EnumFilter.genre, EnumFilter.year].includes(value)

    const placeholder = FILTER_PLACEHOLDERS[value] || value

    // Track selected items to display in button text
    // Radio: single label, Checkbox: set of labels
    const checkedLabels = data.filter((item) => item.checked).map((item) => item.label)
    const [selectedItems, setSelectedItems] = useState<Set<string>>(
      () => new Set(checkedLabels)
    )

    // Tri-state genre filter state management
    const [genreStates, setGenreStates] = useState<Map<string, GenreFilterState>>(() => {
      if (!triState) return new Map()
      return new Map(data.map((item) => [item.value, item.state ?? null]))
    })

    // Sync genreStates when data prop changes (URL params restore)
    useEffect(() => {
      if (!triState) return
      setGenreStates(new Map(data.map((item) => [item.value, item.state ?? null])))
      setSelectedItems(new Set(data.filter((item) => item.checked).map((item) => item.label)))
    }, [data, triState])

    // Compute display text from selected items
    const getDisplayLabel = (): string | undefined => {
      const count = selectedItems.size
      if (count === 0) return undefined
      if (count === 1) return [...selectedItems][0]
      return `${count} selected`
    }

    // Handle selection change → update button text
    const handleChange = (label: string, checked: boolean) => {
      setSelectedItems((prev) => {
        const next = new Set(prev)
        if (type === 'radio') {
          next.clear()
          next.add(label)
        } else {
          if (checked) next.add(label)
          else next.delete(label)
        }
        return next
      })
    }

    // Tri-state handler: null -> include -> exclude -> null
    const handleTriStateClick = (itemValue: string, label: string, e: React.MouseEvent<HTMLInputElement>) => {
      e.preventDefault() // Prevent native checkbox toggle

      const currentState = genreStates.get(itemValue) ?? null
      let nextState: GenreFilterState = null

      if (currentState === null) nextState = 'include'
      else if (currentState === 'include') nextState = 'exclude'
      else nextState = null

      setGenreStates((prev) => {
        const next = new Map(prev)
        next.set(itemValue, nextState)
        return next
      })

      setSelectedItems((prev) => {
        const next = new Set(prev)
        if (nextState === null) next.delete(label)
        else next.add(label)
        return next
      })
    }

    // Handle label click for tri-state
    const handleLabelClick = (itemValue: string, label: string, e: React.MouseEvent<HTMLLabelElement>) => {
      if (!triState) return
      e.preventDefault()
      handleTriStateClick(itemValue, label, e as any)
    }

    return (
      <div ref={dropdownRef}>
        <div
          className={classNames(
            'dropdown',
            open && 'show',
            isResponsive && 'responsive'
          )}
        >
          <CSSTransition
            mountOnEnter
            unmountOnExit
            timeout={300}
            nodeRef={overlayRef}
            in={isResponsive && open}
            classNames="overlay"
          >
            <div ref={overlayRef} className="overlay" onClick={onToggle}></div>
          </CSSTransition>
          <button type="button" name={value} onClick={onToggle}>
            <span
              className="value"
              data-placeholder={placeholder}
              data-label-placement="true"
            >
              {getDisplayLabel() || placeholder}
            </span>
          </button>
          <CSSTransition
            in={open}
            mountOnEnter
            unmountOnExit
            timeout={300}
            classNames="dropdown"
          >
            <div
              className={classNames(
                'dropdown-menu noclose d-block',
                dropdownClassName
              )}
              style={{
                transformOrigin: 'top center',
              }}
            >
              <ul
                className={classNames(value === EnumFilter.genre && 'genres')}
              >
                {data.map((item) => {
                  const itemState = triState ? genreStates.get(item.value) ?? null : null
                  const isExclude = itemState === 'exclude'
                  // triState: controlled by genreStates; non-triState: uncontrolled (defaultChecked)
                  // so FormData can collect user's actual selection
                  const isCheckedTriState = itemState !== null

                  return (
                    <li key={item.id}>
                      <input
                        type={type}
                        id={item.id}
                        name={triState ? undefined : (type === 'checkbox' ? `${value}[]` : value)}
                        value={item.value}
                        {...(triState
                          ? { checked: isCheckedTriState }
                          : { defaultChecked: item.checked }
                        )}
                        className={classNames(isExclude && 'exclude')}
                        onChange={triState ? undefined : (e) => handleChange(item.label, e.target.checked)}
                        onClick={triState ? (e) => handleTriStateClick(item.value, item.label, e) : undefined}
                      />
                      <label
                        htmlFor={triState ? undefined : item.id}
                        onClick={triState ? (e) => handleLabelClick(item.value, item.label, e) : undefined}
                      >
                        {item.label}
                      </label>
                    </li>
                  )
                })}
              </ul>
              {triState && (
                <>
                  {Array.from(genreStates.entries())
                    .filter(([_, state]) => state === 'include')
                    .map(([itemValue]) => (
                      <input key={`inc-${itemValue}`} type="hidden" name={`${value}[]`} value={itemValue} />
                    ))
                  }
                  {Array.from(genreStates.entries())
                    .filter(([_, state]) => state === 'exclude')
                    .map(([itemValue]) => (
                      <input key={`exc-${itemValue}`} type="hidden" name={`${value}_exclude[]`} value={itemValue} />
                    ))
                  }
                </>
              )}
              {open && value === EnumFilter.genre && (
                <>
                  <div className="clearfix"></div>
                  <ul>
                    <li className="w-100">
                      <input
                        type="checkbox"
                        id="genre-mode"
                        name="genre_mode"
                        value="and"
                      />
                      <label htmlFor="genre-mode" className="text-success">
                        Must have all the selected genres
                      </label>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </CSSTransition>
        </div>
      </div>
    )
  }
)

ButtonFilter.displayName = 'ButtonFilter'

export default memo(ButtonFilter)
