interface StepIndicatorProps {
  steps: string[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="relative flex items-center mb-8 w-full">
      {/* Background line spanning full width */}
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-mid-grey/30 -translate-y-1/2"></div>
      
      {/* Progress line */}
      <div 
        className="absolute left-0 top-1/2 h-0.5 bg-amber -translate-y-1/2 transition-all duration-300"
        style={{ 
          width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
        }}
      ></div>
      
      {/* Step circles */}
      <div className="relative flex items-center justify-between w-full">
        {steps.map((_step, index) => {
          const stepNum = index + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep
          
          return (
            <div
              key={stepNum}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors flex-shrink-0 relative z-10 ${
                isActive
                  ? 'border-amber bg-amber text-off-white'
                  : isCompleted
                  ? 'border-amber bg-amber text-off-white'
                  : 'border-mid-grey/30 bg-near-black text-off-white'
              }`}
            >
              {isCompleted ? '✓' : stepNum}
            </div>
          )
        })}
      </div>
    </div>
  )
}

