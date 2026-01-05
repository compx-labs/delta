interface ReviewRowProps {
  label: string
  value: string | React.ReactNode
  className?: string
}

export function ReviewRow({ label, value, className = '' }: ReviewRowProps) {
  return (
    <div className={`flex justify-between items-start py-3 border-b border-mid-grey/20 ${className}`}>
      <div className="text-sm text-mid-grey">{label}</div>
      <div className="text-sm text-off-white text-right max-w-md">{value}</div>
    </div>
  )
}

