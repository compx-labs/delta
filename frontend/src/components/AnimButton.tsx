import { motion } from 'framer-motion'
import { IoMdPlay } from 'react-icons/io'

interface AnimButtonProps {
  text: string
  onClick: () => void
  disabled?: boolean
  variant?: 'default' | 'amber'
  className?: string
}

export function AnimButton({ text, onClick, disabled = false, variant = 'default', className = '' }: AnimButtonProps) {
  const baseClasses = variant === 'amber'
    ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
    : 'bg-transparent border-2 border-off-white text-off-white'
  
  const disabledClasses = 'border-mid-grey/30 text-mid-grey cursor-not-allowed opacity-50'
  
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center px-6 py-3 border-2 font-medium ${disabled ? disabledClasses : baseClasses} ${className}`}
      initial="rest"
      whileHover={disabled ? "rest" : "hover"}
      transition={{
        duration: 0.2,
        ease: 'easeInOut',
      }}
    >
      <motion.span
        variants={{
          rest: { x: 0 },
          hover: { x: -10 },
        }}
        transition={{
          duration: 0.2,
          ease: 'easeInOut',
        }}
      >
        {text}
      </motion.span>
      {!disabled && (
        <motion.div
          className="flex items-center overflow-hidden"
          variants={{
            rest: { opacity: 0, y: 8, width: 0 },
            hover: { opacity: 1, y: 0, width: '1.5rem' },
          }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
        >
          <IoMdPlay className="w-4 h-4 text-off-white ml-2" />
        </motion.div>
      )}
    </motion.button>
  )
}
