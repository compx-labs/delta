import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface SectionProps {
  title?: string
  children: ReactNode
  className?: string
  id?: string
  animationDelay?: number
}

export function Section({ title, children, className = '', id, animationDelay = 0 }: SectionProps) {
  // Check if section has dark background
  const isDark = className.includes('bg-near-black')
  
  return (
    <motion.section
      id={id}
      className={`py-16 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: animationDelay }}
    >
      <div className="container mx-auto px-4">
        {title && (
          <h2 className={`text-2xl font-medium mb-8 ${isDark ? 'text-off-white' : 'text-near-black'}`}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </motion.section>
  )
}

