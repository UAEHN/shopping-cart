import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log(`Middleware triggered for path: ${req.nextUrl.pathname}`); // Log path
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  const user = session?.user;
  const { pathname } = req.nextUrl;

  console.log("Middleware: Session User:", user?.id); // Log user ID

  // Updated: Removed '/' from publicPaths for now, page.tsx will handle root
  const publicPaths = ['/login']; 
  // Path requiring profile completion (should be accessible if profile incomplete)
  const completeProfilePath = '/auth/complete-profile';
  const homePath = '/lists'; // <-- Changed from '/home' to '/lists'

  if (user) {
    // User is authenticated
    console.log("Middleware: User is authenticated.");
    try {
        // Fetch the user profile to check for username
        const { data: profile, error: profileError } = await supabase
            .from('users') // Query our public users table
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

        console.log("Middleware: Fetched profile:", profile);
        console.log("Middleware: Profile fetch error:", profileError);

        if (profileError) {
            console.error('Middleware: Error fetching profile:', profileError);
            // Allow access but log error, or redirect to an error page?
            // For now, let them proceed but log.
             return res;
        }

        const hasUsername = profile?.username;
        console.log(`Middleware: hasUsername = ${hasUsername}`);

        // Redirect to complete profile if username is missing and not already there
        if (!hasUsername && pathname !== completeProfilePath && !publicPaths.includes(pathname)) {
            console.log(`Middleware: Condition met: No username, redirecting to ${completeProfilePath}.`);
            return NextResponse.redirect(new URL(completeProfilePath, req.url));
        }

        // Redirect authenticated users with username away from login/complete profile pages to the new home path
        if (hasUsername && (publicPaths.includes(pathname) || pathname === completeProfilePath)) {
             console.log(`Middleware: Condition met: Has username, on public/complete page, redirecting to ${homePath}.`);
            return NextResponse.redirect(new URL(homePath, req.url));
        }

        // New: Redirect authenticated users with username accessing root '/' to lists
        if (hasUsername && pathname === '/') {
          console.log(`Middleware: Condition met: Has username, on root path, redirecting to ${homePath}.`);
          return NextResponse.redirect(new URL(homePath, req.url));
        }

        console.log("Middleware: No redirect conditions met for authenticated user.");

    } catch (e) {
         console.error("Middleware: Error checking user profile:", e);
         // Allow request to proceed on error to avoid blocking user
    }

  } else {
    // User is not authenticated
    console.log("Middleware: User is NOT authenticated.");
    // Redirect to login if trying to access protected paths (including root '/')
    if (!publicPaths.includes(pathname) && pathname !== completeProfilePath) {
         console.log(`Middleware: Condition met: Unauthenticated, accessing protected path ${pathname}, redirecting to login.`);
        // Preserve the original path for redirect after login?
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        // redirectUrl.searchParams.set(`redirectedFrom`, pathname) // Optional: Add redirect param
        return NextResponse.redirect(redirectUrl);
    }
    console.log("Middleware: No redirect conditions met for unauthenticated user (likely public path).");
  }

  // Allow the request to proceed if no redirects were triggered
  console.log("Middleware: Allowing request to proceed.");
  return res;
}

// Specify which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes, if any)
     * - auth/callback (Supabase auth callback)
     * Feel free to modify this pattern to include more exceptions.
     */
    '/((?!_next/static|_next/image|favicon.ico|api|auth/callback).)*',
  ],
}; 