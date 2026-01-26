import { useState, useRef, useEffect } from 'react'

export interface Asset {
  id: string
  symbol: string
  name?: string
  decimals?: number
  isLpToken?: boolean
}

interface AssetSearchComboBoxProps {
  value?: string
  onChange: (assetId: string) => void
  assetsProvider: (query: string) => Promise<Asset[]>
  label: string
  placeholder?: string
  className?: string
}

export function AssetSearchComboBox({
  value,
  onChange,
  assetsProvider,
  label,
  placeholder = 'Search by symbol, name, or asset ID',
  className = '',
}: AssetSearchComboBoxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    if (!isOpen) return

    const timeoutId = setTimeout(async () => {
      if (searchQuery.trim().length === 0) {
        setAssets([])
        return
      }

      setLoading(true)
      try {
        const results = await assetsProvider(searchQuery)
        setAssets(results)
      } catch (error) {
        console.error('Error fetching assets:', error)
        setAssets([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen, assetsProvider])

  useEffect(() => {
    if (value && assets.length > 0) {
      const asset = assets.find(a => a.id === value)
      if (asset) {
        setSelectedAsset(asset)
      }
    }
  }, [value, assets])

  const handleSelect = (asset: Asset) => {
    setSelectedAsset(asset)
    onChange(asset.id)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    setSelectedAsset(null)
    onChange('')
    setSearchQuery('')
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label className="block text-sm text-mid-grey mb-2">{label}</label>
      
      {selectedAsset ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white flex items-center justify-between">
            <span className="text-sm">
              {selectedAsset.symbol} ({selectedAsset.id.slice(0, 8)}...)
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-mid-grey hover:text-off-white transition-colors"
              aria-label="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
          />
          
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 border-2 border-mid-grey/30 bg-near-black shadow-lg max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-4 py-3 text-mid-grey text-sm">Searching...</div>
              ) : assets.length === 0 && searchQuery.trim().length > 0 ? (
                <div className="px-4 py-3 text-mid-grey text-sm">No assets found</div>
              ) : (
                <ul className="py-1">
                  {assets.map((asset) => (
                    <li
                      key={asset.id}
                      onClick={() => handleSelect(asset)}
                      className="px-4 py-2 cursor-pointer transition-colors hover:bg-off-white/5 text-off-white text-sm"
                    >
                      <div className="font-medium">{asset.symbol}</div>
                      {asset.name && <div className="text-xs text-mid-grey">{asset.name}</div>}
                      <div className="text-xs text-mid-grey">{asset.id}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

