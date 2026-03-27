import { NextResponse } from 'next/server';

// GET /api/keywords — list keywords
export async function GET() {
  // TODO: query PostgreSQL
  return NextResponse.json({ keywords: [], total: 0 });
}

// POST /api/keywords — create keyword
export async function POST(request) {
  const body = await request.json();
  // TODO: insert into PostgreSQL
  return NextResponse.json({ success: true, keyword: body }, { status: 201 });
}

// PUT /api/keywords — update keyword
export async function PUT(request) {
  const body = await request.json();
  // TODO: update in PostgreSQL
  return NextResponse.json({ success: true, keyword: body });
}

// DELETE /api/keywords — delete keyword
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  // TODO: delete from PostgreSQL
  return NextResponse.json({ success: true, id });
}
