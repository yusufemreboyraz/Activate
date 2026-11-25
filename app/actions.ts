'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { signIn, signOut } from '@/auth';

export async function signInWithSlack(formData: FormData) {
  const next = String(formData.get('next') ?? '/');
  // Only same-site paths: never redirect to another origin after sign-in.
  const redirectTo = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  await signIn('slack', { redirectTo });
}

// Opening a /activate link only shows a button; signing in happens on this POST,
// so link previews and prefetchers cannot use up the one-time token.
export async function signInWithLink(formData: FormData) {
  const token = String(formData.get('token') ?? '');
  try {
    await signIn('slack-link', { token, redirectTo: '/' });
  } catch (err) {
    unstable_rethrow(err); // signIn succeeds by throwing a redirect
    redirect('/signin?error=LinkExpired');
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: '/signin' });
}
