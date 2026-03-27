import { NextResponse } from 'next/server';

// GET /api/alerts — list alerts
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';
  // TODO: query PostgreSQL
  return NextResponse.json({ alerts: [], total: 0, unread: 0 });
}

// PUT /api/alerts — mark alert(s) as read
export async function PUT(request) {
  const body = await request.json();
  // body.id for single, body.all = true for mark all read
  // TODO: update in PostgreSQL
  return NextResponse.json({ success: true });
}
