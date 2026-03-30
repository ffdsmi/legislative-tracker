import { NextResponse } from 'next/server';
import { startScheduler, stopScheduler, getSchedulerStatus } from '@/lib/scheduler';
import { requireSession } from '@/lib/session';

// GET /api/scheduler — get current scheduler status
export async function GET() {
  try {
    const session = await requireSession();
    // For now, any authenticated user can view status
    return NextResponse.json(getSchedulerStatus());
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/scheduler — start or stop the scheduler
export async function POST(request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      const result = await startScheduler();
      return NextResponse.json(result);
    }

    if (action === 'stop') {
      const result = stopScheduler();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action. Use "start" or "stop".' }, { status: 400 });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

