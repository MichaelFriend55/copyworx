/**
 * @file components/workspace/TemplateFormField.tsx
 * @description Reusable form field component for template forms
 * 
 * Renders different field types (text, textarea, select, number) based on
 * the field definition. Handles validation, character counts, errors,
 * and "Other (specify)" custom input for select fields.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import type { TemplateField } from '@/lib/types/template';

/** Special value for "Other" option in select fields */
export const OTHER_OPTION_VALUE = 'Other (specify)';

/** Maximum character length for custom "Other" input */
const OTHER_INPUT_MAX_LENGTH = 100;

interface TemplateFormFieldProps {
  /** Field definition from template */
  field: TemplateField;
  
  /** Current field value */
  value: string;
  
  /** Change handler */
  onChange: (value: string) => void;
  
  /** Custom "Other" value when "Other (specify)" is selected */
  otherValue?: string;
  
  /** Change handler for custom "Other" value */
  onOtherChange?: (value: string) => void;
  
  /** Error message if validation failed */
  error?: string;
  
  /** Error message for custom "Other" input */
  otherError?: string;
  
  /** Whether field is disabled */
  disabled?: boolean;
}

/**
 * Get placeholder text for "Other" custom input based on field label
 */
function getOtherPlaceholder(label: string): string {
  const labelLower = label.toLowerCase();
  
  if (labelLower.includes('tone')) {
    return 'e.g., Authoritative yet approachable';
  }
  if (labelLower.includes('benefit')) {
    return 'e.g., Build Community';
  }
  if (labelLower.includes('call-to-action') || labelLower.includes('cta')) {
    return 'e.g., Join the Waitlist';
  }
  if (labelLower.includes('platform')) {
    return 'e.g., Threads, Mastodon';
  }
  if (labelLower.includes('trigger')) {
    return 'e.g., Nostalgia, Belonging';
  }
  if (labelLower.includes('hook')) {
    return 'e.g., Metaphor, Challenge';
  }
  if (labelLower.includes('post type')) {
    return 'e.g., Carousel, Thread';
  }
  if (labelLower.includes('headline')) {
    return 'e.g., Testimonial-Based';
  }
  if (labelLower.includes('publication')) {
    return 'e.g., Industry Newsletter';
  }
  if (labelLower.includes('campaign')) {
    return 'e.g., Post-webinar nurture sequence';
  }
  if (labelLower.includes('email goal')) {
    return 'e.g., Re-engage dormant subscribers';
  }
  if (labelLower.includes('goal')) {
    return 'e.g., Event Promotion';
  }
  if (labelLower.includes('urgency')) {
    return 'e.g., End of quarter deadline';
  }
  
  return 'Specify your custom option';
}

/**
 * TemplateFormField Component
 * Renders a single form field based on its type
 * 
 * Supports "Other (specify)" option in select fields, showing a
 * custom text input when selected.
 * 
 * Performance: Memoized to prevent re-renders when props haven't changed
 */
export const TemplateFormField = React.memo(function TemplateFormField({
  field,
  value,
  onChange,
  otherValue = '',
  onOtherChange,
  error,
  otherError,
  disabled = false,
}: TemplateFormFieldProps) {
  const { id, label, type, placeholder, helperText, required, maxLength, options } = field;
  
  // Calculate remaining characters for main field
  const remainingChars = maxLength ? maxLength - value.length : null;
  const isNearLimit = remainingChars !== null && remainingChars < 50;
  const isOverLimit = remainingChars !== null && remainingChars < 0;
  
  // Check if "Other" is selected (for select fields)
  const isOtherSelected = type === 'select' && value === OTHER_OPTION_VALUE;
  
  // Check if this field has "Other" option
  const hasOtherOption = type === 'select' && options?.includes(OTHER_OPTION_VALUE);
  
  // Calculate remaining characters for "Other" input
  const otherRemainingChars = OTHER_INPUT_MAX_LENGTH - otherValue.length;
  const isOtherNearLimit = otherRemainingChars < 20;
  const isOtherOverLimit = otherRemainingChars < 0;
  
  /**
   * Render input based on field type
   */
  const renderInput = () => {
    const baseInputClasses = cn(
      'w-full px-3 py-2 rounded-lg',
      'border transition-all duration-200',
      'text-sm text-apple-text-dark',
      'placeholder:text-apple-text-light',
      'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
      'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
      error
        ? 'border-red-300 bg-red-50'
        : 'border-apple-gray-light bg-white hover:border-apple-gray'
    );
    
    switch (type) {
      case 'textarea':
        return (
          <AutoExpandTextarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            minHeight={100}
            maxHeight={400}
            className={baseInputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          />
        );
      
      case 'select':
        return (
          <>
            <select
              id={id}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={baseInputClasses}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            >
              <option value="">Select an option...</option>
              {options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            
            {/* Custom "Other" input - shown when "Other (specify)" is selected */}
            {isOtherSelected && hasOtherOption && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-baseline justify-between mb-1.5">
                  <label
                    htmlFor={`${id}-other`}
                    className="text-xs font-medium text-apple-text-dark"
                  >
                    Specify your custom option
                    {required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <span
                    className={cn(
                      'text-xs tabular-nums transition-colors',
                      isOtherOverLimit
                        ? 'text-red-600 font-medium'
                        : isOtherNearLimit
                        ? 'text-orange-600'
                        : 'text-apple-text-light'
                    )}
                  >
                    {otherValue.length}/{OTHER_INPUT_MAX_LENGTH}
                  </span>
                </div>
                <input
                  id={`${id}-other`}
                  type="text"
                  value={otherValue}
                  onChange={(e) => onOtherChange?.(e.target.value)}
                  placeholder={getOtherPlaceholder(label)}
                  disabled={disabled}
                  maxLength={OTHER_INPUT_MAX_LENGTH}
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'border transition-all duration-200',
                    'text-sm text-apple-text-dark',
                    'placeholder:text-apple-text-light',
                    'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                    'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
                    otherError
                      ? 'border-red-300 bg-red-50'
                      : 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                  )}
                  aria-invalid={!!otherError}
                  aria-describedby={otherError ? `${id}-other-error` : undefined}
                />
                {otherError && (
                  <p
                    id={`${id}-other-error`}
                    className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
                    role="alert"
                  >
                    <span className="font-medium">Error:</span>
                    {otherError}
                  </p>
                )}
              </div>
            )}
          </>
        );
      
      case 'number':
        return (
          <input
            id={id}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={baseInputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          />
        );
      
      case 'text':
      default:
        return (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={baseInputClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          />
        );
    }
  };
  
  return (
    <div className="flex flex-col gap-2">
      {/* Label */}
      <label
        htmlFor={id}
        className="flex items-baseline justify-between text-sm font-medium text-apple-text-dark"
      >
        <span>
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </span>
        
        {/* Character count */}
        {maxLength && type !== 'select' && (
          <span
            className={cn(
              'text-xs font-normal tabular-nums transition-colors',
              isOverLimit
                ? 'text-red-600 font-medium'
                : isNearLimit
                ? 'text-orange-600'
                : 'text-apple-text-light'
            )}
            aria-live="polite"
          >
            {value.length}/{maxLength}
          </span>
        )}
      </label>
      
      {/* Input */}
      {renderInput()}
      
      {/* Helper text */}
      {helperText && !error && (
        <p
          id={`${id}-helper`}
          className="text-xs text-apple-text-light"
        >
          {helperText}
        </p>
      )}
      
      {/* Error message */}
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs text-red-600 flex items-center gap-1"
          role="alert"
        >
          <span className="font-medium">Error:</span>
          {error}
        </p>
      )}
      
      {/* Character limit warning */}
      {isOverLimit && (
        <p className="text-xs text-red-600" role="alert">
          Character limit exceeded by {Math.abs(remainingChars!)} characters
        </p>
      )}
    </div>
  );
});
