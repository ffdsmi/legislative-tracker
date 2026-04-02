import { NextResponse } from 'next/server';
import { getTags, createTag, deleteTag } from '@/lib/tags';
import { requireSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireSession();
    const tags = await getTags(session.workspaceId);
    return NextResponse.json({ tags, total: tags.length });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const tag = await createTag(session.workspaceId, { name: body.name, color: body.color });
    return NextResponse.json({ tag });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 400 });
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
    await deleteTag(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

