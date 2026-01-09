/**
 * @file components/workspace/TemplateFormField.tsx
 * @description Reusable form field component for template forms
 * 
 * Renders different field types (text, textarea, select, number) based on
 * the field definition. Handles validation, character counts, and errors.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AutoExpandTextarea } from '@/components/ui/AutoExpandTextarea';
import type { TemplateField } from '@/lib/types/template';

interface TemplateFormFieldProps {
  /** Field definition from template */
  field: TemplateField;
  
  /** Current field value */
  value: string;
  
  /** Change handler */
  onChange: (value: string) => void;
  
  /** Error message if validation failed */
  error?: string;
  
  /** Whether field is disabled */
  disabled?: boolean;
}

/**
 * TemplateFormField Component
 * Renders a single form field based on its type
 * 
 * Performance: Memoized to prevent re-renders when props haven't changed
 */
export const TemplateFormField = React.memo(function TemplateFormField({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: TemplateFormFieldProps) {
  const { id, label, type, placeholder, helperText, required, maxLength, options } = field;
  
  // Calculate remaining characters
  const remainingChars = maxLength ? maxLength - value.length : null;
  const isNearLimit = remainingChars !== null && remainingChars < 50;
  const isOverLimit = remainingChars !== null && remainingChars < 0;
  
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
