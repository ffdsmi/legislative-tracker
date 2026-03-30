import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'LGM_SUPER_SECRET_LOCAL_ONLY';

// Ensure the synchronous cookie read in Next 14 handles async Next 15 if upgraded
// Actually, next/headers cookies() returns a readonly config that in 13/14 is somewhat synchronous but in Next 15 they made it async
export async function getSession() {
  const cookieStore = cookies();
  const token = typeof cookieStore.then === 'function' ? (await cookieStore).get('token')?.value : cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.userId) return null;
    return decoded; // { userId, workspaceId, email, name, role }
  } catch (error) {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}
