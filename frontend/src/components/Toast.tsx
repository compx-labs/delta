import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useToast } from '../context/toastContext'

export function Toast() {
  const { toast, toastVisible, closeToast } = useToast()

  if (!toastVisible || !toast.type) return null

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'loading':
        return <Loader2 className="w-5 h-5 text-amber animate-spin" />
      case 'multi-step':
        return <Loader2 className="w-5 h-5 text-amber animate-spin" />
      default:
        return null
    }
  }

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-500/50'
      case 'error':
        return 'border-red-500/50'
      case 'loading':
      case 'multi-step':
        return 'border-amber/50'
      default:
        return 'border-mid-grey/30'
    }
  }

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-500/10'
      case 'error':
        return 'bg-red-500/10'
      case 'loading':
      case 'multi-step':
        return 'bg-amber/10'
      default:
        return 'bg-near-black'
    }
  }

  return createPortal(
    <AnimatePresence>
      {toastVisible && (
        <div className="fixed bottom-4 right-4 z-[10001] max-w-md w-full mx-4">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`relative bg-near-black border-2 ${getBorderColor()} ${getBgColor()} p-4 shadow-lg`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-off-white font-medium text-sm mb-1">
                  {toast.message}
                </h3>
                {toast.description && (
                  <p className="text-mid-grey text-xs">
                    {toast.description}
                  </p>
                )}
                {/* Multi-step progress */}
                {toast.type === 'multi-step' && toast.steps && (
                  <div className="mt-3 space-y-2">
                    {toast.steps.map((step, index) => {
                      const isCurrent = step.id === toast.currentStepId
                      const isCompleted = toast.currentStepIndex !== undefined && index < toast.currentStepIndex
                      
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 text-xs ${
                            isCompleted
                              ? 'text-green-500'
                              : isCurrent
                              ? 'text-accent'
                              : 'text-mid-grey'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                          ) : (
                            <div className="w-4 h-4 flex-shrink-0 rounded-full border-2 border-mid-grey" />
                          )}
                          <span className={isCurrent ? 'font-medium' : ''}>
                            {step.name}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Close button */}
              {toast.type !== 'loading' && toast.type !== 'multi-step' && (
                <button
                  onClick={closeToast}
                  className="flex-shrink-0 p-1 hover:bg-mid-grey/10 rounded transition-colors"
                  aria-label="Close toast"
                >
                  <X className="w-4 h-4 text-mid-grey hover:text-off-white" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
