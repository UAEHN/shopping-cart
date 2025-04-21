import { redirect } from 'next/navigation';

// This page will now only be reached if the user is authenticated
// The middleware handles redirecting unauthenticated users to /login
// and authenticated users with username from / to /lists.
// We can simply redirect to /lists here as a fallback or direct entry.
export default function Home() {
  redirect('/lists');
}
