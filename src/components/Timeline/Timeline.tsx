import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TimelineEvent } from '@/types'
import { WheelSkeleton } from '@/components/common/Skeleton'
import { ErrorState } from '@/components/common/ErrorState'
import './Timeline.scss'

interface Props {
  events: TimelineEvent[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

const ARC_VISIBLE_SPAN = 1.2
/** Fixed radians between adjacent items — constant regardless of item count. */
const FIXED_ANGLE_INCREMENT = 0.1
/** Pixels of page scroll needed to advance one item through the visible arc. */
const SCROLL_PER_ITEM = 220

interface WheelItem {
  event: TimelineEvent
  index: number
  angle: number
  distanceToArcCenter: number
  isVisible: boolean
  visibilityProgress: number
}

/**
 * Normalizes an angle to the `[-PI, PI]` range.
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

/**
 * Renders the radial timeline and synchronizes scroll and drag interactions.
 */
export function Timeline({ events, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startAngle: number
    startRotationOffset: number
  } | null>(null)
  const dragMovedRef = useRef(false)
  const pressedItemIndexRef = useRef<number | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rotationOffset, setRotationOffset] = useState(0)

  useEffect(() => {
    if (events.length === 0) return

    /** Smooth-scrolls to the item nearest the current scroll position. */
    const snapToNearest = () => {
      const shell = shellRef.current
      if (!shell) return
      const rect = shell.getBoundingClientRect()
      const travel = Math.max(shell.offsetHeight - window.innerHeight, 1)
      const maxRot = (events.length - 1) * FIXED_ANGLE_INCREMENT
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const nearest = Math.min(events.length - 1, Math.max(0, Math.round(progress * (events.length - 1))))
      const targetOffset = nearest * FIXED_ANGLE_INCREMENT
      // Skip if already on the snap point (prevents re-triggering after a snap scroll)
      if (Math.abs(progress * maxRot - targetOffset) < 0.01) return
      const shellTop = window.scrollY + rect.top
      const targetProgress = maxRot > 0 ? targetOffset / maxRot : 0
      window.scrollTo({ top: shellTop + targetProgress * travel, behavior: 'smooth' })
    }

    const handleScroll = () => {
      const shell = shellRef.current
      if (!shell) return

      const rect = shell.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const travel = Math.max(shell.offsetHeight - viewportHeight, 1)
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const maxRotation = (events.length - 1) * FIXED_ANGLE_INCREMENT

      setRotationOffset(progress * maxRotation)

      // Debounce: snap to nearest item 150 ms after scrolling stops
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      snapTimerRef.current = setTimeout(snapToNearest, 150)
    }

    /** Intercept mouse-wheel: advance exactly ±1 item instead of free-scrolling. */
    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault()
      const shell = shellRef.current
      if (!shell) return
      const rect = shell.getBoundingClientRect()
      const travel = Math.max(shell.offsetHeight - window.innerHeight, 1)
      const maxRot = (events.length - 1) * FIXED_ANGLE_INCREMENT
      if (maxRot === 0) return
      const progress = Math.min(Math.max(-rect.top / travel, 0), 1)
      const current = Math.min(events.length - 1, Math.max(0, Math.round(progress * (events.length - 1))))
      const direction = Math.sign(e.deltaY !== 0 ? e.deltaY : e.deltaX)
      const targetIndex = Math.min(events.length - 1, Math.max(0, current + direction))
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
      const shellTop = window.scrollY + rect.top
      const targetProgress = (targetIndex * FIXED_ANGLE_INCREMENT) / maxRot
      window.scrollTo({ top: shellTop + targetProgress * travel, behavior: 'smooth' })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    window.addEventListener('wheel', handleWheelEvent, { passive: false })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('wheel', handleWheelEvent)
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
    }
  }, [events.length])

  const maxRotation = useMemo(
    () => Math.max(0, (events.length - 1) * FIXED_ANGLE_INCREMENT),
    [events.length],
  )

  const wheelItems = useMemo(() => {
    if (events.length === 0) return []

    return events.map<WheelItem>((event, index) => {
      const angle = index * FIXED_ANGLE_INCREMENT - rotationOffset
      // Use raw distance (no angle wrapping) — the wheel is linear, not circular.
      const distanceToArcCenter = Math.abs(angle)
      const isVisible = distanceToArcCenter <= ARC_VISIBLE_SPAN
      const visibilityProgress = isVisible ? 1 - distanceToArcCenter / ARC_VISIBLE_SPAN : 0

      return {
        event,
        index,
        angle,
        distanceToArcCenter,
        isVisible,
        visibilityProgress,
      }
    })
  }, [events, rotationOffset])

  const offsetToScrollTop = (targetOffset: number) => {
    const shell = shellRef.current
    if (!shell) return null

    const shellTop = window.scrollY + shell.getBoundingClientRect().top
    const travel = Math.max(shell.offsetHeight - window.innerHeight, 1)
    const progress = maxRotation > 0 ? targetOffset / maxRotation : 0

    return shellTop + progress * travel
  }

  const scrollToActivePosition = (index: number) => {
    const shell = shellRef.current
    if (!shell || maxRotation === 0) return

    // Each item has a unique linear position — no wrapping needed.
    const targetOffset = index * FIXED_ANGLE_INCREMENT
    const targetScrollTop = offsetToScrollTop(targetOffset)
    if (targetScrollTop === null) return

    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }

  const pointerAngleFromCenter = (clientX: number, clientY: number) => {
    const wheel = wheelRef.current
    if (!wheel) return null

    const rect = wheel.getBoundingClientRect()
    const centerX = rect.left + rect.width * -0.42
    const centerY = rect.top + rect.height * 0.58

    return Math.atan2(clientY - centerY, clientX - centerX)
  }

  const handleWheelPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startAngle = pointerAngleFromCenter(event.clientX, event.clientY)
    if (startAngle === null) return

    const itemEl = (event.target as HTMLElement).closest<HTMLElement>('[data-index]')
    pressedItemIndexRef.current = itemEl ? Number(itemEl.dataset.index) : null

    dragMovedRef.current = false
    dragStateRef.current = {
      pointerId: event.pointerId,
      startAngle,
      startRotationOffset: rotationOffset,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleWheelPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    const currentAngle = pointerAngleFromCenter(event.clientX, event.clientY)
    if (currentAngle === null) return

    const deltaAngle = normalizeAngle(currentAngle - dragState.startAngle)
    if (Math.abs(deltaAngle) > 0.015) dragMovedRef.current = true

    const targetOffset = Math.min(
      maxRotation,
      Math.max(0, dragState.startRotationOffset - deltaAngle),
    )
    const targetScrollTop = offsetToScrollTop(targetOffset)
    if (targetScrollTop === null) return

    window.scrollTo({
      top: targetScrollTop,
      behavior: 'auto',
    })
  }

  const handleWheelPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    dragStateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)

    if (!dragMovedRef.current && pressedItemIndexRef.current !== null) {
      scrollToActivePosition(pressedItemIndexRef.current)
    }
    pressedItemIndexRef.current = null

    window.setTimeout(() => {
      dragMovedRef.current = false
    }, 0)
  }

  const activeIndex = useMemo(() => {
    if (wheelItems.length === 0) return -1

    return (
      wheelItems.reduce(
        (closest, item) => {
          if (!item.isVisible) return closest
          if (closest === null || item.distanceToArcCenter < closest.distanceToArcCenter)
            return item
          return closest
        },
        null as WheelItem | null,
      )?.index ?? 0
    )
  }, [wheelItems])

  const activeEvent = activeIndex >= 0 ? events[activeIndex] : null

  if (isError) return <ErrorState onRetry={onRetry} />

  if (isLoading) return <WheelSkeleton />

  if (events.length === 0) {
    return (
      <div className="timeline__empty">
        <p>{t('TIMELINE.NO_EVENTS')}</p>
      </div>
    )
  }

  return (
    <div
      className="timeline-shell"
      ref={shellRef}
      style={{ '--shell-height': `calc(100vh + ${(events.length - 1) * SCROLL_PER_ITEM}px)` } as CSSProperties}
    >
      <div className="timeline-stage">
        <div className="timeline-stage__grid">
          <div
            ref={wheelRef}
            className="timeline-wheel"
            aria-label={t('TIMELINE.ARIA_LABEL')}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerEnd}
            onPointerCancel={handleWheelPointerEnd}
          >
            <div className="timeline-wheel__orbit" aria-hidden="true" />

            {wheelItems.map(({ event, index, angle, isVisible, visibilityProgress }) => {
              const itemRadius = `var(--wheel-radius)`
              const isActive = index === activeIndex
              const normalizedAngle = normalizeAngle(angle)
              const isLeftSide = Math.abs(normalizedAngle) > Math.PI / 2
              const radialRotation = isLeftSide ? angle + Math.PI : angle
              const style = {
                transform: `translateY(-50%) translate(calc(cos(${angle}rad) * ${itemRadius}), calc(sin(${angle}rad) * ${itemRadius})) rotate(${radialRotation}rad) scale(${0.82 + visibilityProgress * 0.18})`,
                opacity: isVisible ? Math.max(0.2, visibilityProgress) : 0,
                pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
              }

              return (
                <button
                  key={`${event.year}-${event.text}`}
                  type="button"
                  data-index={index}
                  className={`timeline-wheel__item${isActive ? ' timeline-wheel__item--active' : ''}${isLeftSide ? ' timeline-wheel__item--flipped' : ''}`}
                  style={style}
                  onClick={() => scrollToActivePosition(index)}
                >
                  <span className="timeline-wheel__label">
                    <span className="timeline-wheel__year">{event.year}</span>
                    <span className="timeline-wheel__text">{event.text}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {activeEvent ? (
            <aside className="timeline-detail">
              <p className="timeline-detail__eyebrow">{t('TIMELINE.TITLE')}</p>
              <h2 className="timeline-detail__year">{activeEvent.year}</h2>
              <p className="timeline-detail__text">{activeEvent.text}</p>

              {activeEvent.imageUrl ? (
                <div className="timeline-detail__image-frame">
                  <img
                    className="timeline-detail__image"
                    src={activeEvent.imageUrl}
                    alt={t('TIMELINE.IMAGE_ALT', {
                      year: activeEvent.year,
                      text: activeEvent.text,
                    })}
                    loading="lazy"
                  />
                </div>
              ) : null}

              <div className="timeline-detail__actions">
                {activeEvent.articleUrl ? (
                  <a
                    href={activeEvent.articleUrl}
                    className="timeline-detail__link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('TIMELINE.WIKIPEDIA')} ↗
                  </a>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
