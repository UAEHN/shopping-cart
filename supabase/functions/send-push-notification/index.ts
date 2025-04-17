// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
// Ensure you have the latest types if needed, check Supabase docs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// ** تحديث إصدار مكتبة Deno القياسية **
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"; // Updated version
// Use npm specifier for Supabase JS client
import { createClient } from "npm:@supabase/supabase-js@^2.44.0";
// Import necessary parts from firebase-admin SDK
import {
  initializeApp,
  cert,
  getApps,
  getApp,
  type App // Import App type
} from "npm:firebase-admin@^12.0.0/app";
import { getMessaging, type Message } from "npm:firebase-admin@^12.0.0/messaging";

console.log("Function send-push-notification started.");

// --- Firebase Admin Initialization ---
let firebaseAdminApp: App | null = null; // Use imported App type
try {
  // Use Deno.env.get to access environment variables in Supabase Edge Functions
  const serviceAccountString = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!serviceAccountString) {
    throw new Error("Firebase service account key secret (FIREBASE_SERVICE_ACCOUNT_KEY) not found.");
  }
  const serviceAccount = JSON.parse(serviceAccountString);

  // Initialize Firebase Admin SDK only if it hasn't been initialized yet
  if (getApps().length === 0) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully.");
  } else {
      firebaseAdminApp = getApp(); // Get the existing app instance
      console.log("Using existing Firebase Admin SDK instance.");
  }
} catch (e: unknown) {
  console.error("Error initializing Firebase Admin SDK:", (e instanceof Error) ? e.message : String(e));
  // If Firebase fails to initialize, the function cannot send notifications
}

serve(async (req: Request) => {
  // Check if Firebase initialization was successful before processing requests
  if (!firebaseAdminApp) {
    console.error("Firebase Admin SDK not initialized. Cannot process request.");
    return new Response(JSON.stringify({ error: "Internal Server Error: Firebase Admin SDK failed to initialize." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Extract data sent from the Database Trigger - **MODIFIED**
  let userId: string | null = null;           // Changed from recipientUserId
  let messageText: string | null = null;    // Will be used as notification body
  let notificationType: string | null = null;// For potential customization
  let relatedListId: string | null = null;  // To include in notification data
  let notificationData: Record<string, string> = {}; // Data payload for FCM

  try {
    const payload = await req.json();
    console.log("Received payload:", JSON.stringify(payload)); // Log received payload

    // Read fields sent by the trigger
    userId = payload.userId;
    messageText = payload.message;
    notificationType = payload.type;
    relatedListId = payload.relatedListId;

    // Validate required fields from the trigger
    if (!userId || !messageText) {
      console.error("Missing required fields from trigger payload:", { userId, messageText });
      throw new Error("Missing required fields from trigger: userId, message");
    }

    // Prepare the data payload for the FCM message
    notificationData = {
      // Include any relevant data for the client app
      ...(relatedListId && { listId: relatedListId }), // Pass listId if available
      // You could add the notificationType as well if the client needs it
      ...(notificationType && { type: notificationType }),
    };

  } catch (error: unknown) {
    console.error("Error parsing request body:", (error instanceof Error) ? error.message : String(error));
    return new Response(JSON.stringify({ error: `Bad request: ${(error instanceof Error) ? error.message : String(error)}` }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- Construct Notification Title and Body --- **MODIFIED**
  // Create a simple title (you can customize this based on notificationType later)
  const notificationTitle = "تنبيه قائمة التسوق";
  const notificationBody = messageText; // Use the message from the trigger

  console.log(`Processing notification for user: ${userId}`);
  console.log(`Constructed Title: "${notificationTitle}", Body: "${notificationBody}"`);
  console.log("Data payload:", notificationData);

  try {
    // 2. Initialize Supabase Admin Client (uses Service Role Key)
    const supabaseUrl = Deno.env.get("SUPABASE_URL"); // Use Deno.env
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Use Deno.env

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        throw new Error("Supabase URL or Service Role Key not found in environment variables.");
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 3. Fetch the recipient user's push token
    console.log(`Fetching push token for user ID: ${userId}`);
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('push_token')
      .eq('id', userId) // Use the correct userId variable
      .single();

    if (userError) {
      // Log the error but don't necessarily stop if user not found
      console.error(`Supabase error fetching push token for user ${userId}:`, userError.message);
    }

    // Check if push token exists
    if (!userData || !userData.push_token) {
      console.log(`No push token found for user ${userId}. Skipping notification.`);
      // Return a success response as there's nothing more to do
      return new Response(JSON.stringify({ message: `No push token found for user ${userId}.` }), {
        status: 200, // Or maybe 204 No Content? 200 is fine.
        headers: { "Content-Type": "application/json" },
      });
    }

    const pushToken = userData.push_token;
    console.log(`Found push token for user ${userId}.`); // Don't log the token itself

    // 4. Construct the FCM message - **MODIFIED**
    // Using a data-only payload relies on the client-side Service Worker
    // to display the notification.
    const fcmMessagePayload: Message = { // Use imported Message type
      token: pushToken,
      data: {
        title: notificationTitle, // Pass title in data
        body: notificationBody,   // Pass body in data
        icon: "/icons/icon-192x192.png", // Optional: Specify icon path
        ...notificationData // Merge other data (like listId, type)
      },
      // Add platform-specific configurations for better delivery
      webpush: {
        headers: { Urgency: 'high' },
        // fcmOptions: { link: data.clickAction || '/' } // click_action is handled client-side
      },
      android: { priority: 'high' },
      apns: { headers: { 'apns-priority': '10' } }
    };

    console.log("Sending FCM message payload:", JSON.stringify(fcmMessagePayload));

    // 5. Send the notification using Firebase Admin SDK
    const messaging = getMessaging(firebaseAdminApp);
    const response = await messaging.send(fcmMessagePayload); // Use the correct payload
    console.log("Successfully sent FCM message:", response);

    // Return success response
    return new Response(JSON.stringify({ success: true, messageId: response }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    console.error(`Error processing notification for user ${userId}:`, (error instanceof Error) ? error.message : String(error));
    if (error instanceof Error && error.stack) {
       console.error("Stack trace:", error.stack);
    }
    // Return internal server error response
    return new Response(JSON.stringify({ error: `Internal server error: ${(error instanceof Error) ? error.message : "Unknown error"}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-push-notification' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
