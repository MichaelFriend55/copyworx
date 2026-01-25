/**
 * @file app/(app)/projects/[projectId]/page.tsx
 * @description Dynamic project route that redirects to workspace with specific project loaded
 * 
 * Purpose:
 * - Handles navigation from project cards
 * - Redirects /projects/[id] → /workspace?projectId=[id]
 * - Enables direct project linking and bookmarking
 * 
 * Security:
 * - Server-side redirect (no client-side exposure)
 * - Project access validated by workspace component
 * - Uses Next.js native redirect() for proper HTTP status codes
 */

import { redirect } from 'next/navigation';

/**
 * Props type for dynamic route params
 */
interface ProjectPageProps {
  params: {
    projectId: string;
  };
}

/**
 * Project page component
 * 
 * This is a minimal redirect component that:
 * 1. Receives the projectId from the URL path
 * 2. Redirects to the workspace with the project loaded
 * 3. Allows the workspace to handle all project logic
 * 
 * @param params - Dynamic route parameters containing projectId
 * @returns Never returns - redirects immediately
 */
export default function ProjectPage({ params }: ProjectPageProps) {
  // Validate projectId exists
  if (!params.projectId) {
    // If no projectId, redirect to workspace without project
    redirect('/workspace');
  }

  // Redirect to workspace with project ID as query parameter
  redirect(`/workspace?projectId=${params.projectId}`);
}
