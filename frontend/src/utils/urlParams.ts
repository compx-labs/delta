export function getPoolId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('poolId')
}

export function setPoolId(poolId: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('poolId', poolId)
  window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
}

export function clearPoolId() {
  const params = new URLSearchParams(window.location.search)
  params.delete('poolId')
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname
  window.history.pushState({}, '', newUrl)
}

