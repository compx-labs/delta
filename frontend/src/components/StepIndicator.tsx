interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const stepNum = index + 1
        const isActive = stepNum === currentStep
        const isCompleted = stepNum < currentStep
        
        return (
          <div key={stepNum} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Step Circle */}
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-amber bg-amber text-off-white'
                      : isCompleted
                      ? 'border-amber bg-amber text-off-white'
                      : 'border-mid-grey/30 text-mid-grey'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-amber' : 'bg-mid-grey/30'
                    }`}
                  />
                )}
              </div>
              
              {/* Step Label */}
              <div className="mt-2 text-xs text-center">
                <span
                  className={
                    isActive
                      ? 'text-amber font-medium'
                      : isCompleted
                      ? 'text-mid-grey'
                      : 'text-mid-grey'
                  }
                >
                  {step}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

