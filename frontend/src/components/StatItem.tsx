interface StatItemProps {
  label: string
  value: string | number
  className?: string
  variant?: 'light' | 'dark'
}

export function StatItem({ label, value, className = '', variant = 'light' }: StatItemProps) {
  const displayValue = value === null || value === undefined || value === '' ? '--' : value
  const isDark = variant === 'dark'
  const labelColor = isDark ? 'text-mid-grey' : 'text-slate-grey'
  const valueColor = isDark ? 'text-off-white' : 'text-near-black'
  
  return (
    <div className={className}>
      <div className={`text-xs ${labelColor} mb-1`}>{label}</div>
      <div className={`text-xl font-medium ${valueColor}`}>{displayValue}</div>
    </div>
  )
}

