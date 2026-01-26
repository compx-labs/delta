import { useState } from 'react'

interface CopyFieldProps {
  label: string
  value: string
  className?: string
  variant?: 'light' | 'dark'
}

export function CopyField({ label, value, className = '', variant = 'light' }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  const isDark = variant === 'dark'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className={`text-xs ${isDark ? 'text-mid-grey' : 'text-slate-grey'}`}>{label}</label>
      <div className="flex items-center gap-2">
        <code className={`flex-1 px-3 py-2 text-sm break-all ${
          isDark 
            ? 'bg-off-white/5 border-2 border-mid-grey/20 text-off-white' 
            : 'bg-near-black text-off-white'
        }`}>
          {value}
        </code>
        <button
          onClick={handleCopy}
          className={`px-3 py-2 border-2 border-mid-grey/30 transition-colors text-sm ${
            isDark
              ? 'text-mid-grey hover:border-mid-grey hover:text-off-white'
              : 'text-slate-grey hover:border-mid-grey hover:text-near-black'
          }`}
          aria-label={`Copy ${label}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

