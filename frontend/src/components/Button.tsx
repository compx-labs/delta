import { motion } from 'framer-motion';
import React, { ReactNode, forwardRef } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'default' | 'icon';
  href?: string;
  target?: string;
  rel?: string;
  title?: string;
}

type ButtonRef = HTMLButtonElement;
type AnchorRef = HTMLAnchorElement;

const borderVariants = {
  rest: {
    borderColor: 'rgba(163, 167, 173, 0.3)', // mid-grey/30 (#A3A7AD with 30% opacity)
  },
  hover: {
    borderColor: 'rgba(163, 167, 173, 0.8)', // mid-grey/80 - increased opacity
  },
  tap: {
    borderColor: 'rgba(163, 167, 173, 0.5)',
  },
};

const transition = {
  duration: 0.2,
  ease: 'easeInOut' as const,
};

export const Button = forwardRef<ButtonRef | AnchorRef, ButtonProps>(({ 
  children, 
  onClick, 
  disabled = false, 
  className = '',
  type = 'button',
  variant = 'default',
  href,
  target,
  rel,
  title
}, ref) => {
  const baseClasses = variant === 'icon'
    ? 'flex items-center justify-center border-2 text-mid-grey bg-near-black'
    : 'w-full h-12 px-4 bg-near-black border-2 text-off-white flex items-center gap-3 text-left group';
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  
  const commonProps = {
    className: `${baseClasses} ${disabled ? disabledClasses : ''} ${className}`,
    initial: "rest" as const,
    whileHover: disabled ? "rest" as const : "hover" as const,
    whileTap: disabled ? "rest" as const : "tap" as const,
    variants: borderVariants,
    transition,
  };

  // If href is provided, render as a link
  if (href) {
    return (
      <motion.a
        href={href}
        target={target}
        rel={rel}
        title={title}
        ref={ref as React.ForwardedRef<AnchorRef>}
        {...commonProps}
      >
        {children}
      </motion.a>
    );
  }

  // Otherwise render as button
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      ref={ref as React.ForwardedRef<ButtonRef>}
      {...commonProps}
    >
      {children}
    </motion.button>
  );
});
