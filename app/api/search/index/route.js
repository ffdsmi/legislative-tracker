import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await requireSession();

    // Fetch Bills
    const bills = await db.bill.findMany({
      where: { workspaceId: session.workspaceId },
      select: {
        id: true,
        title: true,
        state: true,
        number: true,
        status: true
      }
    });

    // Fetch Dockets
    const dockets = await db.docket.findMany({
      where: { workspaceId: session.workspaceId },
      select: {
        id: true,
        title: true,
        agency: true,
        type: true,
        status: true
      }
    });

    const legislators = await db.legislator.findMany({
      where: { workspaceId: session.workspaceId },
      select: {
        id: true,
        name: true,
        party: true,
        role: true,
        district: true
      }
    });

    // Combine into a searchable structure for Fuse.js
    const searchableIndex = [
      ...bills.map((b) => ({
        id: b.id,
        title: b.title,
        key1: b.number,
        type: 'Bill',
        badge: `${b.state} ${b.number}`,
        url: `/bills/${b.id}`
      })),
      ...dockets.map((d) => ({
        id: d.id,
        title: d.title,
        key1: d.agency,
        type: 'Regulation',
        badge: d.agency,
        url: `/regulations`
      })),
      ...legislators.map((l) => ({
        id: String(l.id),
        title: l.name,
        key1: l.party,
        type: 'Legislator',
        badge: `${l.party} - ${l.district || l.role}`,
        url: `/legislators`
      }))
    ];

    return NextResponse.json(searchableIndex);
  } catch (err) {
    console.error('Search Index Error:', err);
    return NextResponse.json({ error: 'Failed to fetch search index' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

