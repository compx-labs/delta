/**
 * URL parameter utilities for Create Pool wizard
 */

export interface WizardParams {
  step: string
  type?: 'single' | 'lp'
  stakeAssetId?: string
  rewardAssetId?: string
  totalRewards?: string
  endMode?: 'endDate' | 'targetApr'
  endDate?: string
  targetApr?: string
  startMode?: 'now' | 'scheduled'
  startDate?: string
  poolName?: string
  createdBy?: string
  websiteUrl?: string
  description?: string
  tags?: string
}

export function readParams(searchParams: URLSearchParams): Partial<WizardParams> {
  return {
    step: searchParams.get('step') || '1',
    type: (searchParams.get('type') as 'single' | 'lp') || undefined,
    stakeAssetId: searchParams.get('stakeAssetId') || undefined,
    rewardAssetId: searchParams.get('rewardAssetId') || undefined,
    totalRewards: searchParams.get('totalRewards') || undefined,
    endMode: (searchParams.get('endMode') as 'endDate' | 'targetApr') || undefined,
    endDate: searchParams.get('endDate') || undefined,
    targetApr: searchParams.get('targetApr') || undefined,
    startMode: (searchParams.get('startMode') as 'now' | 'scheduled') || 'now',
    startDate: searchParams.get('startDate') || undefined,
    poolName: searchParams.get('poolName') || undefined,
    createdBy: searchParams.get('createdBy') || undefined,
    websiteUrl: searchParams.get('websiteUrl') || undefined,
    description: searchParams.get('description') || undefined,
    tags: searchParams.get('tags') || undefined,
  }
}

export function writeParams(
  currentParams: URLSearchParams,
  updates: Partial<WizardParams>
): URLSearchParams {
  const newParams = new URLSearchParams(currentParams)
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      newParams.delete(key)
    } else {
      newParams.set(key, String(value))
    }
  })
  
  return newParams
}

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationError[]
}

// const MIN_DURATION_DAYS = 1
// const MAX_DURATION_DAYS = 730 // 2 years
const MAX_APR = 1000

export function validateStep(step: string, params: Partial<WizardParams>): ValidationResult {
  const errors: ValidationError[] = []

  switch (step) {
    case '1':
      if (!params.type) {
        errors.push({ field: 'type', message: 'Select a pool type' })
      }
      break

    case '2':
      if (!params.stakeAssetId) {
        errors.push({ field: 'stakeAssetId', message: 'Select a stake asset' })
      }
      if (!params.rewardAssetId) {
        errors.push({ field: 'rewardAssetId', message: 'Select a reward asset' })
      }
      break

    case '3':
      if (!params.totalRewards || parseFloat(params.totalRewards) <= 0) {
        errors.push({ field: 'totalRewards', message: 'Enter total rewards greater than 0' })
      }
      // Always require target APR
      if (!params.targetApr || parseFloat(params.targetApr) <= 0) {
        errors.push({ field: 'targetApr', message: 'Enter a target APR greater than 0' })
      } else if (parseFloat(params.targetApr) > MAX_APR) {
        errors.push({ field: 'targetApr', message: `APR cannot exceed ${MAX_APR}%` })
      }
      break

    case '4':
      if (!params.poolName || params.poolName.length < 2 || params.poolName.length > 48) {
        errors.push({ field: 'poolName', message: 'Pool name must be 2-48 characters' })
      }
      if (params.websiteUrl && params.websiteUrl.length > 0) {
        try {
          new URL(params.websiteUrl)
        } catch {
          errors.push({ field: 'websiteUrl', message: 'Enter a valid URL' })
        }
      }
      if (params.description && params.description.length > 140) {
        errors.push({ field: 'description', message: 'Description cannot exceed 140 characters' })
      }
      break

    case '5':
      // Review step - validate all previous steps
      const step1Validation = validateStep('1', params)
      const step2Validation = validateStep('2', params)
      const step3Validation = validateStep('3', params)
      const step4Validation = validateStep('4', params)
      
      errors.push(...step1Validation.errors, ...step2Validation.errors, ...step3Validation.errors, ...step4Validation.errors)
      break
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

