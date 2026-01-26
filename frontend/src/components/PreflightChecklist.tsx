interface PreflightItem {
  label: string
  status: 'unknown' | 'yes' | 'no'
}

interface PreflightChecklistProps {
  items: PreflightItem[]
  className?: string
}

export function PreflightChecklist({ items, className = '' }: PreflightChecklistProps) {
  return (
    <div className={className}>
      <h3 className="text-sm font-medium text-off-white mb-4">Preflight Checks</h3>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b-2 border-mid-grey/20">
            <span className="text-sm text-mid-grey">{item.label}</span>
            <span className={`text-sm ${
              item.status === 'yes'
                ? 'text-amber'
                : item.status === 'no'
                ? 'text-mid-grey'
                : 'text-mid-grey'
            }`}>
              {item.status === 'yes' ? 'Yes' : item.status === 'no' ? 'No' : 'Not checked'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

