/**
 * Delta Design Tokens
 * 
 * These tokens align with the design system defined in 1st-pass-plan.md
 * Use these constants when you need direct access to design values.
 */

export const colors = {
  // Base Palette (dominant - ~90% of UI)
  nearBlack: '#0B0D10',
  offWhite: '#F5F6F7',
  slateGrey: '#5E646B',
  midGrey: '#A3A7AD',
  
  // Accent Colour (signal colour only)
  // Used for: Active pools, Primary CTAs, Current APR/reward indicators, Network active states
  // Never used for: Backgrounds, large surfaces, decorative elements, disabled states, charts
  amber: '#D6A84F',
} as const

export const typography = {
  fontFamily: {
    mono: ['Space Mono', 'monospace'],
  },
  fontWeight: {
    normal: '400',
    medium: '700',
  },
} as const

export const spacing = {
  // Use Tailwind's default spacing scale
  // Prefer spacing over borders for separation
} as const

