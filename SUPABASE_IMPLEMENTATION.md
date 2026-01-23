# Supabase Implementation for CopyWorx

## Overview

This document describes the complete Supabase implementation for CopyWorx, enabling cloud-based data persistence and cross-device synchronization.

## Implementation Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Supabase Setup | ✅ Complete |
| 2 | Database Schema | ✅ Complete |
| 3 | API Routes | ✅ Complete |
| 4 | Storage Layer | ✅ Complete |
| 5 | Migration Utility | ✅ Complete |
| 6 | Documentation | ✅ Complete |

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/login with GitHub
3. Click "New Project"
4. Name: `copyworx-production`
5. Choose nearest region
6. Set a strong database password (save it!)
7. Wait ~2 minutes for provisioning

### Step 2: Get API Credentials

From Supabase Dashboard → Settings → API:

1. Copy **Project URL**
2. Copy **anon public** key
3. Copy **service_role** key (keep secret!)

### Step 3: Configure Environment Variables

Update `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For Vercel deployment, add these same variables in:
Settings → Environment Variables

### Step 4: Create Database Schema

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/schema.sql`
3. Run the SQL to create all tables and policies

## File Structure

```
lib/
├── supabase.ts                    # Supabase client configuration
├── types/
│   └── database.ts                # TypeScript types for Supabase tables
├── storage/
│   ├── project-storage.ts         # localStorage (unchanged)
│   ├── document-storage.ts        # localStorage (unchanged)
│   ├── persona-storage.ts         # localStorage (unchanged)
│   ├── folder-storage.ts          # localStorage (unchanged)
│   ├── snippet-storage.ts         # localStorage (unchanged)
│   ├── supabase-storage.ts        # Supabase API wrapper
│   └── unified-storage.ts         # Hybrid storage with fallback
├── utils/
│   └── api-auth.ts                # Auth utilities for API routes

app/api/db/
├── projects/route.ts              # CRUD for projects
├── documents/route.ts             # CRUD for documents
├── brand-voices/route.ts          # CRUD for brand voices
├── personas/route.ts              # CRUD for personas
├── folders/route.ts               # CRUD for folders
├── snippets/route.ts              # CRUD for snippets
├── user-settings/route.ts         # User preferences
├── sync/route.ts                  # Bulk data sync
└── migrate/route.ts               # Migration endpoint

components/migration/
├── MigrationBanner.tsx            # UI for migration prompt
└── index.ts                       # Exports

supabase/
└── schema.sql                     # Database schema
```

## API Routes

All database API routes are under `/api/db/`:

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/db/projects` | GET, POST, PUT, DELETE | Project CRUD |
| `/api/db/documents` | GET, POST, PUT, DELETE | Document CRUD |
| `/api/db/brand-voices` | GET, POST, DELETE | Brand voice (upsert) |
| `/api/db/personas` | GET, POST, PUT, DELETE | Persona CRUD |
| `/api/db/folders` | GET, POST, PUT, DELETE | Folder CRUD |
| `/api/db/snippets` | GET, POST, PUT, PATCH, DELETE | Snippet CRUD |
| `/api/db/user-settings` | GET, POST | User preferences |
| `/api/db/sync` | GET | Fetch all data at once |
| `/api/db/migrate` | POST | Migrate localStorage to cloud |

## Database Schema

### Tables

1. **projects** - Top-level organizational unit
2. **brand_voices** - One per project (brand configuration)
3. **personas** - Target audience profiles
4. **folders** - Document organization (hierarchical)
5. **documents** - Copywriting content with version control
6. **snippets** - Reusable copy elements
7. **user_settings** - Per-user preferences

### Key Features

- UUID primary keys
- Automatic timestamps (created_at, updated_at)
- Cascading deletes for data integrity
- Row Level Security (RLS) for multi-tenant safety
- Indexed queries for performance

## Storage Architecture

### Unified Storage Layer

The `unified-storage.ts` module provides:

1. **Cloud-first approach**: Uses Supabase when available
2. **Automatic fallback**: Falls back to localStorage if offline/unavailable
3. **Migration utilities**: One-time migration for existing users
4. **Consistent interface**: Same API as localStorage storage

### Usage Example

```typescript
import { 
  getAllProjects, 
  createProject, 
  isCloudAvailable 
} from '@/lib/storage/unified-storage';

// Check cloud availability
const cloudEnabled = isCloudAvailable();

// Load projects (automatically uses best available storage)
const projects = await getAllProjects();

// Create project (syncs to cloud if available)
const newProject = await createProject('My Project');
```

## Migration

### Automatic Migration Prompt

Add the `MigrationBanner` component to your app layout:

```tsx
import { MigrationBanner } from '@/components/migration';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <MigrationBanner 
        onMigrationComplete={() => {
          // Refresh data after migration
          window.location.reload();
        }}
      />
    </>
  );
}
```

### Manual Migration

```typescript
import { migrateLocalToCloud, hasLocalDataToMigrate } from '@/lib/storage/unified-storage';

// Check if migration needed
if (hasLocalDataToMigrate()) {
  const result = await migrateLocalToCloud();
  console.log('Migrated:', result.migrated, 'projects');
}
```

## Security Considerations

1. **Service Role Key**: Only used in API routes (server-side)
2. **Anon Key**: Safe for client, respects RLS policies
3. **User Isolation**: All data filtered by Clerk user ID
4. **Input Validation**: All API routes validate input
5. **SQL Injection**: Protected by parameterized queries

## Testing Checklist

- [ ] Create project on Device A → See on Device B
- [ ] Create document → Syncs across devices
- [ ] Update content → Changes sync in real-time
- [ ] Delete project → Removed from all devices
- [ ] Brand voice → Saves and loads correctly
- [ ] Personas → CRUD works across devices
- [ ] Folders → Hierarchical structure maintained
- [ ] Snippets → Usage count increments
- [ ] Migration → localStorage data transfers completely
- [ ] Offline mode → Falls back to localStorage gracefully

## Deployment Checklist

1. [ ] Add Supabase env vars to Vercel
2. [ ] Run schema.sql in Supabase SQL Editor
3. [ ] Test API routes in development
4. [ ] Deploy to Vercel
5. [ ] Test cross-device sync on production
6. [ ] Monitor Supabase usage dashboard

## Troubleshooting

### "Database not configured" error
- Check that all three env vars are set correctly
- Verify Project URL format: `https://xxx.supabase.co`

### "Unauthorized" error
- Ensure user is logged in via Clerk
- Check Clerk middleware configuration

### Migration fails
- Check browser console for detailed errors
- Verify service_role key has correct permissions
- Try migrating with fewer projects at once

### Data not syncing
- Check network connectivity
- Verify Supabase project is not paused
- Check Supabase dashboard for errors

## Future Enhancements

1. **Real-time sync**: Use Supabase Realtime for instant updates
2. **Conflict resolution**: Handle simultaneous edits
3. **Offline queue**: Queue changes when offline, sync when back
4. **Data export**: Allow users to export all their data
5. **Sharing**: Share projects between users

## Support

For issues with this implementation:
1. Check browser console for errors
2. Check Supabase dashboard logs
3. Review the API route error responses
4. Contact support with error details
