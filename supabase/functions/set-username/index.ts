import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to check username availability
async function isUsernameAvailable(supabaseAdmin: SupabaseClient, username: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) {
    console.error('Error checking username availability:', error);
    throw new Error('Database error checking username'); // Throw a generic error
  }
  return data === null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }
    const token = authHeader.replace('Bearer ', '');
    // This is a simplified way to get user info; consider using Supabase verifyJwt
    const payload = JSON.parse(atob(token.split('.')[1])); 
    const userId = payload.sub;
    if (!userId) {
        throw new Error('Could not get user ID from token');
    }

    const { username } = await req.json();

    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    // Add more validation for username format if needed (e.g., regex)

    // Create Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if the desired username is available
    const available = await isUsernameAvailable(supabaseAdmin, username);
    if (!available) {
        throw new Error('Username is already taken');
    }

    // Update the username in public.users for the authenticated user
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ username: username })
      .eq('id', userId)
      .select() // Optionally return the updated record
      .single(); // Expect exactly one record to be updated

    if (error) {
      console.error('Error setting username:', error);
      throw error;
    }
    
    if (!data) {
        throw new Error('Failed to update user record, user might not exist in public.users');
    }

    return new Response(JSON.stringify({ success: true, user: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Function error:', error);
    let status = 400;
    if (error.message === 'Username is already taken') status = 409; // Conflict
    if (error.message === 'Missing Authorization header' || error.message === 'Could not get user ID from token') status = 401; // Unauthorized

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
}); 