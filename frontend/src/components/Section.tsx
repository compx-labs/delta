import { ReactNode } from 'react'

interface SectionProps {
  title?: string
  children: ReactNode
  className?: string
  id?: string
}

export function Section({ title, children, className = '', id }: SectionProps) {
  // Check if section has dark background
  const isDark = className.includes('bg-near-black')
  
  return (
    <section id={id} className={`py-16 ${className}`}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className={`text-2xl font-medium mb-8 ${isDark ? 'text-off-white' : 'text-near-black'}`}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

