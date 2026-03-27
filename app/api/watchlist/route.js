import { NextResponse } from 'next/server';

// GET /api/watchlist — list watchlist items
export async function GET() {
  // TODO: query PostgreSQL
  return NextResponse.json({ items: [], total: 0 });
}

// POST /api/watchlist — add bill to watchlist
export async function POST(request) {
  const body = await request.json();
  // TODO: insert into PostgreSQL
  return NextResponse.json({ success: true, item: body }, { status: 201 });
}

// DELETE /api/watchlist — remove bill from watchlist
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const billId = searchParams.get('billId');
  // TODO: delete from PostgreSQL
  return NextResponse.json({ success: true, billId });
}
