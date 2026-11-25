'use server';

import { signIn, signOut } from '@/auth';

export async function signInWithSlack(formData: FormData) {
  const next = String(formData.get('next') ?? '/');
  // Only same-site paths: never redirect to another origin after sign-in.
  const redirectTo = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  await signIn('slack', { redirectTo });
}

export async function signOutAction() {
  await signOut({ redirectTo: '/signin' });
}
