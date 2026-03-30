import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspaceId;

    const bundle = {
      bills: await db.bill.findMany({ where: { workspaceId } }),
      alerts: await db.alert.findMany({ where: { workspaceId } }),
      keywords: await db.keyword.findMany({ where: { workspaceId } }),
      watchlists: await db.watchlist.findMany({ where: { workspaceId } }),
      testimonies: await db.testimony.findMany({ where: { workspaceId } }),
      collections: await db.collection.findMany({ where: { workspaceId } }),
      tags: await db.tag.findMany({ where: { workspaceId } }),
    };

    const json = JSON.stringify(bundle, null, 2);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="legislative-tracker-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspaceId;

    // Perform deletions sequentially to prevent locking limits
    await db.bill.deleteMany({ where: { workspaceId } }); // Cascades onto texts, diffs, interactions
    await db.legislator.deleteMany({ where: { workspaceId } });
    await db.docket.deleteMany({ where: { workspaceId } });
    await db.keyword.deleteMany({ where: { workspaceId } });
    await db.alert.deleteMany({ where: { workspaceId } });
    await db.collection.deleteMany({ where: { workspaceId } });
    await db.tag.deleteMany({ where: { workspaceId } });
    await db.settings.update({ where: { workspaceId }, data: { datasetTracker: "{}" } });

    return NextResponse.json({ success: true, message: 'All data cleared.' });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

