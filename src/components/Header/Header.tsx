import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { useTimelineDate } from '@/hooks/useTimelineDate'
import { useContentLang } from '@/context/useContentLang'
import { CONTENT_LANGS } from '@/config/langs'
import { DateSelector } from '@/components/DateSelector/DateSelector'
import { Dropdown } from '@/components/common/Dropdown'
import { CenturyLensIcon } from '@/components/icons/icons'
import './Header.scss'

const SunIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M3.64 3.64l1.42 1.42M14.94 14.94l1.42 1.42M3.64 16.36l1.42-1.42M14.94 5.06l1.42-1.42"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
    />
  </svg>
)

const MoonIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M17.5 10.66A7.5 7.5 0 1 1 9.34 2.5a5.83 5.83 0 0 0 8.16 8.16Z"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
)

/**
 * Renders the fixed application header with date controls, language selector and theme toggle.
 */
export function Header() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { contentLang, setContentLang } = useContentLang()
  const { date, setDate } = useTimelineDate()

  const langOptions = CONTENT_LANGS.map(({ code, label }) => ({ value: code, label }))

  return (
    <header className="header" role="banner">
      <div className="header__inner">
        <div className="header__brand">
          <span className="header__brand-icon" aria-hidden="true">
            <CenturyLensIcon />
          </span>
          <span className="header__brand-name">CenturyLens</span>
        </div>

        <div className="header__actions">
          <DateSelector
            key={`${date.month}-${date.day}`}
            month={date.month}
            day={date.day}
            onChange={setDate}
            compact
          />

          <div className="header__divider" aria-hidden="true" />

          <Dropdown
            value={contentLang}
            options={langOptions}
            onChange={(v) => setContentLang(String(v))}
            ariaLabel={t('HEADER.LANGUAGE_SELECT')}
          />

          <button
            className="header__theme-btn"
            onClick={toggleTheme}
            aria-label={t('HEADER.TOGGLE_THEME')}
            title={t('HEADER.TOGGLE_THEME')}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  )
}
