/**
 * @file app/admin/usage/page.tsx
 * @description Admin dashboard for viewing all users' API usage
 * 
 * Features:
 * - Protected by admin email check
 * - Displays all users' usage in a sortable table
 * - Summary statistics at top
 * - Search/filter functionality
 * - Export to CSV
 * - Mobile responsive
 * 
 * @route /admin/usage
 * @access Admin only (michaelfriend55@gmail.com)
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  RefreshCw, 
  Download, 
  Search, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  TrendingUp,
  Shield,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** Admin email addresses */
const ADMIN_EMAILS = ['michaelfriend55@gmail.com'];

/** Beta usage limit */
const BETA_LIMIT = 5.00;

// ============================================================================
// Types
// ============================================================================

interface UserUsageRecord {
  userId: string;
  totalApiCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  lastApiCall: string | null;
  percentOfLimit: number;
  isOverLimit: boolean;
}

interface UsageSummary {
  totalUsers: number;
  totalCost: number;
  averageCostPerUser: number;
  usersOverLimit: number;
}

interface AdminUsageData {
  users: UserUsageRecord[];
  summary: UsageSummary;
  fetchedAt: string;
}

type SortField = 'userId' | 'totalApiCalls' | 'totalTokens' | 'totalCost' | 'lastApiCall' | 'percentOfLimit';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Access Denied component for non-admin users
 */
function AccessDenied() {
  return (
    <div className="min-h-screen bg-ink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-ink-900 mb-2">Access Denied</h1>
        <p className="text-ink-600 mb-4">
          You don&apos;t have permission to view this page. This area is restricted to administrators only.
        </p>
        <a 
          href="/copyworx" 
          className="inline-flex items-center px-4 py-2 bg-ink-900 text-white rounded-lg hover:bg-ink-800 transition-colors"
        >
          Return to CopyWorx
        </a>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the table
 */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="h-4 w-20 bg-ink-200 rounded mb-2" />
            <div className="h-8 w-24 bg-ink-200 rounded" />
          </div>
        ))}
      </div>
      
      {/* Table skeleton */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-12 bg-ink-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-t border-ink-100 flex items-center px-6 gap-4">
            <div className="h-4 w-24 bg-ink-200 rounded" />
            <div className="h-4 w-16 bg-ink-200 rounded" />
            <div className="h-4 w-20 bg-ink-200 rounded" />
            <div className="h-4 w-16 bg-ink-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Summary card component
 */
function SummaryCard({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  subtitle,
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'amber' | 'red';
  subtitle?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-ink-100">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-ink-500 uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ isOverLimit }: { isOverLimit: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
      isOverLimit 
        ? 'bg-red-100 text-red-800' 
        : 'bg-emerald-100 text-emerald-800'
    )}>
      {isOverLimit ? 'Limited' : 'Active'}
    </span>
  );
}

/**
 * Sortable column header
 */
function SortHeader({ 
  label, 
  field, 
  currentSort, 
  currentDirection, 
  onSort,
}: { 
  label: string; 
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentSort === field;
  
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-left font-semibold text-xs uppercase tracking-wide transition-colors',
        isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700'
      )}
    >
      {label}
      <span className="flex flex-col">
        <ChevronUp className={cn(
          'w-3 h-3 -mb-1',
          isActive && currentDirection === 'asc' ? 'text-ink-900' : 'text-ink-300'
        )} />
        <ChevronDown className={cn(
          'w-3 h-3 -mt-1',
          isActive && currentDirection === 'desc' ? 'text-ink-900' : 'text-ink-300'
        )} />
      </span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Admin Usage Dashboard Page
 */
export default function AdminUsagePage() {
  // Auth state
  const { user, isLoaded: isUserLoaded } = useUser();
  
  // Data state
  const [data, setData] = useState<AdminUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ============================================================================
  // Auth Check
  // ============================================================================
  
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const email = user.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    return email ? ADMIN_EMAILS.includes(email) : false;
  }, [user]);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  const fetchUsageData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/usage');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch data');
      }
      
      const result: AdminUsageData = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount (if admin)
  useEffect(() => {
    if (isUserLoaded && isAdmin) {
      fetchUsageData();
    } else if (isUserLoaded && !isAdmin) {
      setIsLoading(false);
    }
  }, [isUserLoaded, isAdmin, fetchUsageData]);

  // ============================================================================
  // Sorting & Filtering
  // ============================================================================
  
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }, [sortField]);

  const filteredAndSortedUsers = useMemo(() => {
    if (!data?.users) return [];
    
    let result = [...data.users];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.userId.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle null dates
      if (sortField === 'lastApiCall') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [data?.users, searchQuery, sortField, sortDirection]);

  // ============================================================================
  // Export to CSV
  // ============================================================================
  
  const exportToCsv = useCallback(() => {
    if (!data?.users) return;
    
    const headers = [
      'User ID',
      'Total API Calls',
      'Total Tokens',
      'Total Cost (USD)',
      '% of Limit',
      'Last Used',
      'Status',
    ];
    
    const rows = data.users.map(user => [
      user.userId,
      user.totalApiCalls.toString(),
      user.totalTokens.toString(),
      user.totalCost.toFixed(4),
      user.percentOfLimit.toFixed(1),
      user.lastApiCall ? new Date(user.lastApiCall).toISOString() : 'Never',
      user.isOverLimit ? 'Limited' : 'Active',
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `copyworx-usage-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data?.users]);

  // ============================================================================
  // Format Helpers
  // ============================================================================
  
  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateUserId = (userId: string): string => {
    return userId.length > 12 ? `${userId.substring(0, 8)}...` : userId;
  };

  // ============================================================================
  // Render
  // ============================================================================
  
  // Show loading while checking auth
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-ink-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-ink-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show access denied for non-admins
  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Header */}
      <header className="bg-white border-b border-ink-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">API Usage Dashboard</h1>
              <p className="text-sm text-ink-500 mt-1">
                Monitor beta user API consumption
                {data?.fetchedAt && (
                  <span className="ml-2">
                    • Last updated: {formatDate(data.fetchedAt)}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCsv}
                disabled={!data?.users?.length}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              
              <button
                onClick={fetchUsageData}
                disabled={isLoading}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  'bg-ink-900 text-white hover:bg-ink-800',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchUsageData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                title="Total Users"
                value={data.summary.totalUsers}
                icon={Users}
                color="blue"
              />
              <SummaryCard
                title="Total Cost"
                value={formatCurrency(data.summary.totalCost)}
                icon={DollarSign}
                color="green"
              />
              <SummaryCard
                title="Avg per User"
                value={formatCurrency(data.summary.averageCostPerUser)}
                icon={TrendingUp}
                color="amber"
              />
              <SummaryCard
                title="Over Limit"
                value={data.summary.usersOverLimit}
                icon={AlertTriangle}
                color="red"
                subtitle={`of ${data.summary.totalUsers} users`}
              />
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-ink-100 mb-6">
              <div className="p-4 border-b border-ink-100">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    placeholder="Search by User ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      'w-full pl-10 pr-4 py-2 rounded-lg border border-ink-200',
                      'text-sm text-ink-900 placeholder:text-ink-400',
                      'focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-transparent'
                    )}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-ink-50 border-b border-ink-100">
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="User ID"
                          field="userId"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="API Calls"
                          field="totalApiCalls"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="Tokens"
                          field="totalTokens"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="Cost"
                          field="totalCost"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="% of Limit"
                          field="percentOfLimit"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <SortHeader
                          label="Last Used"
                          field="lastApiCall"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="px-6 py-3 text-left">
                        <span className="font-semibold text-xs uppercase tracking-wide text-ink-500">
                          Status
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filteredAndSortedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-ink-500">
                          {searchQuery ? 'No users match your search' : 'No usage data yet'}
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedUsers.map((user) => (
                        <tr 
                          key={user.userId} 
                          className={cn(
                            'hover:bg-ink-50 transition-colors',
                            user.isOverLimit && 'bg-red-50/50'
                          )}
                        >
                          <td className="px-6 py-4">
                            <span 
                              className="font-mono text-sm text-ink-700"
                              title={user.userId}
                            >
                              {truncateUserId(user.userId)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-600">
                            {user.totalApiCalls.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-600">
                            {user.totalTokens.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              'text-sm font-medium',
                              user.isOverLimit ? 'text-red-600' : 'text-ink-900'
                            )}>
                              {formatCurrency(user.totalCost)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-ink-200 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    user.percentOfLimit >= 100 ? 'bg-red-500' :
                                    user.percentOfLimit >= 80 ? 'bg-amber-500' :
                                    user.percentOfLimit >= 50 ? 'bg-yellow-500' :
                                    'bg-emerald-500'
                                  )}
                                  style={{ width: `${Math.min(user.percentOfLimit, 100)}%` }}
                                />
                              </div>
                              <span className={cn(
                                'text-xs font-medium',
                                user.percentOfLimit >= 100 ? 'text-red-600' : 'text-ink-500'
                              )}>
                                {user.percentOfLimit.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-ink-500">
                            {formatDate(user.lastApiCall)}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge isOverLimit={user.isOverLimit} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              {filteredAndSortedUsers.length > 0 && (
                <div className="px-6 py-3 bg-ink-50 border-t border-ink-100 text-sm text-ink-500">
                  Showing {filteredAndSortedUsers.length} of {data.users.length} users
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
