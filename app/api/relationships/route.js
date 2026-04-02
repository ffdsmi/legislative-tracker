import { NextResponse } from 'next/server';
import { computeRelationships, getRelatedBills } from '@/lib/relationships';
import { requireSession } from '@/lib/session';

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const billId = searchParams.get('billId');

    if (!billId) {
      return NextResponse.json({ error: 'billId query param required' }, { status: 400 });
    }

    const related = await getRelatedBills(session.workspaceId, billId);
    return NextResponse.json({ related });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireSession();
    const relationships = await computeRelationships(session.workspaceId);
    const count = Object.keys(relationships).reduce((sum, key) => sum + relationships[key].length, 0);
    return NextResponse.json({ success: true, totalRelationshipsDetected: count });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

