interface ReviewRowProps {
  label: string
  value: string | React.ReactNode
  className?: string
}

export function ReviewRow({ label, value, className = '' }: ReviewRowProps) {
  return (
    <div className={`flex justify-between items-start py-5 px-6 border-b-2 border-mid-grey/20 last:border-b-0 ${className}`}>
      <div className="text-sm text-mid-grey font-medium pr-4 flex-shrink-0">{label}</div>
      <div className="text-sm text-off-white text-right max-w-md leading-relaxed">{value}</div>
    </div>
  )
}

