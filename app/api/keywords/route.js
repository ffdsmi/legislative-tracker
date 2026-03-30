import { NextResponse } from 'next/server';
import { getKeywords, addKeyword, updateKeyword, deleteKeyword } from '@/lib/store';
import { requireSession } from '@/lib/session';

// GET /api/keywords
export async function GET() {
  try {
    const session = await requireSession();
    const keywords = await getKeywords(session.workspaceId);
    return NextResponse.json({ keywords, total: keywords.length });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST /api/keywords — create keyword
export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const keyword = await addKeyword(session.workspaceId, {
      term: body.term || body.keyword,
      jurisdiction: body.jurisdiction || 'ALL',
    });
    return NextResponse.json({ success: true, keyword }, { status: 201 });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT /api/keywords — update keyword (toggle active, rename, etc.)
export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const list = await updateKeyword(session.workspaceId, body.id, body);
    return NextResponse.json({ success: true, keywords: list });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/keywords
export async function DELETE(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const list = await deleteKeyword(session.workspaceId, id);
    return NextResponse.json({ success: true, keywords: list });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export const dynamic = 'force-dynamic';

