import { NextResponse } from 'next/server';
import { getKeywords, addKeyword, updateKeyword, deleteKeyword } from '@/lib/store';

// GET /api/keywords
export async function GET() {
  const keywords = getKeywords();
  return NextResponse.json({ keywords, total: keywords.length });
}

// POST /api/keywords — create keyword
export async function POST(request) {
  const body = await request.json();
  const keyword = addKeyword({
    term: body.term || body.keyword,
    jurisdiction: body.jurisdiction || 'ALL',
  });
  return NextResponse.json({ success: true, keyword }, { status: 201 });
}

// PUT /api/keywords — update keyword (toggle active, rename, etc.)
export async function PUT(request) {
  const body = await request.json();
  const list = updateKeyword(body.id, body);
  return NextResponse.json({ success: true, keywords: list });
}

// DELETE /api/keywords
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const list = deleteKeyword(id);
  return NextResponse.json({ success: true, keywords: list });
}
