interface NumericInputProps {
  value: string
  onChange: (value: string) => void
  label: string
  suffix?: string
  placeholder?: string
  className?: string
  min?: number
  max?: number
}

export function NumericInput({
  value,
  onChange,
  label,
  suffix,
  placeholder = '0.00',
  className = '',
  min,
  max,
}: NumericInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow empty string, numbers, and single decimal point
    if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
      onChange(inputValue)
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm text-mid-grey mb-2">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          className="flex-1 px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
        />
        {suffix && (
          <span className="text-sm text-mid-grey whitespace-nowrap">{suffix}</span>
        )}
      </div>
    </div>
  )
}

