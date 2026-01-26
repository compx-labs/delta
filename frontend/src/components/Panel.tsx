import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  children: ReactNode
  className?: string
  variant?: 'light' | 'dark'
}

export function Panel({ title, children, className = '', variant = 'light' }: PanelProps) {
  const isDark = variant === 'dark'
  const borderColor = isDark ? 'border-mid-grey/20' : 'border-mid-grey/30'
  const titleColor = isDark ? 'text-off-white' : 'text-near-black'
  const textColor = isDark ? 'text-mid-grey' : 'text-slate-grey'
  
  return (
    <div className={`border-2 ${borderColor} p-6 ${className}`}>
      <h3 className={`text-lg font-medium ${titleColor} mb-4`}>{title}</h3>
      <div className={`${textColor} leading-relaxed`}>{children}</div>
    </div>
  )
}

