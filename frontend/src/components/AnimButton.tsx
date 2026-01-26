import React from 'react'

interface AnimButtonProps {
  text: string
  onClick: () => void
}

export function AnimButton({ text, onClick }: AnimButtonProps) {
  return (
    <button
      onClick={onClick}
      className="inline-block px-6 py-3 bg-transparent border-2 border-white text-off-white font-medium hover:bg-white hover:text-near-black transition-colors text-center"
    >
      {text}
    </button>
  )
}
