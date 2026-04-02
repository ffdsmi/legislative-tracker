import { NextResponse } from 'next/server';
import { getBillTags, addTagToBill, removeTagFromBill } from '@/lib/tags';
import { requireSession } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const billTags = await getBillTags(session.workspaceId, id);
    return NextResponse.json({ billTags });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    await addTagToBill(session.workspaceId, id, body.tagId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');
    if (!tagId) {
      return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
    }
    await removeTagFromBill(session.workspaceId, id, tagId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

