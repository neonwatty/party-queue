# Supabase Setup

This directory contains the database migrations and edge functions for Link Party.

## Database Setup

Run these migrations in order in the [Supabase SQL Editor](https://supabase.com/dashboard):

1. **001_initial_schema.sql** - Creates base tables (parties, party_members, queue_items)
2. **002_add_completion_fields.sql** - Adds user_id and completion tracking fields
3. **003_database_security.sql** - Enables Row Level Security (RLS) policies
4. **004_push_notifications.sql** - Creates push notification tables

### Quick Setup

Copy and paste each migration file into the SQL Editor and run them in order.

## Edge Functions

### fetch-content-metadata

Fetches metadata for YouTube, Twitter/X, and Reddit URLs.

**Deploy:**
```bash
supabase functions deploy fetch-content-metadata
```

**Optional: YouTube API Key**

For video duration support, set the `YOUTUBE_API_KEY` secret:
```bash
supabase secrets set YOUTUBE_API_KEY=your_api_key_here
```

## Environment Variables

The frontend requires these environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development Mode

When Supabase is not configured (URL contains "placeholder" or "your-project-id"), the app runs in mock mode with sample data.
