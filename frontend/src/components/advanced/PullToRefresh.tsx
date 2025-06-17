import React, { useState, useRef } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useMotionValue(0)
  
  const pullProgress = useTransform(currentY, [0, threshold], [0, 1])
  const pullOpacity = useTransform(currentY, [0, threshold / 2], [0, 1])
  const pullScale = useTransform(currentY, [0, threshold], [0.8, 1])
  const pullRotation = useTransform(currentY, [0, threshold], [0, 180])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0]?.clientY || 0
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return

    const deltaY = (e.touches[0]?.clientY || 0) - (startY.current || 0)
    if (deltaY > 0 && containerRef.current?.scrollTop === 0) {
      currentY.set(Math.min(deltaY * 0.5, threshold * 1.5))
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling || isRefreshing) return

    setIsPulling(false)
    
    if (currentY.get() >= threshold) {
      setIsRefreshing(true)
      currentY.set(threshold)
      
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        currentY.set(0)
      }
    } else {
      currentY.set(0)
    }
  }

  return (
    <div className="relative h-full overflow-hidden">
      {/* Pull indicator */}
      <motion.div
        style={{
          opacity: pullOpacity,
          scale: pullScale,
          y: currentY,
        }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-20 z-10"
      >
        <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
          <motion.div
            style={{ rotate: pullRotation }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <ArrowPathIcon 
              className={clsx(
                'w-6 h-6',
                currentY.get() >= threshold 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-400'
              )}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        ref={containerRef}
        style={{ y: currentY }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full overflow-y-auto overscroll-contain"
      >
        {children}
      </motion.div>
    </div>
  )
}