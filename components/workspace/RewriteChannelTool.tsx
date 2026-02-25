/**
 * @file components/workspace/RewriteChannelTool.tsx
 * @description AI-powered channel-specific copy rewriting component
 * 
 * Features:
 * - Six channel options: LinkedIn, Twitter, Instagram, Facebook, Email, Blog Post
 * - Platform-optimized copy rewriting
 * - Real-time loading states
 * - Result preview with insert/copy options
 * - Apple-style design aesthetic
 * - Full integration with Zustand store and TipTap editor
 * 
 * @example
 * ```tsx
 * <RewriteChannelTool editor={editorInstance} />
 * ```
 */

'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/utils/logger';
import { 
  Repeat,
  Linkedin,
  Instagram,
  Facebook,
  Mail,
  FileText,
  Check, 
  X,
  Copy,
  Sparkles
} from 'lucide-react';
import { 
  useSelectedText,
  useSelectedHTML,
  useSelectionRange,
  useRewriteChannelResult,
  useRewriteChannelLoading,
  useRewriteChannelError,
  useRewriteChannelActions,
} from '@/lib/stores/workspaceStore';
import { insertTextAtSelection } from '@/lib/editor-utils';
import { formatGeneratedContent, copyFormattedHtmlToClipboard } from '@/lib/utils/content-formatting';
import { AIWorxButtonLoader } from '@/components/ui/AIWorxLoader';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

/**
 * X (Twitter) social media logo icon component
 */
function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface RewriteChannelToolProps {
  /** TipTap editor instance */
  editor: Editor | null;
  
  /** Optional CSS classes */
  className?: string;
}

/**
 * Channel type definition
 */
export type ChannelType = 'linkedin' | 'twitter' | 'instagram' | 'facebook' | 'email' | 'blog';

/**
 * Channel option configuration with icon and metadata
 */
const CHANNEL_OPTIONS: {
  value: ChannelType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}[] = [
  {
    value: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    description: 'Professional & thought leadership',
    color: 'blue',
  },
  {
    value: 'twitter',
    label: 'X',
    icon: XLogo,
    description: 'Punchy & conversational',
    color: 'sky',
  },
  {
    value: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    description: 'Emotional & story-driven',
    color: 'pink',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    description: 'Community-focused & relatable',
    color: 'indigo',
  },
  {
    value: 'email',
    label: 'Email',
    icon: Mail,
    description: 'Direct & action-oriented',
    color: 'gray',
  },
  {
    value: 'blog',
    label: 'Blog Post',
    icon: FileText,
    description: 'Strategic & SEO-driven',
    color: 'emerald',
  },
];

/**
 * RewriteChannelTool component - AI-powered channel-specific copy rewriting
 */
export function RewriteChannelTool({ editor, className }: RewriteChannelToolProps) {
  // Optimized selectors - only re-render when these specific values change
  const selectedText = useSelectedText();
  const selectedHTML = useSelectedHTML();
  const selectionRange = useSelectionRange();
  const rewriteChannelResult = useRewriteChannelResult();
  const rewriteChannelLoading = useRewriteChannelLoading();
  const rewriteChannelError = useRewriteChannelError();
  const { runRewriteChannel, clearRewriteChannelResult } = useRewriteChannelActions();

  // Local state for selected channel
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);

  // Check if user has text selected
  const hasSelection = selectedText && selectedText.trim().length > 0;
  const canRewrite = hasSelection && selectedChannel && !rewriteChannelLoading;

  /**
   * Handle channel selection
   */
  const handleChannelSelect = (channel: ChannelType): void => {
    setSelectedChannel(channel === selectedChannel ? null : channel);
    // Clear previous results when switching channels
    if (channel !== selectedChannel) {
      clearRewriteChannelResult();
    }
  };

  /**
   * Handle rewrite action
   * Uses HTML content to preserve formatting (bullets, headings, etc.)
   */
  const handleRewrite = async () => {
    if (!selectedChannel) return;
    
    // Prefer HTML for formatting preservation, fallback to plain text
    const contentToRewrite = selectedHTML || selectedText;
    if (!contentToRewrite) return;
    
    logger.log('📝 Rewriting for channel with formatting:', {
      hasHTML: !!selectedHTML,
      textLength: selectedText?.length || 0,
      htmlLength: selectedHTML?.length || 0,
      channel: selectedChannel,
    });
    
    await runRewriteChannel(contentToRewrite, selectedChannel);
  };

  /**
   * Handle replace selection with result
   */
  const handleReplaceSelection = (): void => {
    if (!editor || !rewriteChannelResult || !selectionRange) return;
    
    // Format the HTML result (sanitize and remove excess whitespace)
    const formattedHTML = formatGeneratedContent(rewriteChannelResult, false);
    
    // Use editor utils to replace the selection with formatted HTML
    const success = insertTextAtSelection(editor, formattedHTML, { isHTML: true });
    
    if (success) {
      // Clear the result after replacing
      clearRewriteChannelResult();
      logger.log('✅ Rewritten content inserted with formatting preserved');
    }
  };

  /**
   * Handle copy result to clipboard
   * Uses HTML MIME type so pasting into rich text editors preserves formatting
   */
  const handleCopyResult = async (): Promise<void> => {
    if (!rewriteChannelResult) return;
    
    const success = await copyFormattedHtmlToClipboard(rewriteChannelResult);
    if (!success) {
      logger.error('❌ Failed to copy rewritten result to clipboard');
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-apple-blue" />
          <h2 className="text-lg font-semibold text-apple-text-dark">
            Rewrite for Channel
          </h2>
        </div>
        <p className="text-sm text-apple-text-light">
          Optimize your copy for different platforms
        </p>
      </div>

      {/* Selected Text Preview */}
      {hasSelection ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
            Selected Text ({selectedText?.length || 0} characters)
          </label>
          <div className="bg-apple-gray-bg border border-apple-gray-light rounded-lg p-3 max-h-32 overflow-y-auto custom-scrollbar">
            <p className="text-sm text-apple-text-dark whitespace-pre-wrap">
              {selectedText}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            Highlight text in the editor to rewrite
          </p>
        </div>
      )}

      {/* Channel Selection Buttons */}
      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-apple-text-dark uppercase tracking-wide">
          Select Channel
        </label>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map((channel) => {
            const Icon = channel.icon;
            const isSelected = selectedChannel === channel.value;
            
            return (
              <button
                key={channel.value}
                onClick={() => handleChannelSelect(channel.value)}
                disabled={rewriteChannelLoading}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg',
                  'border transition-all duration-200',
                  'hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isSelected
                    ? 'bg-apple-blue text-white border-apple-blue shadow-sm'
                    : 'bg-white text-apple-text-dark border-apple-gray-light hover:border-apple-gray hover:bg-apple-gray-bg'
                )}
                title={channel.description}
              >
                <Icon className={cn('w-4 h-4', isSelected ? 'text-white' : 'text-apple-blue')} />
                {channel.value !== 'twitter' && (
                  <span className="text-sm font-medium">{channel.label}</span>
                )}
              </button>
            );
          })}
        </div>
        {selectedChannel && (
          <p className="text-xs text-apple-text-light mt-1">
            {CHANNEL_OPTIONS.find(c => c.value === selectedChannel)?.description}
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={handleRewrite}
        disabled={!canRewrite}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'font-medium text-sm text-white',
          'focus:outline-none focus:ring-2 focus:ring-apple-blue focus:ring-offset-2',
          // Animated gradient when loading
          rewriteChannelLoading && 'aiworx-gradient-animated cursor-wait',
          // Brand button with blue→purple active when not loading
          !rewriteChannelLoading && (hasSelection && selectedChannel) && 'bg-[#006EE6] hover:bg-[#0062CC] active:bg-[#7A3991] active:scale-[0.98] shadow-sm hover:shadow transition-all duration-200',
          // Gray background when truly disabled (not loading)
          (!hasSelection || !selectedChannel) && !rewriteChannelLoading && 'bg-apple-gray-light text-apple-text-light cursor-not-allowed'
        )}
      >
        {rewriteChannelLoading ? (
          <AIWorxButtonLoader />
        ) : selectedChannel ? (
          `Rewrite for ${CHANNEL_OPTIONS.find(c => c.value === selectedChannel)?.label}`
        ) : (
          'Select a Channel'
        )}
      </button>

      {/* Helper Text */}
      {!hasSelection && (
        <p className="text-xs text-apple-text-light text-center">
          Select text in the editor to rewrite for different platforms
        </p>
      )}

      {/* Error Display */}
      {rewriteChannelError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-xs text-red-700 mt-1">{rewriteChannelError}</p>
          </div>
          <button
            onClick={clearRewriteChannelResult}
            className="text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Result Display */}
      {rewriteChannelResult && (
        <div className="flex flex-col gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          {/* Success Header */}
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Rewrite Complete for {CHANNEL_OPTIONS.find(c => c.value === selectedChannel)?.label}
            </span>
          </div>

          {/* Result Preview */}
          <div className="bg-white border border-green-200 rounded p-3 max-h-48 overflow-y-auto custom-scrollbar">
            <div 
              className="text-sm text-apple-text-dark prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rewriteChannelResult }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleReplaceSelection}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg',
                'bg-green-600 text-white text-sm font-medium',
                'hover:bg-green-700 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              disabled={!selectionRange}
              title="Replace selected text with rewritten version"
            >
              <Check className="w-4 h-4" />
              Replace Selection
            </button>
            <button
              onClick={handleCopyResult}
              className={cn(
                'py-2 px-3 rounded-lg',
                'bg-white border border-green-300 text-green-700 text-sm font-medium',
                'hover:bg-green-50 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={clearRewriteChannelResult}
              className={cn(
                'py-2 px-3 rounded-lg',
                'bg-white border border-green-300 text-green-700 text-sm font-medium',
                'hover:bg-green-50 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2',
                'flex items-center justify-center gap-2'
              )}
              title="Clear result"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
