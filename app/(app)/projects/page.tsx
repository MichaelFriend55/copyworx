/**
 * @file app/(app)/projects/page.tsx
 * @description Projects page - manage copywriting projects
 * 
 * Features:
 * - Project list with status
 * - Create new project
 * - Search and filter
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  FileText,
  Calendar,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Manage your copywriting projects.',
};

/**
 * Project data (placeholder)
 */
const projects: Array<{
  id: string;
  name: string;
  description: string;
  template: string;
  status: string;
  wordCount: number;
  lastEdited: string;
  createdAt: string;
}> = [
  {
    id: '1',
    name: 'Q4 Email Campaign',
    description: 'Holiday season email marketing campaign for product launch',
    template: 'Email Sequence',
    status: 'In Progress',
    wordCount: 2450,
    lastEdited: '2 hours ago',
    createdAt: 'Dec 15, 2025',
  },
  {
    id: '2',
    name: 'Product Launch Landing Page',
    description: 'Main landing page for the new premium tier launch',
    template: 'Landing Page',
    status: 'Draft',
    wordCount: 850,
    lastEdited: '5 hours ago',
    createdAt: 'Dec 14, 2025',
  },
  {
    id: '3',
    name: 'Social Media Content Pack',
    description: 'January content calendar posts for all platforms',
    template: 'Social Posts',
    status: 'Completed',
    wordCount: 1200,
    lastEdited: '1 day ago',
    createdAt: 'Dec 10, 2025',
  },
  {
    id: '4',
    name: 'Blog Post Series',
    description: 'Educational content series about copywriting tips',
    template: 'Blog Post',
    status: 'In Progress',
    wordCount: 3400,
    lastEdited: '2 days ago',
    createdAt: 'Dec 8, 2025',
  },
  {
    id: '5',
    name: 'LinkedIn Outreach',
    description: 'Connection request and follow-up message templates',
    template: 'Cold Outreach',
    status: 'Completed',
    wordCount: 450,
    lastEdited: '3 days ago',
    createdAt: 'Dec 5, 2025',
  },
  {
    id: '6',
    name: 'Google Ads Campaign',
    description: 'PPC ad copy for Q1 marketing campaign',
    template: 'Google Ads',
    status: 'Draft',
    wordCount: 320,
    lastEdited: '4 days ago',
    createdAt: 'Dec 3, 2025',
  },
] as const;

/**
 * Get status badge variant
 */
function getStatusVariant(status: string): 'amber' | 'secondary' | 'outline' {
  switch (status) {
    case 'Completed':
      return 'amber';
    case 'In Progress':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * Projects page component
 */
export default function ProjectsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink-900">
            Projects
          </h1>
          <p className="text-ink-600 mt-1">
            Manage and organize your copywriting projects.
          </p>
        </div>
        <Button variant="amber" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="default">
            All Status
          </Button>
          <Button variant="outline" size="default">
            Sort by: Recent
          </Button>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="border-border/50 hover:shadow-md transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Project Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-12 w-12 rounded-xl bg-ink-100 flex items-center justify-center shrink-0">
                    <FolderOpen className="h-6 w-6 text-ink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/projects/${project.id}`}
                        className="font-semibold text-ink-900 hover:text-amber-600 transition-colors truncate"
                      >
                        {project.name}
                      </Link>
                      <Badge variant={getStatusVariant(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-500 line-clamp-1 mb-2">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        {project.template}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {project.createdAt}
                      </span>
                      <span>
                        {project.wordCount.toLocaleString()} words
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 lg:gap-4">
                  <span className="text-sm text-ink-500 whitespace-nowrap">
                    Edited {project.lastEdited}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/projects/${project.id}`}>
                      Open
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State (hidden when projects exist) */}
      {projects.length === 0 && (
        <Card className="border-dashed border-2 border-border">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-ink-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-ink-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ink-900 mb-2">
              No projects yet
            </h3>
            <p className="text-ink-500 mb-6 max-w-sm mx-auto">
              Get started by creating your first copywriting project.
            </p>
            <Button variant="amber" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

