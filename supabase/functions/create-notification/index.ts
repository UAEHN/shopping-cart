// @deno-types="https://esm.sh/@supabase/supabase-js@2.44.2/dist/module/index.d.ts"
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.44.2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Create Notification function started v3");

// Define CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Replace with your frontend URL in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the expected request body structure
interface NotificationRequestBody {
  recipientUserId: string;
  message: string;
  type: string;
  relatedItemId?: string;
  relatedListId?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Authenticate the user --- 
    let supabaseClient: SupabaseClient | null = null;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase URL or Anon Key environment variables.");
      }
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey,
        { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
      );
    } catch (clientError) {
       console.error("Error creating Supabase client:", clientError);
       return new Response(JSON.stringify({ error: "Failed to initialize Supabase client" }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 500,
       });
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error or no user:", authError);
      return new Response(JSON.stringify({ error: authError?.message || "User not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    console.log(`Authenticated user: ${user.id}`);

    // --- Create Admin Client (Bypasses RLS) --- 
    let supabaseAdmin: SupabaseClient | null = null;
    try {
         const supabaseUrl = Deno.env.get("SUPABASE_URL");
         const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
         if (!supabaseUrl || !supabaseServiceRoleKey) {
             throw new Error("Missing Supabase URL or Service Role Key environment variables.");
         }
         supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey,
           { auth: { autoRefreshToken: false, persistSession: false } } 
         );
    } catch (adminClientError) {
        console.error("Error creating Supabase admin client:", adminClientError);
        return new Response(JSON.stringify({ error: "Failed to initialize Supabase admin client" }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 500,
        });
    }
    
    if (!supabaseAdmin) { 
         console.error("Supabase admin client is null after creation attempt.");
         return new Response(JSON.stringify({ error: "Failed to initialize Supabase admin client (null)" }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
           status: 500,
         });
    }

    // --- Get and Validate Request Body --- 
    let body: NotificationRequestBody;
    try {
       const rawBody = await req.json();
       body = rawBody as NotificationRequestBody;
    } catch (parseError) {
       console.error("Error parsing request body:", parseError);
       const errMsg = parseError instanceof Error ? parseError.message : "Invalid JSON";
       return new Response(JSON.stringify({ error: `Invalid request body: ${errMsg}` }), {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 400,
       });
    }
    
    const { recipientUserId, message, type, relatedItemId, relatedListId } = body;

    if (!recipientUserId || !message || !type) {
      console.error("Missing required notification data:", { recipientUserId, message, type });
      return new Response(JSON.stringify({ error: "Missing required fields: recipientUserId, message, type" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Received notification data:", { recipientUserId, message, type, relatedItemId, relatedListId });

    // --- Optional Server-Side Security Check (Example) --- 
    if (relatedListId && type === 'NEW_LIST') { 
      try {
        const { data: listData, error: listError } = await supabaseAdmin
          .from('lists')
          .select('creator_id')
          .eq('id', relatedListId)
          .maybeSingle(); 

        if (listError) {
          console.error("Error fetching list during security check:", listError);
        } else if (!listData) {
            console.warn(`Security check: List ${relatedListId} not found.`);
        } else if (listData.creator_id !== user.id) {
          console.error(`Security check failed: User ${user.id} tried to create NEW_LIST notification for list ${relatedListId} owned by ${listData.creator_id}`);
          return new Response(JSON.stringify({ error: "Permission denied: Not the list creator" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          });
        }
      } catch (checkError) {
          console.error("Exception during list ownership check:", checkError);
          return new Response(JSON.stringify({ error: "Internal error during security check" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
          });
      }
    }

    // --- Insert Notification (Bypasses RLS) --- 
    const notificationPayload = {
      user_id: recipientUserId,
      message,
      related_item_id: relatedItemId || null,
      related_list_id: relatedListId || null,
      type,
      is_read: false,
    };

    console.log("Inserting notification payload:", notificationPayload);
    
    // Log the service role key status (without revealing the actual key)
    const serviceRoleKeyStatus = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ? "Present (length: " + Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.length + ")" : "Missing";
    console.log("Service role key status:", serviceRoleKeyStatus);
    
    // Log the admin client configuration
    console.log("Admin client config:", {
      url: Deno.env.get("SUPABASE_URL") ? "Present" : "Missing",
      authConfig: { autoRefreshToken: false, persistSession: false }
    });

    const { data: notificationData, error: insertError } = await supabaseAdmin
      .from("notifications")
      .insert(notificationPayload)
      .select()
      .single(); 

    if (insertError) {
      console.error("Error inserting notification:", insertError);
      const errorMessage = insertError.message || "Failed to create notification";
      let statusCode = 500;
      if (insertError.code === '23503') statusCode = 400; 
      if (insertError.code === '23505') statusCode = 409; 
      
      return new Response(JSON.stringify({ error: errorMessage, details: insertError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      });
    }

    console.log("Notification created successfully:", notificationData);
    return new Response(JSON.stringify(notificationData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 201, 
    });

  } catch (e) {
    console.error("Unhandled exception in function:", e);
    const errorMsg = e instanceof Error ? e.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}); 