import { NextResponse } from 'next/server';
import { updateAdvocacyPacket } from '@/lib/collections';
import { requireSession } from '@/lib/session';

export async function PUT(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    
    const { billId, targetStance, talkingPoints, considerations } = body;
    
    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }

    const success = await updateAdvocacyPacket(session.workspaceId, id, billId, {
      targetStance,
      talkingPoints,
      considerations
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update advocacy packet' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';
