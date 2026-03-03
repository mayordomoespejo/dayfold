import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Dropdown.scss'

export interface DropdownOption {
  value: string | number
  label: string
  ariaLabel?: string
}

interface Props {
  value: string | number
  options: DropdownOption[]
  onChange: (value: string | number) => void
  ariaLabel?: string
  className?: string
}

/**
 * Accessible custom select built on the WAI-ARIA listbox pattern.
 *
 * - Keyboard: Arrow keys navigate options, Enter/Space confirm, Escape closes,
 *   Home/End jump to first/last option.
 * - An invisible `dropdown__sizer` span locks the container width to the longest
 *   option label, preventing layout shifts as the selection changes.
 * - `onWheel` is stopped on the open menu so page scrolling doesn't accidentally
 *   change the selected item when the user scrolls past the dropdown.
 */
export function Dropdown({ value, options, onChange, ariaLabel, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === value)))
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const normalizedOptions = options.map((option) => ({
    ...option,
    label: option.label ?? String(option.value),
    ariaLabel: option.ariaLabel ?? option.label ?? String(option.value),
  }))
  const selectedIndex = Math.max(0, normalizedOptions.findIndex((option) => option.value === value))

  const currentLabel = normalizedOptions.find((o) => o.value === value)?.label ?? String(value)
  const longestLabel = normalizedOptions.length
    ? normalizedOptions.reduce((a, b) => (b.label.length > a.label.length ? b : a)).label
    : ''

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // Scroll selected option into view when menu opens
  useEffect(() => {
    if (!isOpen || !menuRef.current) return
    const activeOption = menuRef.current.querySelector<HTMLElement>('[data-active="true"]')
    activeOption?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, isOpen])

  useEffect(() => {
    setActiveIndex(selectedIndex)
  }, [selectedIndex])

  const handleSelect = (optValue: string | number) => {
    onChange(optValue)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (normalizedOptions.length === 0) return

    if (e.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
      return
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setActiveIndex(selectedIndex)
        setIsOpen(true)
        return
      }

      const direction = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        const start = current >= 0 ? current : selectedIndex
        return (start + direction + normalizedOptions.length) % normalizedOptions.length
      })
      return
    }

    if (!isOpen && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setActiveIndex(selectedIndex)
      setIsOpen(true)
      return
    }

    if (!isOpen) return

    if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
      return
    }

    if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(normalizedOptions.length - 1)
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSelect(normalizedOptions[activeIndex]?.value ?? normalizedOptions[selectedIndex].value)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`dropdown${isOpen ? ' dropdown--open' : ''}${className ? ` ${className}` : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Invisible sizer — stacked with the trigger in the same grid cell so the
          container width always matches the longest option, preventing layout shifts. */}
      <span className="dropdown__sizer" aria-hidden="true">{longestLabel}</span>

      <button
        ref={triggerRef}
        type="button"
        className="dropdown__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-controls={menuId}
      >
        <span className="dropdown__trigger-label">{currentLabel}</span>
        <svg className="dropdown__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul
          ref={menuRef}
          id={menuId}
          className="dropdown__menu"
          role="listbox"
          aria-label={ariaLabel}
          onWheel={(event) => event.stopPropagation()}
        >
          {normalizedOptions.map((option, index) => {
            const isSelected = option.value === value
            const isActive = index === activeIndex
            return (
              <li key={String(option.value)} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`dropdown__option${isSelected ? ' dropdown__option--selected' : ''}${isActive ? ' dropdown__option--active' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setActiveIndex(index)}
                  data-active={isActive ? 'true' : 'false'}
                  aria-label={option.ariaLabel}
                  title={option.ariaLabel}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
