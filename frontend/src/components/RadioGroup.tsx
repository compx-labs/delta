import { ReactNode } from 'react'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  onChange: (value: string) => void
  label?: string
  className?: string
}

export function RadioGroup({
  options,
  value,
  onChange,
  label,
  className = '',
}: RadioGroupProps) {
  return (
    <div className={className}>
      {label && <label className="block text-sm text-mid-grey mb-3">{label}</label>}
      <div className="space-y-3">
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-amber bg-amber/10'
                  : 'border-mid-grey/30 hover:border-mid-grey'
              }`}
            >
              <input
                type="radio"
                value={option.value}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-4 h-4 text-amber focus:ring-amber"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${isSelected ? 'text-amber' : 'text-off-white'}`}>
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs text-mid-grey mt-1">{option.description}</div>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

