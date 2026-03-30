import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await requireSession();
    const dockets = await db.docket.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { updatedAt: 'desc' },
      take: 100
    });
    return NextResponse.json(dockets);
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

