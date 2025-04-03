# Supabase Edge Functions

This directory contains Supabase Edge Functions that replace the previous Next.js API routes in the application.

## Webhook Function

The `webhook` function replaces the previous `/api/webhook` API route. It handles webhooks from Supabase for real-time updates.

### Local Development

To test the Edge Function locally:

```bash
# Navigate to the project root
cd my-shopping-list

# Start the Supabase local development environment
npx supabase start

# Serve the function locally
npx supabase functions serve webhook
```

### Deployment

To deploy the Edge Function to your Supabase project:

```bash
# Log in to Supabase CLI
npx supabase login

# Deploy the function
npx supabase functions deploy webhook --project-ref your-project-reference
```

Replace `your-project-reference` with your Supabase project reference ID.

### Setting Webhook in Supabase

After deploying the function, you need to set up a Database Webhook in the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to Database → Webhooks
3. Create a new webhook:
   - Name: `items-update` or another descriptive name
   - Table: `items`
   - Events: SELECT INSERT, UPDATE, DELETE
   - URL: Your deployed function URL (e.g., `https://your-project-reference.functions.supabase.co/webhook`)

## Why Edge Functions Instead of API Routes

Supabase Edge Functions offer several advantages over Next.js API Routes for this application:

1. **Closer to the Database**: Running directly on Supabase reduces latency for database operations
2. **Simplified Authentication**: Edge Functions have direct access to Supabase auth and RLS
3. **Reduced Server Load**: Offloads webhook processing from your application servers
4. **Cost Effective**: Edge Functions scale automatically with usage
5. **Specialized Environment**: Purpose-built for handling Supabase events and triggers

## Implementation Notes

The implementation mirrors the functionality of the previous API route, with adaptations for the Deno runtime environment used by Supabase Edge Functions.

The main differences are:
- Use of Deno's standard libraries instead of Node.js
- Different response format (using Deno's `Response` object)
- Environment variables accessed through `Deno.env` 