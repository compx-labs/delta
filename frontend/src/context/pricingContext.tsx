import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GENERAL_BACKEND_URL } from '../constants/constants'

export interface PriceMap {
  [assetId: string]: {
    price: {
      max: number // USD price
    }
  }
}

interface PricingContextType {
  priceMap: PriceMap | null
  isLoading: boolean
  error: Error | null
  getPrice: (assetId: string | number | bigint) => number | null
  getUsdValue: (amount: bigint | number, assetId: string | number | bigint, decimals?: number) => number | null
  refetch: () => void
}

const PricingContext = createContext<PricingContextType | undefined>(undefined)

export const PricingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    data: priceMap = null,
    isLoading,
    error,
    refetch,
  } = useQuery<PriceMap>({
    queryKey: ['prices'],
    queryFn: async () => {
      const response = await fetch(`${GENERAL_BACKEND_URL}/prices`)
      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`)
      }
      const data = await response.json()
      return data as PriceMap
    },
    staleTime: 60 * 1000, // Data is fresh for 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  })

  // Helper function to get price for a specific asset
  const getPrice = (assetId: string | number | bigint): number | null => {
    if (!priceMap) return null
    const assetIdStr = assetId.toString()
    const assetPrice = priceMap[assetIdStr]
    return assetPrice?.price?.max ?? null
  }

  // Helper function to calculate USD value of an amount
  const getUsdValue = (
    amount: bigint | number,
    assetId: string | number | bigint,
    decimals: number = 6
  ): number | null => {
    const price = getPrice(assetId)
    if (price === null) return null

    // Convert amount to human-readable format
    const amountNumber = typeof amount === 'bigint' ? Number(amount) : amount
    const amountInUnits = amountNumber / Math.pow(10, decimals)

    // Calculate USD value
    return amountInUnits * price
  }

  return (
    <PricingContext.Provider
      value={{
        priceMap,
        isLoading,
        error: error as Error | null,
        getPrice,
        getUsdValue,
        refetch,
      }}
    >
      {children}
    </PricingContext.Provider>
  )
}

export const usePricing = () => {
  const context = useContext(PricingContext)
  if (context === undefined) {
    throw new Error('usePricing must be used within a PricingProvider')
  }
  return context
}
