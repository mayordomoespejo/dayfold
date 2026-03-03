import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CalendarDate } from '@/types'
import { clampDay, getDaysInMonth, getTodayDate } from '@/utils/date'
import { Dropdown } from '@/components/common/Dropdown'
import type { DropdownOption } from '@/components/common/Dropdown'
import './DateSelector.scss'

interface Props {
  month: number
  day: number
  onChange: (date: CalendarDate) => void
  compact?: boolean
}

const MONTH_KEYS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
] as const

export function DateSelector({ month, day, onChange, compact = false }: Props) {
  const { t } = useTranslation()

  const [localMonth, setLocalMonth] = useState(month)
  const [localDay, setLocalDay] = useState(day)

  const isDirty = localMonth !== month || localDay !== day

  const monthOptions: DropdownOption[] = MONTH_KEYS.map((key, i) => ({
    value: i + 1,
    label: t(`DATE.MONTHS.${key}`),
  }))
  const dayOptions: DropdownOption[] = Array.from(
    { length: getDaysInMonth(localMonth) },
    (_, index) => ({
      value: index + 1,
      label: String(index + 1),
    }),
  )

  const handleMonthChange = (value: string | number) => {
    const nextMonth = Number(value)
    const clampedDay = clampDay(localDay, nextMonth)
    setLocalMonth(nextMonth)
    setLocalDay(clampedDay)
  }

  const handleSubmit = () => {
    if (isDirty) onChange({ month: localMonth, day: localDay })
  }

  const handleToday = () => {
    onChange(getTodayDate())
  }

  return (
    <div className={`date-selector${compact ? ' date-selector--compact' : ''}`}>
      <button type="button" className="date-selector__today" onClick={handleToday}>
        {t('DATE.TODAY')}
      </button>

      <div className="date-selector__fields">
        <Dropdown
          value={localMonth}
          options={monthOptions}
          onChange={handleMonthChange}
          ariaLabel={t('DATE.MONTH')}
        />

        <span className="date-selector__sep" aria-hidden="true">/</span>

        <Dropdown
          value={localDay}
          options={dayOptions}
          onChange={(value) => setLocalDay(clampDay(Number(value), localMonth))}
          ariaLabel={t('DATE.DAY')}
          className="date-selector__day-dropdown"
        />

        <button
          type="button"
          className={`date-selector__submit${isDirty ? ' date-selector__submit--active' : ''}`}
          onClick={handleSubmit}
          aria-label={t('DATE.APPLY')}
          title={t('DATE.APPLY')}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
