'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface BeforeAfterSliderProps {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = '',
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const handleStart = useCallback(
    (clientX: number) => {
      isDragging.current = true
      updatePosition(clientX)
    },
    [updatePosition],
  )

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging.current) return
      updatePosition(clientX)
    },
    [updatePosition],
  )

  const handleEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX)
    const onMouseUp = () => handleEnd()
    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return
      e.preventDefault()
      handleMove(e.touches[0].clientX)
    }
    const onTouchEnd = () => handleEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [handleMove, handleEnd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setPosition((p) => Math.max(0, p - step))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setPosition((p) => Math.min(100, p + step))
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none ${className}`}
      role="slider"
      aria-label="Drag to compare before and after"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => {
        e.preventDefault()
        handleStart(e.clientX)
      }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      style={{ cursor: 'col-resize' }}
    >
      {/* Before — base layer */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* After — clip overlay (visible from the right, clipped on the left) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 0 0 ${position}%)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt={afterLabel}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Gold divider line + drag handle */}
      <div
        className="absolute top-0 bottom-0 w-px bg-gold-400 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gold-400 shadow-lg shadow-gold-400/40 flex items-center justify-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 3L2 7L5 11"
              stroke="#1A1714"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M9 3L12 7L9 11"
              stroke="#1A1714"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Labels */}
      {position > 18 && (
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-noir-950/60 backdrop-blur-sm font-body text-xs text-noir-200 pointer-events-none">
          {beforeLabel}
        </span>
      )}
      {position < 82 && (
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-gold-400/20 backdrop-blur-sm font-body text-xs text-gold-300 pointer-events-none">
          {afterLabel}
        </span>
      )}
    </div>
  )
}
