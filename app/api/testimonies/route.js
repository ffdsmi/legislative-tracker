import { NextResponse } from 'next/server';
import { listTestimonies, getTestimony, createTestimony, updateTestimony, deleteTestimony } from '@/lib/testimonies';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const id = searchParams.get('id');

    if (id) {
      const testimony = await getTestimony(session.workspaceId, id);
      if (!testimony) return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
      return NextResponse.json({ testimony });
    }

    const testimonies = await listTestimonies(session.workspaceId, billId);
    return NextResponse.json({ testimonies, total: testimonies.length });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const testimony = await createTestimony(session.workspaceId, session.userId, body);
    return NextResponse.json({ testimony });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const { id, ...updates } = body;
    const testimony = await updateTestimony(session.workspaceId, id, updates);
    if (!testimony) return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
    return NextResponse.json({ testimony });
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
    await deleteTestimony(session.workspaceId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

