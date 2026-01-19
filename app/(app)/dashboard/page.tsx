/**
 * @file app/(app)/dashboard/page.tsx
 * @description Main dashboard page for authenticated users
 * 
 * Shows:
 * - Personalized welcome message with user's name
 * - Quick stats
 * - Recent activity
 * - Quick actions
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { 
  FileText, 
  FolderOpen, 
  TrendingUp, 
  Clock,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your CopyWorx dashboard - manage your projects and templates.',
};

/**
 * Dashboard stats data (placeholder)
 */
const stats = [
  {
    title: 'Words Generated',
    value: '12,456',
    change: '+2.5%',
    changeType: 'positive' as const,
    icon: FileText,
  },
  {
    title: 'Active Projects',
    value: '8',
    change: '+1',
    changeType: 'positive' as const,
    icon: FolderOpen,
  },
  {
    title: 'Templates Used',
    value: '23',
    change: '+5',
    changeType: 'positive' as const,
    icon: Sparkles,
  },
  {
    title: 'Time Saved',
    value: '14h',
    change: 'This week',
    changeType: 'neutral' as const,
    icon: Clock,
  },
] as const;

/**
 * Recent projects data (placeholder)
 */
const recentProjects = [
  {
    id: '1',
    name: 'Q4 Email Campaign',
    template: 'Email Sequence',
    updatedAt: '2 hours ago',
    status: 'In Progress',
  },
  {
    id: '2',
    name: 'Product Launch Landing Page',
    template: 'Landing Page',
    updatedAt: '5 hours ago',
    status: 'Draft',
  },
  {
    id: '3',
    name: 'Social Media Content Pack',
    template: 'Social Posts',
    updatedAt: '1 day ago',
    status: 'Completed',
  },
] as const;

/**
 * Quick action templates
 */
const quickActions = [
  { name: 'Email Copy', icon: '✉️' },
  { name: 'Landing Page', icon: '🎯' },
  { name: 'Social Post', icon: '📱' },
  { name: 'Ad Copy', icon: '📢' },
] as const;

/**
 * Dashboard page component
 * 
 * Server component that fetches the current user and displays
 * a personalized dashboard.
 */
export default async function DashboardPage() {
  // Fetch the current user from Clerk
  const user = await currentUser();
  
  // Get the user's first name for personalized greeting
  const firstName = user?.firstName || user?.username || 'there';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-bold text-ink-900">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-ink-600 mt-1">
            Here&apos;s what&apos;s happening with your copywriting projects.
          </p>
        </div>
        <Button variant="amber" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* User Info Card */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {user?.imageUrl ? (
              <img 
                src={user.imageUrl} 
                alt={firstName}
                className="h-16 w-16 rounded-full border-2 border-amber-300"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-2xl font-bold">
                {firstName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-sans text-xl font-semibold text-ink-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-ink-600">
                {user?.emailAddresses?.[0]?.emailAddress}
              </p>
              <Badge variant="amber" className="mt-2">
                Pro Plan
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-lg bg-ink-100 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-ink-600" />
                </div>
                <Badge 
                  variant={stat.changeType === 'positive' ? 'amber' : 'secondary'}
                  className="text-xs"
                >
                  {stat.change}
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-ink-900">{stat.value}</p>
                <p className="text-sm text-ink-500">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Projects</CardTitle>
                <CardDescription>Your latest copywriting projects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-ink-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-ink-900">{project.name}</p>
                        <p className="text-sm text-ink-500">
                          {project.template} • {project.updatedAt}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={
                        project.status === 'Completed' ? 'amber' :
                        project.status === 'In Progress' ? 'secondary' : 'outline'
                      }
                    >
                      {project.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Quick Start</CardTitle>
              <CardDescription>Jump into a new project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    href="/templates"
                    className="flex flex-col items-center justify-center p-4 rounded-lg border border-border/50 hover:bg-amber-50 hover:border-amber-200 transition-colors group"
                  >
                    <span className="text-2xl mb-2">{action.icon}</span>
                    <span className="text-sm font-medium text-ink-700 group-hover:text-amber-700">
                      {action.name}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card className="border-border/50 mt-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-ink-700">Words This Month</span>
                <span className="text-sm text-ink-500">12,456 / 50,000</span>
              </div>
              <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                  style={{ width: '25%' }}
                />
              </div>
              <p className="text-xs text-ink-500 mt-2">
                37,544 words remaining
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
