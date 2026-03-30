import { NextResponse } from 'next/server';
import { getCollections, createCollection, updateCollection, deleteCollection } from '@/lib/collections';
import { requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession();
    const collections = await getCollections(session.workspaceId);
    
    // In our Prisma rewrite, getCollections already `include`s the `bills` relation and returns it
    // We can map over it to get billCount so we don't need additional queries
    const enriched = collections.map(c => ({
      ...c,
      billCount: c.bills ? c.bills.length : 0,
    }));
    return NextResponse.json({ collections: enriched, total: enriched.length });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const collection = await createCollection(session.workspaceId, { name: body.name, description: body.description });
    return NextResponse.json({ collection });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const updated = await updateCollection(session.workspaceId, body.id, { name: body.name, description: body.description });
    return NextResponse.json({ collection: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await deleteCollection(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

