import { auth } from './firebase';

/**
 * fetch() for our own /api routes that need a signed-in clinician.
 * Adds the Firebase ID token so the server can check who is calling.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
