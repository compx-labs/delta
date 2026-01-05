import type { PoolStatus } from '../types/pool'

interface StatusDotProps {
  status: PoolStatus
  className?: string
}

export function StatusDot({ status, className = '' }: StatusDotProps) {
  return (
    <div
      className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-amber' : 'bg-mid-grey'} ${className}`}
      aria-label={status === 'active' ? 'Active' : 'Inactive'}
    />
  )
}

