/**
 * @file components/ProductTour.tsx
 * @description Interactive product tour for CopyWorx using React Joyride
 * 
 * Features:
 * - Guides new users through key features
 * - Shows on first visit only (localStorage flag)
 * - Can be skipped at any time
 * - Can be restarted from help menu
 * - Uses CopyWorx branding (#006EE6 blue, #7A3991 purple)
 * - Takes 60-90 seconds to complete
 */

'use client';

import { useState, useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { logger } from '@/lib/utils/logger';

/**
 * Props for ProductTour component
 */
interface ProductTourProps {
  /** Whether the tour should be running */
  run: boolean;
  /** Callback when tour is completed or skipped */
  onComplete: () => void;
}

/**
 * Tour steps configuration
 * Each step highlights a key feature of CopyWorx
 */
const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-2xl font-bold text-[#006EE6] mb-3">Welcome to CopyWorx™ Studio!</h2>
        <p className="text-base mb-3">Let&apos;s take a quick 60-second tour to show you the key features.</p>
        <p className="text-sm text-gray-600">You can skip this tour anytime by clicking &quot;Skip&quot; or pressing ESC.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="projects"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">My Projects</h3>
        <p className="text-base">Organize your work by project, client or campaign. Keep everything structured and easy to find.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="brand-voice"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">Brand Voice &amp; Personas</h3>
        <p className="text-base mb-2">This is your strategic foundation. Set up your Brand Voice first, then a Persona or two — they ensure every piece of copy maintains consistency.</p>
        <p className="text-sm text-gray-600 italic">Pro tip: Spend 10 minutes here before writing anything!</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="templates"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">AI@Worx™ Templates</h3>
        <p className="text-base">Professional copywriting templates across 6 categories. Generate strategic copy in minutes, not hours.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="copy-optimizer"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">Copy Optimizer Suite</h3>
        <p className="text-base mb-2">Transform your copy with:</p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Tone Shifter (6 professional tones)</li>
          <li>Expand or Shorten</li>
          <li>Rewrite for Channel (email, social, ads)</li>
        </ul>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="insights"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">My Insights</h3>
        <p className="text-base mb-2">Write smarter with AI-powered insights:</p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Alignment scores</li>
          <li>Copy strengths</li>
          <li>Areas to improve</li>
          <li>Recommendations</li>
        </ul>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="snippets"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">Snippets</h3>
        <p className="text-base mb-2">Save and reuse copy easily:</p>
        <ul className="text-sm list-disc list-inside space-y-1">
          <li>Taglines</li>
          <li>CTAs</li>
          <li>Copyright info</li>
          <li>Boilerplate</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="editor"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">Your Writing Canvas</h3>
        <p className="text-base">Clean, distraction-free editor with professional formatting tools. This is where the magic happens.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="toolbox"]',
    content: (
      <div>
        <h3 className="text-xl font-bold text-[#006EE6] mb-2">AI@Worx™ Toolbox</h3>
        <p className="text-base">Your AI assistant panel. It dynamically changes based on which tool you select.</p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 className="text-2xl font-bold text-[#7A3991] mb-3">You&apos;re Ready to Write to Win!</h2>
        <p className="text-base mb-3">Start by setting up your Brand Voice and Personas, or jump straight into a template.</p>
        <p className="text-base font-semibold text-[#006EE6]">Now get to worx with CopyWorx™ Studio!</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

/**
 * Custom styles for the tour tooltip
 * Uses CopyWorx branding colors
 */
const tourStyles = {
  options: {
    primaryColor: '#006EE6',
    zIndex: 10000,
    arrowColor: '#fff',
    backgroundColor: '#fff',
    textColor: '#333',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
  },
  buttonNext: {
    backgroundColor: '#006EE6',
    borderRadius: '6px',
    fontSize: '14px',
    padding: '10px 20px',
  },
  buttonBack: {
    color: '#666',
    marginRight: '10px',
  },
  buttonSkip: {
    color: '#999',
    fontSize: '13px',
  },
  buttonClose: {
    color: '#999',
    padding: '8px',
  },
  tooltip: {
    borderRadius: '12px',
    padding: '20px',
    fontSize: '16px',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
  },
  spotlight: {
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '3px solid #006EE6',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  beacon: {
    display: 'none',
  },
};

/**
 * Locale strings for tour buttons
 */
const tourLocale = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  skip: 'Skip Tour',
};

/**
 * ProductTour component
 * Renders the Joyride tour with CopyWorx branding and content
 */
export default function ProductTour({ run, onComplete }: ProductTourProps) {
  const [stepIndex, setStepIndex] = useState(0);

  /**
   * Handle Joyride callback events
   * Manages step navigation and completion
   */
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    // Log for debugging
    logger.log('Tour callback:', { status, action, index, type });

    // Handle tour completion or skip
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
      setStepIndex(0);
      return;
    }

    // Handle step navigation
    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    // Handle close button click
    if (action === ACTIONS.CLOSE) {
      onComplete();
      setStepIndex(0);
    }
  }, [onComplete]);

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      continuous
      showProgress
      showSkipButton
      stepIndex={stepIndex}
      callback={handleJoyrideCallback}
      styles={tourStyles}
      locale={tourLocale}
      scrollToFirstStep
      disableOverlayClose
      spotlightClicks
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: {
            transition: 'all 0.3s ease',
          },
        },
      }}
    />
  );
}
