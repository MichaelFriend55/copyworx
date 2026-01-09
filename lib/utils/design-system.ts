/**
 * @file lib/utils/design-system.ts
 * @description CopyWorx Design System - Consistent styling utilities
 * 
 * Provides consistent styling patterns for:
 * - Buttons
 * - Form inputs
 * - Info boxes
 * - Interactive states
 * - Spacing
 * - Typography
 * 
 * Usage:
 * ```tsx
 * import { button, input, infoBox } from '@/lib/utils/design-system';
 * 
 * <button className={button.primary}>Click me</button>
 * <input className={input.base} />
 * ```
 */

import { cn } from '@/lib/utils';

/**
 * Button styles - Consistent button styling across the app
 */
export const button = {
  /**
   * Primary action button (Apple Blue)
   * Use for main CTAs and important actions
   */
  primary: cn(
    'inline-flex items-center justify-center gap-2',
    'px-4 py-2 text-sm font-medium',
    'text-white bg-apple-blue rounded-lg',
    'hover:bg-blue-600 active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-apple-blue',
    'transition-all duration-200'
  ),
  
  /**
   * Secondary action button (Gray)
   * Use for less important actions
   */
  secondary: cn(
    'inline-flex items-center justify-center gap-2',
    'px-4 py-2 text-sm font-medium',
    'text-apple-text-dark bg-white border border-gray-300 rounded-lg',
    'hover:bg-gray-50 hover:border-gray-400 active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-all duration-200'
  ),
  
  /**
   * Destructive action button (Red)
   * Use for delete/remove actions
   */
  destructive: cn(
    'inline-flex items-center justify-center gap-2',
    'px-4 py-2 text-sm font-medium',
    'text-white bg-red-600 rounded-lg',
    'hover:bg-red-700 active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-all duration-200'
  ),
  
  /**
   * Ghost button (Transparent)
   * Use for subtle actions
   */
  ghost: cn(
    'inline-flex items-center justify-center gap-2',
    'px-3 py-2 text-sm font-medium',
    'text-apple-text-dark bg-transparent rounded-lg',
    'hover:bg-gray-100 active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-all duration-200'
  ),
  
  /**
   * Icon button (Square)
   * Use for icon-only buttons
   */
  icon: cn(
    'inline-flex items-center justify-center',
    'p-2 text-apple-text-dark bg-white border border-gray-200 rounded-lg',
    'hover:bg-gray-50 hover:border-gray-300 active:scale-[0.95]',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-all duration-200'
  ),
  
  /**
   * Branded action button (Purple - for Personas)
   * Use for persona-related actions
   */
  persona: cn(
    'inline-flex items-center justify-center gap-2',
    'px-4 py-2 text-sm font-medium',
    'text-white bg-purple-600 rounded-lg',
    'hover:bg-purple-700 active:scale-[0.98]',
    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'transition-all duration-200'
  ),
};

/**
 * Form input styles - Consistent input styling
 */
export const input = {
  /**
   * Base input style
   * Use for all text inputs
   */
  base: cn(
    'w-full px-3 py-2 text-sm',
    'text-apple-text-dark bg-white',
    'border border-gray-300 rounded-lg',
    'placeholder:text-apple-text-light',
    'hover:border-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200'
  ),
  
  /**
   * Textarea style
   * Use for multi-line text inputs
   */
  textarea: cn(
    'w-full px-3 py-2 text-sm',
    'text-apple-text-dark bg-white',
    'border border-gray-300 rounded-lg',
    'placeholder:text-apple-text-light',
    'hover:border-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
    'resize-none transition-all duration-200'
  ),
  
  /**
   * Select input style
   * Use for dropdown selects
   */
  select: cn(
    'w-full px-3 py-2 text-sm',
    'text-apple-text-dark bg-white',
    'border border-gray-300 rounded-lg',
    'hover:border-gray-400',
    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
    'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
    'transition-all duration-200'
  ),
  
  /**
   * Input with error state
   */
  error: cn(
    'w-full px-3 py-2 text-sm',
    'text-apple-text-dark bg-red-50',
    'border border-red-300 rounded-lg',
    'placeholder:text-red-400',
    'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
    'transition-all duration-200'
  ),
};

/**
 * Info box styles - Consistent info/alert boxes
 */
export const infoBox = {
  /**
   * Info box (Blue)
   * Use for general information
   */
  info: cn(
    'flex items-start gap-2 p-3',
    'bg-blue-50 border border-blue-200 rounded-lg',
    'text-sm text-blue-900'
  ),
  
  /**
   * Success box (Green)
   * Use for success messages
   */
  success: cn(
    'flex items-start gap-2 p-3',
    'bg-green-50 border border-green-200 rounded-lg',
    'text-sm text-green-900'
  ),
  
  /**
   * Warning box (Yellow)
   * Use for warnings
   */
  warning: cn(
    'flex items-start gap-2 p-3',
    'bg-yellow-50 border border-yellow-200 rounded-lg',
    'text-sm text-yellow-900'
  ),
  
  /**
   * Error box (Red)
   * Use for error messages
   */
  error: cn(
    'flex items-start gap-2 p-3',
    'bg-red-50 border border-red-200 rounded-lg',
    'text-sm text-red-900'
  ),
  
  /**
   * Persona box (Purple)
   * Use for persona-related info
   */
  persona: cn(
    'flex items-start gap-2 p-3',
    'bg-purple-50 border border-purple-200 rounded-lg',
    'text-sm text-purple-900'
  ),
};

/**
 * Badge styles - Consistent badge/tag styling
 */
export const badge = {
  /**
   * Default badge
   */
  default: cn(
    'inline-flex items-center px-2 py-0.5',
    'text-xs font-medium rounded',
    'bg-gray-100 text-gray-800 border border-gray-200'
  ),
  
  /**
   * Blue badge
   */
  blue: cn(
    'inline-flex items-center px-2 py-0.5',
    'text-xs font-medium rounded',
    'bg-blue-100 text-blue-800 border border-blue-200'
  ),
  
  /**
   * Purple badge
   */
  purple: cn(
    'inline-flex items-center px-2 py-0.5',
    'text-xs font-medium rounded',
    'bg-purple-100 text-purple-800 border border-purple-200'
  ),
  
  /**
   * Green badge
   */
  green: cn(
    'inline-flex items-center px-2 py-0.5',
    'text-xs font-medium rounded',
    'bg-green-100 text-green-800 border border-green-200'
  ),
};

/**
 * Card styles - Consistent card container styling
 */
export const card = {
  /**
   * Base card style
   */
  base: cn(
    'bg-white border border-gray-200 rounded-lg',
    'shadow-sm hover:shadow-md',
    'transition-shadow duration-200'
  ),
  
  /**
   * Interactive card (clickable)
   */
  interactive: cn(
    'bg-white border border-gray-200 rounded-lg',
    'shadow-sm hover:shadow-md hover:border-gray-300',
    'cursor-pointer active:scale-[0.99]',
    'transition-all duration-200'
  ),
  
  /**
   * Selected card
   */
  selected: cn(
    'bg-blue-50 border-2 border-apple-blue rounded-lg',
    'shadow-md',
    'transition-all duration-200'
  ),
};

/**
 * Typography styles - Consistent text styling
 */
export const text = {
  /**
   * Page heading (h1)
   */
  h1: 'text-3xl font-bold text-apple-text-dark tracking-tight',
  
  /**
   * Section heading (h2)
   */
  h2: 'text-2xl font-semibold text-apple-text-dark tracking-tight',
  
  /**
   * Subsection heading (h3)
   */
  h3: 'text-xl font-semibold text-apple-text-dark',
  
  /**
   * Small heading (h4)
   */
  h4: 'text-lg font-semibold text-apple-text-dark',
  
  /**
   * Body text
   */
  body: 'text-sm text-apple-text-dark',
  
  /**
   * Secondary text
   */
  secondary: 'text-sm text-apple-text-light',
  
  /**
   * Small text
   */
  small: 'text-xs text-apple-text-light',
  
  /**
   * Label text
   */
  label: 'text-sm font-medium text-apple-text-dark',
  
  /**
   * Error text
   */
  error: 'text-sm text-red-600',
  
  /**
   * Success text
   */
  success: 'text-sm text-green-600',
};

/**
 * Spacing utilities - Consistent spacing
 */
export const spacing = {
  /**
   * Section spacing (vertical)
   */
  section: 'space-y-6',
  
  /**
   * Form group spacing (vertical)
   */
  formGroup: 'space-y-2',
  
  /**
   * Inline spacing (horizontal)
   */
  inline: 'space-x-2',
  
  /**
   * Grid gap
   */
  grid: 'gap-4',
  
  /**
   * Flex gap
   */
  flex: 'gap-2',
};

/**
 * Animation utilities - Consistent animations
 */
export const animation = {
  /**
   * Fade in animation
   */
  fadeIn: 'animate-in fade-in duration-200',
  
  /**
   * Slide in from top
   */
  slideInTop: 'animate-in slide-in-from-top-2 duration-300',
  
  /**
   * Slide in from bottom
   */
  slideInBottom: 'animate-in slide-in-from-bottom-2 duration-300',
  
  /**
   * Scale in
   */
  scaleIn: 'animate-in zoom-in-95 duration-200',
  
  /**
   * Spin (loading)
   */
  spin: 'animate-spin',
};

/**
 * Focus ring utility - Consistent focus styling
 */
export const focusRing = cn(
  'focus:outline-none',
  'focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
  'focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2'
);

/**
 * Interactive element base - Common interactive styling
 */
export const interactive = cn(
  'cursor-pointer',
  'transition-all duration-200',
  'active:scale-[0.98]',
  focusRing
);

/**
 * Disabled state utility
 */
export const disabled = cn(
  'disabled:opacity-50',
  'disabled:cursor-not-allowed',
  'disabled:pointer-events-none'
);

/**
 * Loading state utility
 */
export const loading = cn(
  'relative',
  'pointer-events-none',
  'opacity-70'
);

/**
 * Responsive utilities
 */
export const responsive = {
  /**
   * Hide on mobile
   */
  hideMobile: 'hidden md:block',
  
  /**
   * Hide on desktop
   */
  hideDesktop: 'block md:hidden',
  
  /**
   * Stack on mobile, row on desktop
   */
  stackMobile: 'flex-col md:flex-row',
  
  /**
   * Full width on mobile, auto on desktop
   */
  fullMobile: 'w-full md:w-auto',
};
