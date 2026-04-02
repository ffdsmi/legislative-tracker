import { NextResponse } from 'next/server';
import { getAnnotations, createAnnotation, deleteAnnotation } from '@/lib/annotations';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const annotations = await getAnnotations(session.workspaceId, billId);
    return NextResponse.json({ annotations, total: annotations.length });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { billId, versionDocId, startOffset, endOffset, selectedText, note } = body;
    
    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }
    
    const annotation = await createAnnotation(session.workspaceId, { billId, versionDocId, startOffset, endOffset, selectedText, note });
    return NextResponse.json({ annotation });
  } catch (err) {
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
    
    await deleteAnnotation(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

