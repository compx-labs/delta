import { useNFD } from '../hooks/useNFD'
import { useExplorer } from '../context/explorerContext'
import { ExternalLink } from 'lucide-react'

interface AddressDisplayProps {
  address: string
  showExplorerLink?: boolean
  className?: string
  truncate?: boolean
}

/**
 * Component to display an Algorand address with NFD support
 * Shows NFD name if available, otherwise shows the address
 */
export function AddressDisplay({ 
  address, 
  showExplorerLink = false,
  className = '',
  truncate = false 
}: AddressDisplayProps) {
  const { data: nfdData } = useNFD(address)
  const { getExplorerUrl } = useExplorer()
  
  const displayText = nfdData?.name || (truncate 
    ? `${address.slice(0, 8)}...${address.slice(-8)}`
    : address)
  
  const content = (
    <span className={`font-mono ${className}`}>
      {displayText}
    </span>
  )
  
  if (showExplorerLink) {
    return (
      <a
        href={getExplorerUrl('address', address)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 hover:text-mid-grey ${className}`}
      >
        {content}
        <ExternalLink className="w-3 h-3" />
      </a>
    )
  }
  
  return content
}
