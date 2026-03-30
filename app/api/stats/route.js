import { NextResponse } from 'next/server';
import { listBills } from '@/lib/store';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';

// GET /api/stats — dashboard statistics
export async function GET() {
  try {
    const session = await requireSession();
    const bills = await listBills(session.workspaceId);
    
    const activeDockets = await db.docket.count({
      where: { 
        workspaceId: session.workspaceId,
        status: 'Open for Comment'
      }
    });

    return NextResponse.json({
      bills: bills.length,
      dockets: activeDockets
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

