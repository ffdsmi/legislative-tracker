import { NextResponse } from 'next/server';
import { getWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistPosition } from '@/lib/store';
import { requireSession } from '@/lib/session';

// GET /api/watchlist
export async function GET() {
  try {
    const session = await requireSession();
    const items = await getWatchlist(session.workspaceId);
    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST /api/watchlist — add bill to watchlist
export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const list = await addToWatchlist(session.workspaceId, {
      billId: body.billId,
      billNumber: body.billNumber,
      title: body.title,
      jurisdiction: body.jurisdiction,
      position: body.position || 'watch',
    });
    return NextResponse.json({ success: true, items: list }, { status: 201 });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

// PUT /api/watchlist — update position
export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const list = await updateWatchlistPosition(session.workspaceId, body.billId, body.position);
    return NextResponse.json({ success: true, items: list });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

// DELETE /api/watchlist
export async function DELETE(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const list = await removeFromWatchlist(session.workspaceId, billId);
    return NextResponse.json({ success: true, items: list });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

