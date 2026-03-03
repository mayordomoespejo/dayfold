import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
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
  title: string
}

const ARC_VISIBLE_SPAN = 1.2
/** Fixed radians between adjacent items — constant regardless of item count. */
const FIXED_ANGLE_INCREMENT = 0.1
/** Pixels of page scroll needed to advance one item through the visible arc. */
const SCROLL_PER_ITEM = 220
/** Angular velocity of the auto-rotate idle animation — 1 rev / 120 s, same as the header icon. */
const AUTO_ROTATE_SPEED = (2 * Math.PI) / 120

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

const PlayIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M4 3.5a.5.5 0 0 1 .763-.424l9 5a.5.5 0 0 1 0 .848l-9 5A.5.5 0 0 1 4 13.5v-10z" />
  </svg>
)

const PauseIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <rect x="3" y="3" width="4" height="10" rx="1" />
    <rect x="9" y="3" width="4" height="10" rx="1" />
  </svg>
)

/**
 * Renders the radial timeline and synchronizes scroll and drag interactions.
 */
export function Timeline({ events, isLoading, isError, onRetry, title }: Props) {
  const { t } = useTranslation()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<{
    pointerId: number
    startY: number
    startRotationOffset: number
  } | null>(null)
  const dragMovedRef = useRef(false)
  const pressedItemIndexRef = useRef<number | null>(null)
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Auto-rotate idle state
  const autoRotateActiveRef = useRef(true)
  const autoRafRef = useRef<number | null>(null)
  const autoTimestampRef = useRef<number | null>(null)
  const [rotationOffset, setRotationOffset] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  // ── Scroll / snap / wheel-event handler ───────────────────────────────────

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

      // Don't snap while auto-rotating — snap would fight the animation.
      // 350 ms lets mobile momentum inertia fully settle before snapping.
      if (!autoRotateActiveRef.current) {
        if (snapTimerRef.current) clearTimeout(snapTimerRef.current)
        snapTimerRef.current = setTimeout(snapToNearest, 350)
      }
    }

    /** Intercept mouse-wheel: advance exactly ±1 item instead of free-scrolling. */
    const handleWheelEvent = (e: WheelEvent) => {
      // Stop auto-rotate on first user wheel interaction
      if (autoRotateActiveRef.current) {
        autoRotateActiveRef.current = false
        setIsAutoPlaying(false)
      }

      if (e.target instanceof Element && e.target.closest('.dropdown')) return
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

  // ── Touch: stop auto-rotate on any finger contact ──────────────────────────
  // Handles the case where the user starts scrolling from outside the wheel
  // (e.g. the detail card), so pointerdown on the wheel never fires.

  useEffect(() => {
    const onTouchStart = () => {
      if (autoRotateActiveRef.current) {
        autoRotateActiveRef.current = false
        setIsAutoPlaying(false)
      }
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    return () => window.removeEventListener('touchstart', onTouchStart)
  }, [])

  // ── Auto-rotate idle animation ─────────────────────────────────────────────
  // Advances the wheel at AUTO_ROTATE_SPEED until the user interacts, the
  // play/pause button pauses it, or the last item is reached.

  useEffect(() => {
    if (events.length === 0 || !isAutoPlaying) return

    autoRotateActiveRef.current = true
    autoTimestampRef.current = null

    const maxRot = (events.length - 1) * FIXED_ANGLE_INCREMENT

    // If scroll is already at/past the end (e.g. browser restored scroll position
    // from a previous session where auto-rotate had finished), jump back to the
    // beginning so the animation has travel to cover.
    const shellAtStart = shellRef.current
    if (shellAtStart) {
      const rect = shellAtStart.getBoundingClientRect()
      const travel = Math.max(shellAtStart.offsetHeight - window.innerHeight, 1)
      const shellTop = window.scrollY + rect.top
      if (window.scrollY >= shellTop + travel - 1) {
        window.scrollTo({ top: 0 })
      }
    }

    const tick = (timestamp: number) => {
      if (!autoRotateActiveRef.current) return

      if (autoTimestampRef.current === null) {
        autoTimestampRef.current = timestamp
        autoRafRef.current = requestAnimationFrame(tick)
        return
      }

      // Cap dt at 100 ms so switching tabs doesn't cause a large jump
      const dt = Math.min((timestamp - autoTimestampRef.current) / 1000, 0.1)
      autoTimestampRef.current = timestamp

      const shell = shellRef.current
      if (!shell) {
        autoRafRef.current = requestAnimationFrame(tick)
        return
      }

      const shellRect = shell.getBoundingClientRect()
      const travel = Math.max(shell.offsetHeight - window.innerHeight, 1)
      const shellTop = window.scrollY + shellRect.top

      // pixels/s = (rad/s ÷ total_rad) × total_pixels
      const scrollDelta = maxRot > 0 ? (AUTO_ROTATE_SPEED / maxRot) * travel * dt : 0
      const endScrollY = shellTop + travel
      const targetScrollY = window.scrollY + scrollDelta

      if (targetScrollY >= endScrollY) {
        autoRotateActiveRef.current = false
        setIsAutoPlaying(false)
        window.scrollTo({ top: endScrollY })
        return
      }

      window.scrollTo({ top: targetScrollY })
      autoRafRef.current = requestAnimationFrame(tick)
    }

    autoRafRef.current = requestAnimationFrame(tick)

    return () => {
      autoRotateActiveRef.current = false
      if (autoRafRef.current !== null) { cancelAnimationFrame(autoRafRef.current); autoRafRef.current = null }
    }
  }, [events.length, isAutoPlaying])

  // ── Derived state ─────────────────────────────────────────────────────────

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

    // Blur any focused wheel item so :focus-visible doesn't persist
    // on items that are no longer active after the scroll.
    const focused = document.activeElement
    if (focused instanceof HTMLElement && (focused as HTMLElement).dataset.index !== undefined) {
      focused.blur()
    }

    // Each item has a unique linear position — no wrapping needed.
    const targetOffset = index * FIXED_ANGLE_INCREMENT
    const targetScrollTop = offsetToScrollTop(targetOffset)
    if (targetScrollTop === null) return

    window.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
  }

  // ── Pointer / keyboard handlers ───────────────────────────────────────────

  const handleWheelPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Stop auto-rotate on any wheel interaction
    if (autoRotateActiveRef.current) {
      autoRotateActiveRef.current = false
      setIsAutoPlaying(false)
    }

    const itemEl = (event.target as HTMLElement).closest<HTMLElement>('[data-index]')
    pressedItemIndexRef.current = itemEl ? Number(itemEl.dataset.index) : null
    dragMovedRef.current = false

    if (event.pointerType === 'touch') {
      // Touch: let the browser handle native scroll with momentum.
      // pointercancel fires if the user scrolls; pointerup fires on a tap.
      dragStateRef.current = null
      return
    }

    // Mouse / pen: full drag model with pointer capture
    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startRotationOffset: rotationOffset,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleWheelPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current
    if (!dragState || dragState.pointerId !== event.pointerId) return

    // Linear Y drag: dragging down advances the wheel (same direction as scroll-down)
    const deltaY = event.clientY - dragState.startY
    if (Math.abs(deltaY) > 4) dragMovedRef.current = true

    const radPerPixel = FIXED_ANGLE_INCREMENT / SCROLL_PER_ITEM
    // Drag down = wheel rotates backward (like grabbing a physical wheel on its right side)
    const targetOffset = Math.min(
      maxRotation,
      Math.max(0, dragState.startRotationOffset - deltaY * radPerPixel),
    )

    const targetScrollTop = offsetToScrollTop(targetOffset)
    if (targetScrollTop === null) return
    window.scrollTo({ top: targetScrollTop, behavior: 'instant' as ScrollBehavior })
  }

  const handleWheelPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current

    if (dragState) {
      // Mouse / pen drag: verify pointerId before releasing capture
      if (dragState.pointerId !== event.pointerId) return
      dragStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
      setIsDragging(false)
    }
    // Touch taps also reach here (dragState is null for touch — no capture was set)

    if (!dragMovedRef.current && pressedItemIndexRef.current !== null) {
      scrollToActivePosition(pressedItemIndexRef.current)
    }
    pressedItemIndexRef.current = null

    window.setTimeout(() => {
      dragMovedRef.current = false
    }, 0)
  }

  /** Browser took over the touch gesture (native scroll) — clean up without activating items. */
  const handleWheelPointerCancel = () => {
    dragStateRef.current = null
    dragMovedRef.current = false
    pressedItemIndexRef.current = null
    setIsDragging(false)
  }

  const handleWheelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    if (events.length === 0) return

    // Stop auto-rotate on keyboard navigation
    if (autoRotateActiveRef.current) {
      autoRotateActiveRef.current = false
      setIsAutoPlaying(false)
    }

    event.preventDefault()

    const direction = event.key === 'ArrowDown' ? 1 : -1
    const baseIndex = activeIndex >= 0 ? activeIndex : 0
    const targetIndex = Math.min(events.length - 1, Math.max(0, baseIndex + direction))

    if (targetIndex === baseIndex) return
    scrollToActivePosition(targetIndex)
  }

  // ── Active item ───────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

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
      style={{ height: `calc(100vh + ${(events.length - 1) * SCROLL_PER_ITEM}px)` } as CSSProperties}
    >
      <div className="timeline-stage">
        <div className="timeline-stage__grid">
          <div
            ref={wheelRef}
            className={`timeline-wheel${isDragging ? ' timeline-wheel--dragging' : ''}`}
            aria-label={t('TIMELINE.ARIA_LABEL')}
            tabIndex={0}
            onKeyDown={handleWheelKeyDown}
            onPointerDown={handleWheelPointerDown}
            onPointerMove={handleWheelPointerMove}
            onPointerUp={handleWheelPointerEnd}
            onPointerCancel={handleWheelPointerCancel}
          >
            <div className="timeline-wheel__orbit" aria-hidden="true" />

            {wheelItems.map(({ event, index, angle, isVisible, visibilityProgress }) => {
              const itemRadius = `var(--wheel-radius)`
              const isActive = index === activeIndex
              const normalizedAngle = normalizeAngle(angle)
              const isLeftSide = Math.abs(normalizedAngle) > Math.PI / 2
              const radialRotation = isActive ? 0 : isLeftSide ? angle + Math.PI : angle
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
              <p className="timeline-detail__eyebrow">{title}</p>
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

                <button
                  type="button"
                  className={`timeline-detail__playpause${isAutoPlaying ? ' timeline-detail__playpause--playing' : ''}`}
                  onClick={() => setIsAutoPlaying(p => !p)}
                  aria-label={isAutoPlaying ? 'Pausar avance' : 'Reanudar avance'}
                  title={isAutoPlaying ? 'Pausar avance' : 'Reanudar avance'}
                >
                  {isAutoPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  )
}
