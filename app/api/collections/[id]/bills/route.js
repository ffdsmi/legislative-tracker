import { NextResponse } from 'next/server';
import { getCollectionBills, addBillToCollection, removeBillFromCollection } from '@/lib/collections';
import { requireSession } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const bills = await getCollectionBills(session.workspaceId, id);
    return NextResponse.json({ bills, total: bills.length });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    await addBillToCollection(session.workspaceId, id, body.billId, {
      billNumber: body.billNumber,
      billTitle: body.billTitle,
      jurisdiction: body.jurisdiction,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    if (!billId) {
      return NextResponse.json({ error: 'billId is required' }, { status: 400 });
    }
    await removeBillFromCollection(session.workspaceId, id, billId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

