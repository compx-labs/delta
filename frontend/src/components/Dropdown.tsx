import { useState, useRef, useEffect } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder,
  className = '',
  label,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(opt => opt.value === value) || options[0]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="sr-only">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white hover:border-mid-grey transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-amber"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || placeholder}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 border border-mid-grey/30 bg-near-black shadow-lg min-w-full w-fit">
          <ul
            role="listbox"
            className="py-1"
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`px-4 py-2 cursor-pointer transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-amber/20 text-amber'
                      : 'text-off-white hover:bg-off-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {isSelected && (
                      <span className="text-xs">✓</span>
                    )}
                    {option.label}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

