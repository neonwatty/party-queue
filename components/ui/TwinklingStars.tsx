'use client'

import { useEffect, useRef } from 'react'

interface TwinklingStarsProps {
  count?: number
}

export function TwinklingStars({ count = 35 }: TwinklingStarsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Clear any existing stars
    container.innerHTML = ''

    // Generate stars
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div')
      star.className = `star ${Math.random() > 0.7 ? 'bright' : ''}`

      // Random position
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 100}%`

      // Random animation timing for natural feel
      star.style.setProperty('--duration', `${2 + Math.random() * 4}s`)
      star.style.setProperty('--delay', `${Math.random() * 5}s`)

      container.appendChild(star)
    }
  }, [count])

  return <div ref={containerRef} className="stars-container" />
}
