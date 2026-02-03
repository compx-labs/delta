import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  longPressDelay?: number;
  className?: string;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 300,
  longPressDelay = 500,
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Calculate optimal position and coordinates based on viewport constraints
  const calculatePositionAndCoords = useCallback(() => {
    if (!triggerRef.current) return { position, top: 0, left: 0 };

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Better tooltip dimension estimation based on content
    const estimatedTooltipWidth = Math.min(Math.max(content.length * 7 + 32, 120), 320); // More accurate estimate
    const estimatedTooltipHeight = 44; // Account for padding and border
    const gap = 12; // Increased gap for better spacing
    const edgeMargin = 16; // Margin from viewport edges

    let finalPosition = position;
    let top = 0;
    let left = 0;

    // Test all positions and choose the best one
    const positions = ['top', 'bottom', 'left', 'right'] as const;
    const positionScores: Record<string, number> = {};

    positions.forEach(pos => {
      let score = 0;
      let testTop = 0;
      let testLeft = 0;

      // Calculate coordinates for this position
      switch (pos) {
        case 'top':
          testTop = triggerRect.top - estimatedTooltipHeight - gap;
          testLeft = triggerRect.left + triggerRect.width / 2 - estimatedTooltipWidth / 2;
          break;
        case 'bottom':
          testTop = triggerRect.bottom + gap;
          testLeft = triggerRect.left + triggerRect.width / 2 - estimatedTooltipWidth / 2;
          break;
        case 'left':
          testTop = triggerRect.top + triggerRect.height / 2 - estimatedTooltipHeight / 2;
          testLeft = triggerRect.left - estimatedTooltipWidth - gap;
          break;
        case 'right':
          testTop = triggerRect.top + triggerRect.height / 2 - estimatedTooltipHeight / 2;
          testLeft = triggerRect.right + gap;
          break;
      }

      // Score based on how well it fits in viewport
      if (testTop >= edgeMargin && testTop + estimatedTooltipHeight <= viewport.height - edgeMargin) {
        score += 100; // Fits vertically
      } else {
        score -= Math.abs(Math.min(0, testTop - edgeMargin)) + Math.abs(Math.max(0, testTop + estimatedTooltipHeight - viewport.height + edgeMargin));
      }

      if (testLeft >= edgeMargin && testLeft + estimatedTooltipWidth <= viewport.width - edgeMargin) {
        score += 100; // Fits horizontally
      } else {
        score -= Math.abs(Math.min(0, testLeft - edgeMargin)) + Math.abs(Math.max(0, testLeft + estimatedTooltipWidth - viewport.width + edgeMargin));
      }

      // Prefer the originally requested position
      if (pos === position) {
        score += 10;
      }

      positionScores[pos] = score;
    });

    // Choose the position with the highest score
    finalPosition = Object.keys(positionScores).reduce((a, b) => 
      positionScores[a] > positionScores[b] ? a : b
    ) as typeof position;

    // Calculate final coordinates
    switch (finalPosition) {
      case 'top':
        top = triggerRect.top - estimatedTooltipHeight - gap + window.scrollY;
        left = triggerRect.left + triggerRect.width / 2 - estimatedTooltipWidth / 2 + window.scrollX;
        break;
      case 'bottom':
        top = triggerRect.bottom + gap + window.scrollY;
        left = triggerRect.left + triggerRect.width / 2 - estimatedTooltipWidth / 2 + window.scrollX;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - estimatedTooltipHeight / 2 + window.scrollY;
        left = triggerRect.left - estimatedTooltipWidth - gap + window.scrollX;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - estimatedTooltipHeight / 2 + window.scrollY;
        left = triggerRect.right + gap + window.scrollX;
        break;
    }

    // Smart clamping to viewport bounds with better edge handling
    const maxLeft = viewport.width - estimatedTooltipWidth - edgeMargin;
    const maxTop = viewport.height - estimatedTooltipHeight - edgeMargin + window.scrollY;

    // For horizontal positioning (top/bottom tooltips), allow more flexible left positioning
    if (finalPosition === 'top' || finalPosition === 'bottom') {
      left = Math.max(edgeMargin + window.scrollX, Math.min(left, maxLeft + window.scrollX));
      
      // If we had to adjust left significantly, make sure tooltip doesn't go off-screen
      const leftAdjustment = left - (triggerRect.left + triggerRect.width / 2 - estimatedTooltipWidth / 2 + window.scrollX);
      if (Math.abs(leftAdjustment) > estimatedTooltipWidth / 3) {
        // Tooltip was pushed significantly, ensure it's still near the trigger
        if (left < triggerRect.left + window.scrollX) {
          left = Math.max(edgeMargin + window.scrollX, triggerRect.left + window.scrollX - estimatedTooltipWidth / 4);
        } else if (left + estimatedTooltipWidth > triggerRect.right + window.scrollX) {
          left = Math.min(maxLeft + window.scrollX, triggerRect.right + window.scrollX - estimatedTooltipWidth * 3/4);
        }
      }
    }

    // For vertical positioning (left/right tooltips), allow more flexible top positioning
    if (finalPosition === 'left' || finalPosition === 'right') {
      top = Math.max(edgeMargin + window.scrollY, Math.min(top, maxTop));
      
      // Similar adjustment for top positioning
      const topAdjustment = top - (triggerRect.top + triggerRect.height / 2 - estimatedTooltipHeight / 2 + window.scrollY);
      if (Math.abs(topAdjustment) > estimatedTooltipHeight / 3) {
        if (top < triggerRect.top + window.scrollY) {
          top = Math.max(edgeMargin + window.scrollY, triggerRect.top + window.scrollY - estimatedTooltipHeight / 4);
        } else if (top + estimatedTooltipHeight > triggerRect.bottom + window.scrollY) {
          top = Math.min(maxTop, triggerRect.bottom + window.scrollY - estimatedTooltipHeight * 3/4);
        }
      }
    }

    // Final safety clamp
    left = Math.max(edgeMargin + window.scrollX, Math.min(left, viewport.width - estimatedTooltipWidth - edgeMargin + window.scrollX));
    top = Math.max(edgeMargin + window.scrollY, Math.min(top, viewport.height - estimatedTooltipHeight - edgeMargin + window.scrollY));

    return { position: finalPosition, top, left };
  }, [position, content]);

  // Detect touch device capability
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouchDevice();
    // Re-check on window focus in case device capabilities changed
    window.addEventListener('focus', checkTouchDevice);
    return () => window.removeEventListener('focus', checkTouchDevice);
  }, []);

  // Show tooltip
  const showTooltip = useCallback(() => {
    if (disabled) return;
    
    const { position: newPosition, top, left } = calculatePositionAndCoords();
    setActualPosition(newPosition);
    setTooltipPosition({ top, left });
    setIsVisible(true);
  }, [disabled, calculatePositionAndCoords]);

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  // Desktop hover handlers
  const handleMouseEnter = useCallback(() => {
    if (disabled || isTouchDevice) return;
    
    timeoutRef.current = setTimeout(showTooltip, delay);
  }, [disabled, isTouchDevice, showTooltip, delay]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || isTouchDevice) return;
    hideTooltip();
  }, [disabled, isTouchDevice, hideTooltip]);

  // Mobile touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !isTouchDevice) return;
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    
    // Start long press timer
    longPressTimeoutRef.current = setTimeout(() => {
      showTooltip();
    }, longPressDelay);
  }, [disabled, isTouchDevice, showTooltip, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !isTouchDevice || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // Cancel long press if finger moved too much (more than 10px)
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      touchStartRef.current = null;
    }
  }, [disabled, isTouchDevice]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isTouchDevice) return;
    
    // Cancel long press timer if touch ended before long press completed
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    touchStartRef.current = null;
  }, [disabled, isTouchDevice]);

  // Handle clicks outside tooltip to close it on mobile
  const handleClickOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isVisible || !isTouchDevice) return;
    
    const target = e.target as Node;
    if (
      triggerRef.current &&
      tooltipRef.current &&
      !triggerRef.current.contains(target) &&
      !tooltipRef.current.contains(target)
    ) {
      hideTooltip();
    }
  }, [isVisible, isTouchDevice, hideTooltip]);

  // Recalculate position after tooltip is rendered with actual dimensions
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      const actualWidth = tooltipRect.width;
      const actualHeight = tooltipRect.height;
      const edgeMargin = 16;

      let newTop = tooltipPosition.top;
      let newLeft = tooltipPosition.left;

      // Adjust if tooltip is going off-screen with actual dimensions
      const currentLeft = tooltipPosition.left - window.scrollX;
      const currentTop = tooltipPosition.top - window.scrollY;

      if (currentLeft + actualWidth > viewport.width - edgeMargin) {
        newLeft = viewport.width - actualWidth - edgeMargin + window.scrollX;
      }
      if (currentLeft < edgeMargin) {
        newLeft = edgeMargin + window.scrollX;
      }
      if (currentTop + actualHeight > viewport.height - edgeMargin) {
        newTop = viewport.height - actualHeight - edgeMargin + window.scrollY;
      }
      if (currentTop < edgeMargin) {
        newTop = edgeMargin + window.scrollY;
      }

      // Update position if it changed significantly
      if (Math.abs(newTop - tooltipPosition.top) > 2 || Math.abs(newLeft - tooltipPosition.left) > 2) {
        // Use requestAnimationFrame to avoid synchronous state updates
        requestAnimationFrame(() => {
          setTooltipPosition({ top: newTop, left: newLeft });
        });
      }
    }
  }, [isVisible, tooltipPosition.top, tooltipPosition.left]);

  // Handle window resize, scroll, and outside clicks
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        const { position: newPosition, top, left } = calculatePositionAndCoords();
        setActualPosition(newPosition);
        setTooltipPosition({ top, left });
      }
    };

    const handleScroll = () => {
      if (isVisible) {
        // Hide tooltip on scroll for mobile devices
        if (isTouchDevice) {
          hideTooltip();
        } else {
          // Reposition on desktop
          const { position: newPosition, top, left } = calculatePositionAndCoords();
          setActualPosition(newPosition);
          setTooltipPosition({ top, left });
        }
      }
    };

    const handleClickOutsideWrapper = (e: MouseEvent | TouchEvent) => {
      handleClickOutside(e);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Add click/touch outside listeners for mobile
    if (isTouchDevice) {
      document.addEventListener('touchstart', handleClickOutsideWrapper, { passive: true });
      document.addEventListener('click', handleClickOutsideWrapper);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleClickOutsideWrapper);
      document.removeEventListener('click', handleClickOutsideWrapper);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, [isVisible, isTouchDevice, calculatePositionAndCoords, handleClickOutside, hideTooltip]);

  // Get tooltip container styles for portal rendering
  const getTooltipStyles = () => {
    return {
      position: 'absolute' as const,
      top: tooltipPosition.top,
      left: tooltipPosition.left,
      zIndex: 9999, // Very high z-index to ensure it's on top
    };
  };

  // Arrow position styles relative to tooltip
  const getArrowStyles = () => {
    const baseArrowStyles = 'absolute w-2 h-2 bg-near-black border border-mid-grey/30 rotate-45';
    
    switch (actualPosition) {
      case 'top':
        return `${baseArrowStyles} -bottom-1 left-1/2 transform -translate-x-1/2`;
      case 'bottom':
        return `${baseArrowStyles} -top-1 left-1/2 transform -translate-x-1/2`;
      case 'left':
        return `${baseArrowStyles} -right-1 top-1/2 transform -translate-y-1/2`;
      case 'right':
        return `${baseArrowStyles} -left-1 top-1/2 transform -translate-y-1/2`;
      default:
        return `${baseArrowStyles} -bottom-1 left-1/2 transform -translate-x-1/2`;
    }
  };

  // Animation variants
  const tooltipVariants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: actualPosition === 'top' ? 4 : actualPosition === 'bottom' ? -4 : 0,
      x: actualPosition === 'left' ? 4 : actualPosition === 'right' ? -4 : 0,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: actualPosition === 'top' ? 4 : actualPosition === 'bottom' ? -4 : 0,
      x: actualPosition === 'left' ? 4 : actualPosition === 'right' ? -4 : 0,
      transition: {
        duration: 0.1,
        ease: [0.4, 0, 1, 1] as const,
      },
    },
  };

  // Render tooltip content
  const renderTooltip = () => (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={tooltipRef}
          style={getTooltipStyles()}
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="pointer-events-none"
        >
          {/* Tooltip Content */}
          <div className="relative bg-near-black border-2 border-mid-grey/30 px-3 py-2">
            {/* Tooltip Text */}
            <span className="font-mono text-sm font-medium whitespace-nowrap text-off-white">
              {content}
            </span>
            
            {/* Arrow */}
            <div className={getArrowStyles()}></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={triggerRef}
        className={`relative inline-block ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          // Prevent text selection during long press on mobile
          WebkitUserSelect: isTouchDevice ? 'none' : 'auto',
          userSelect: isTouchDevice ? 'none' : 'auto',
          // Prevent context menu on long press
          WebkitTouchCallout: 'none',
        }}
      >
        {children}
      </div>
      
      {/* Render tooltip in a portal to ensure it's on top */}
      {typeof document !== 'undefined' && createPortal(renderTooltip(), document.body)}
    </>
  );
};

export default Tooltip;
export { Tooltip };