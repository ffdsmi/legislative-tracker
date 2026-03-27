import { NextResponse } from 'next/server';
import { getWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistPosition } from '@/lib/store';

// GET /api/watchlist
export async function GET() {
  const items = getWatchlist();
  return NextResponse.json({ items, total: items.length });
}

// POST /api/watchlist — add bill to watchlist
export async function POST(request) {
  const body = await request.json();
  const list = addToWatchlist({
    billId: body.billId,
    billNumber: body.billNumber,
    title: body.title,
    jurisdiction: body.jurisdiction,
    position: body.position || 'watch',
  });
  return NextResponse.json({ success: true, items: list }, { status: 201 });
}

// PUT /api/watchlist — update position
export async function PUT(request) {
  const body = await request.json();
  const list = updateWatchlistPosition(body.billId, body.position);
  return NextResponse.json({ success: true, items: list });
}

// DELETE /api/watchlist
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const billId = searchParams.get('billId');
  const list = removeFromWatchlist(billId);
  return NextResponse.json({ success: true, items: list });
}
