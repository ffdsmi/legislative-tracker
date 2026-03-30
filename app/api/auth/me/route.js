import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user: session });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

