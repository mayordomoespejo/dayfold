import { useTranslation } from 'react-i18next'
import './Skeleton.scss'

/**
 * Skeleton that mirrors the wheel + detail card layout shown when events load.
 * Uses the real wheel and detail CSS classes so the placeholder bars sit exactly
 * where the real content appears once the data arrives.
 */
export function WheelSkeleton() {
  const { t } = useTranslation()
  const spokes = [
    { angle: -0.9, textW: '38%' },
    { angle: -0.6, textW: '52%' },
    { angle: -0.3, textW: '66%' },
    { angle:  0,   textW: '80%' },  // centre — "active"
    { angle:  0.3, textW: '66%' },
    { angle:  0.6, textW: '52%' },
    { angle:  0.9, textW: '38%' },
  ]

  return (
    <div className="timeline-shell timeline-shell--loading" aria-busy="true" aria-label={t('COMMON.LOADING')}>
      <div className="timeline-stage">
        <div className="timeline-stage__grid">
          <div className="timeline-wheel">
            <div className="timeline-wheel__orbit wheel-skeleton__orbit" aria-hidden="true" />

            {spokes.map(({ angle, textW }, i) => {
              const opacity = Math.max(0.2, 1 - Math.abs(angle) / 1.1)
              const isActive = angle === 0
              return (
                <div
                  key={i}
                  className={`timeline-wheel__item wheel-skeleton__spoke${isActive ? ' timeline-wheel__item--active' : ''}`}
                  style={{
                    transform: `translateY(-50%) translate(calc(cos(${angle}rad) * var(--wheel-radius)), calc(sin(${angle}rad) * var(--wheel-radius))) rotate(${angle}rad) scale(${isActive ? 1 : 0.92})`,
                    opacity,
                    pointerEvents: 'none',
                  }}
                  aria-hidden="true"
                >
                  <span className="timeline-wheel__label">
                    <span className="timeline-wheel__year skeleton wheel-skeleton__bar" />
                    <span
                      className="timeline-wheel__text skeleton wheel-skeleton__bar"
                      style={{ width: textW }}
                    />
                  </span>
                </div>
              )
            })}
          </div>

          {/* Detail card — each element uses its real class so font-size, margin
              and spacing are identical to the loaded state */}
          <aside className="timeline-detail wheel-skeleton__detail" aria-hidden="true">

            {/* Eyebrow label — font-size-xs, height: 1em = ~12px */}
            <p className="timeline-detail__eyebrow skeleton wheel-skeleton__inline"
               style={{ width: 80 }} />

            {/* Big year number — font-size: clamp(3.5rem, 9vw, 5.5rem), height: 1em matches */}
            <h2 className="timeline-detail__year skeleton wheel-skeleton__inline"
                style={{ width: '52%' }} />

            {/* Description — 3 lines at base font size */}
            <div className="wheel-skeleton__lines">
              <span className="skeleton wheel-skeleton__text-line" style={{ width: '100%' }} />
              <span className="skeleton wheel-skeleton__text-line" style={{ width: '88%' }} />
              <span className="skeleton wheel-skeleton__text-line" style={{ width: '62%' }} />
            </div>

            {/* Image thumbnail */}
            <span className="timeline-detail__image skeleton wheel-skeleton__img" />

            {/* Action button — inherits min-height, padding and border-radius from real link */}
            <div className="timeline-detail__actions">
              <span className="timeline-detail__link skeleton" style={{ width: 112 }} />
            </div>

          </aside>
        </div>
      </div>
    </div>
  )
}
