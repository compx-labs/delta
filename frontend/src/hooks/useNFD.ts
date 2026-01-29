import { useQuery } from '@tanstack/react-query'

/**
 * Fetches NFD (Name Service Domain) for an Algorand address
 */
async function getNFDForAddress(address: string): Promise<{ name: string } | null> {
  try {
    const nfdURL = `https://api.nf.domains/nfd/address?address=${address}&limit=1&view=thumbnail`
    const response = await fetch(nfdURL)
    const data = await response.json()
    
    if (!data || !Array.isArray(data) || data.length !== 1) {
      return null
    }
    
    const nfdBlob = data[0]
    if (!nfdBlob.depositAccount || nfdBlob.depositAccount !== address) {
      return null
    }
    
    return { name: nfdBlob.name }
  } catch (error) {
    console.error('NFD fetch error:', error)
    return null
  }
}

/**
 * Hook to fetch and cache NFD for an address
 * @param address - Algorand address to look up
 * @returns NFD data or null
 */
export function useNFD(address: string | null | undefined) {
  return useQuery({
    queryKey: ['nfd', address],
    queryFn: () => address ? getNFDForAddress(address) : null,
    enabled: !!address,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  })
}
