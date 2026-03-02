import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import './Dropdown.scss'

export interface DropdownOption {
  value: string | number
  label: string
}

interface Props {
  value: string | number
  options: DropdownOption[]
  onChange: (value: string | number) => void
  ariaLabel?: string
  className?: string
}

export function Dropdown({ value, options, onChange, ariaLabel, className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const normalizedOptions = options.map((option) => ({
    ...option,
    label: option.label ?? String(option.value),
  }))

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
    const selected = menuRef.current.querySelector('[aria-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [isOpen])

  const handleSelect = (optValue: string | number) => {
    onChange(optValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { setIsOpen(false); return }
    if (e.key === 'ArrowDown' && !isOpen) { e.preventDefault(); setIsOpen(true) }
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
        type="button"
        className="dropdown__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <span className="dropdown__trigger-label">{currentLabel}</span>
        <svg className="dropdown__chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <ul ref={menuRef} className="dropdown__menu" role="listbox" aria-label={ariaLabel}>
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={String(option.value)} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`dropdown__option${isSelected ? ' dropdown__option--selected' : ''}`}
                  onClick={() => handleSelect(option.value)}
                >
                  {isSelected ? (
                    <svg className="dropdown__option-check" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="dropdown__option-check" aria-hidden="true" />
                  )}
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
