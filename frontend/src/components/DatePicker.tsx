interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  label: string
  min?: string
  max?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  label,
  min,
  max,
  className = '',
}: DatePickerProps) {
  return (
    <div className={className}>
      <label className="block text-sm text-mid-grey mb-2">{label}</label>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white focus:outline-none focus:ring-1 focus:ring-amber"
      />
    </div>
  )
}

