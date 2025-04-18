import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  const user = session?.user;
  const { pathname } = req.nextUrl;

  // Public paths that don't require authentication or profile completion
  const publicPaths = ['/login']; 
  // Path requiring profile completion (should be accessible if profile incomplete)
  const completeProfilePath = '/auth/complete-profile';

  if (user) {
    // User is authenticated
    try {
        // Fetch the user profile to check for username
        const { data: profile, error: profileError } = await supabase
            .from('users') // Query our public users table
            .select('username')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.error('Middleware: Error fetching profile:', profileError);
            // Allow access but log error, or redirect to an error page?
            // For now, let them proceed but log.
             return res;
        }

        const hasUsername = profile?.username;

        // Redirect to complete profile if username is missing and not already there
        if (!hasUsername && pathname !== completeProfilePath && !publicPaths.includes(pathname)) {
            console.log(`Middleware: User ${user.id} missing username, redirecting to complete profile.`);
            return NextResponse.redirect(new URL(completeProfilePath, req.url));
        }

        // Redirect authenticated users with username away from login/complete profile pages
        if (hasUsername && (publicPaths.includes(pathname) || pathname === completeProfilePath)) {
             console.log(`Middleware: Authenticated user ${user.id} with username on public/complete page, redirecting to home.`);
            return NextResponse.redirect(new URL('/home', req.url));
        }

    } catch (e) {
         console.error("Middleware: Error checking user profile:", e);
         // Allow request to proceed on error to avoid blocking user
    }

  } else {
    // User is not authenticated
    // Redirect to login if trying to access protected paths
    if (!publicPaths.includes(pathname) && pathname !== completeProfilePath) {
         console.log(`Middleware: Unauthenticated user accessing protected path ${pathname}, redirecting to login.`);
        // Preserve the original path for redirect after login?
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        // redirectUrl.searchParams.set(`redirectedFrom`, pathname) // Optional: Add redirect param
        return NextResponse.redirect(redirectUrl);
    }
  }

  // Allow the request to proceed if no redirects were triggered
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