/**
 * @file components/migration/MigrationBanner.tsx
 * @description Banner component prompting users to migrate localStorage data to Supabase cloud
 * 
 * Shows when:
 * - Supabase is configured
 * - User has localStorage data
 * - Migration hasn't been completed
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Cloud, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  isCloudAvailable, 
  hasLocalDataToMigrate, 
  migrateLocalToCloud,
  isMigrationComplete 
} from '@/lib/storage/unified-storage';

type MigrationState = 'idle' | 'migrating' | 'success' | 'error';

interface MigrationBannerProps {
  /** Callback when migration completes */
  onMigrationComplete?: () => void;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

export function MigrationBanner({ onMigrationComplete, onDismiss }: MigrationBannerProps) {
  const [show, setShow] = useState(false);
  const [state, setState] = useState<MigrationState>('idle');
  const [result, setResult] = useState<{ migrated: number; errors: string[] } | null>(null);

  // Check if we should show the banner
  useEffect(() => {
    const checkMigration = () => {
      const shouldShow = 
        isCloudAvailable() && 
        hasLocalDataToMigrate() && 
        !isMigrationComplete();
      
      setShow(shouldShow);
    };

    // Delay check to allow other components to load
    const timer = setTimeout(checkMigration, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle migration
  const handleMigrate = async () => {
    setState('migrating');
    
    try {
      const migrationResult = await migrateLocalToCloud();
      setResult({
        migrated: migrationResult.migrated,
        errors: migrationResult.errors,
      });

      if (migrationResult.success) {
        setState('success');
        // Auto-dismiss after success
        setTimeout(() => {
          setShow(false);
          onMigrationComplete?.();
        }, 3000);
      } else if (migrationResult.migrated > 0) {
        // Partial success
        setState('success');
        setTimeout(() => {
          setShow(false);
          onMigrationComplete?.();
        }, 5000);
      } else {
        setState('error');
      }
    } catch (error) {
      setState('error');
      setResult({
        migrated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  };

  // Handle dismiss
  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  // Don't render if not showing
  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {state === 'idle' && <Cloud className="w-5 h-5" />}
            {state === 'migrating' && <Loader2 className="w-5 h-5 animate-spin" />}
            {state === 'success' && <CheckCircle className="w-5 h-5 text-green-300" />}
            {state === 'error' && <AlertCircle className="w-5 h-5 text-red-300" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {state === 'idle' && (
              <>
                <p className="font-medium text-sm">
                  Enable Cloud Sync
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  Migrate your data to the cloud to access it from any device.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleMigrate}
                    className="px-3 py-1.5 bg-white text-blue-600 rounded-md text-xs font-medium 
                             hover:bg-blue-50 transition-colors"
                  >
                    Migrate Now
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-3 py-1.5 bg-blue-500/30 text-white rounded-md text-xs font-medium 
                             hover:bg-blue-500/50 transition-colors"
                  >
                    Later
                  </button>
                </div>
              </>
            )}

            {state === 'migrating' && (
              <>
                <p className="font-medium text-sm">
                  Migrating your data...
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  Please wait while we sync your projects to the cloud.
                </p>
              </>
            )}

            {state === 'success' && (
              <>
                <p className="font-medium text-sm">
                  Migration Complete!
                </p>
                <p className="text-xs text-blue-100 mt-1">
                  {result?.migrated || 0} project(s) synced to the cloud.
                  {result?.errors && result.errors.length > 0 && (
                    <span className="text-yellow-200">
                      {' '}({result.errors.length} warning(s))
                    </span>
                  )}
                </p>
              </>
            )}

            {state === 'error' && (
              <>
                <p className="font-medium text-sm">
                  Migration Failed
                </p>
                <p className="text-xs text-red-200 mt-1">
                  {result?.errors?.[0] || 'An error occurred during migration.'}
                </p>
                <button
                  onClick={handleMigrate}
                  className="mt-2 px-3 py-1.5 bg-white text-red-600 rounded-md text-xs font-medium 
                           hover:bg-red-50 transition-colors"
                >
                  Retry
                </button>
              </>
            )}
          </div>

          {/* Dismiss button */}
          {state !== 'migrating' && (
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default MigrationBanner;
