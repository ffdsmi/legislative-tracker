import { NextResponse } from 'next/server';
import { getMarkups, createMarkup, deleteMarkup } from '@/lib/markups';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const versionDocId = searchParams.get('versionDocId');

    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }

    const markups = await getMarkups(session.workspaceId, billId, versionDocId);
    return NextResponse.json({ markups });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    if (!body.billId || !body.selectedText || !body.type) {
      return NextResponse.json({ error: 'billId, selectedText, and type are required' }, { status: 400 });
    }
    const markup = await createMarkup(session.workspaceId, body);
    return NextResponse.json({ markup });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    await deleteMarkup(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

