import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { syncDockets } from '@/lib/regulations';

export async function POST(request) {
  try {
    const session = await requireSession();
    
    // Optional: read agencies from request body. Default to NCUA and CFPB.
    let agencies = ['NCUA', 'CFPB'];
    try {
      const body = await request.json();
      if (body.agencies && Array.isArray(body.agencies)) {
        agencies = body.agencies;
      }
    } catch { /* ignore empty body */ }

    const result = await syncDockets(session.workspaceId, agencies);

    return NextResponse.json(result);
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

