import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { listBills } from '@/lib/store';
import { requireSession } from '@/lib/session';

// GET /api/bills — search or list bills from local synchronized PostgreSQL database
export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    // Return locally stored bills (for testimony bill picker)
    if (source === 'local') {
      const dbBills = await db.bill.findMany({
        where: { workspaceId: session.workspaceId },
        select: { id: true, number: true, title: true, jurisdiction: true, status: true },
        orderBy: { updatedAt: 'desc' },
        take: 500
      });
      return NextResponse.json({ bills: dbBills, total: dbBills.length, source: 'local' });
    }

    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json(
        { error: 'LegiScan API key not configured. Go to Settings to add your key.', bills: [] },
        { status: 200 }
      );
    }

    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || 'ANY';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = parseInt(searchParams.get('offset')) || 0;

    const where = { workspaceId: session.workspaceId };
    
    // Filter by jurisdiction if specific state is requested
    if (state && state !== 'ALL' && state !== 'ANY') {
      where.jurisdiction = state;
    }

    // Free text search matching title, number, or description
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Execute optimized count and lookup simultaneously using robust indexed workspaceId fields
    const [dbBills, totalCount] = await Promise.all([
      db.bill.findMany({
        where,
        orderBy: { updatedAt: 'desc' }, 
        take: limit,
        skip: offset,
      }),
      db.bill.count({ where })
    ]);

    const bills = dbBills.map(b => ({
      id: b.id,
      number: b.number,
      title: b.title,
      jurisdiction: b.jurisdiction,
      status: statusLabel(b.status) || 'Unknown',
      lastAction: b.lastActionDate || '',
      lastActionText: b.lastAction || '',
      url: b.url,
    }));

    return NextResponse.json({ 
      bills, 
      total: totalCount, 
      source: search ? 'search' : 'masterlist',
      showing: bills.length
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message, bills: [] }, { status: 200 });
  }
}

function statusLabel(statusCode) {
  const map = {
    1: 'Introduced',
    2: 'Engrossed',
    3: 'Enrolled',
    4: 'Passed',
    5: 'Vetoed',
    6: 'Failed',
  };
  return map[statusCode] || `Status ${statusCode}`;
}

export const dynamic = 'force-dynamic';

