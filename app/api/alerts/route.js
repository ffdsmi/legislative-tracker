import { NextResponse } from 'next/server';
import { getAlerts, markAlertRead, markAllAlertsRead, updateAlertsRead } from '@/lib/store';
import { db } from '@/lib/db';
import { requireSession } from '@/lib/session';

// GET /api/alerts
export async function GET() {
  try {
    const session = await requireSession();
    const alerts = await getAlerts(session.workspaceId);
    const unread = alerts.filter(a => !a.read).length;
    return NextResponse.json({ alerts, total: alerts.length, unread });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PUT /api/alerts — mark alert(s) as read
export async function PUT(request) {
  try {
    const session = await requireSession();
    const body = await request.json();

    if (body.all) {
      const list = await markAllAlertsRead(session.workspaceId);
      return NextResponse.json({ success: true, alerts: list });
    } else if (body.ids && Array.isArray(body.ids)) {
      const list = await updateAlertsRead(session.workspaceId, body.ids, body.read !== undefined ? body.read : true);
      return NextResponse.json({ success: true, alerts: list });
    } else if (body.id) {
      const targetState = body.read !== undefined ? body.read : true;
      const list = await markAlertRead(session.workspaceId, body.id, targetState);
      return NextResponse.json({ success: true, alerts: list });
    }
    return NextResponse.json({ error: 'Provide id, ids, or all:true' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE /api/alerts — delete read alerts or specific alert
export async function DELETE(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // 'read' = delete all read, 'id' = delete specific
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (mode === 'read') {
      await db.alert.deleteMany({
        where: { workspaceId: session.workspaceId, read: true }
      });
    } else if (id) {
      await db.alert.deleteMany({
        where: { workspaceId: session.workspaceId, id }
      });
    } else if (idsParam) {
      const ids = idsParam.split(',');
      await db.alert.deleteMany({
        where: { workspaceId: session.workspaceId, id: { in: ids } }
      });
    } else {
      return NextResponse.json({ error: 'Provide mode=read, id=..., or ids=...' }, { status: 400 });
    }

    const alerts = await getAlerts(session.workspaceId);
    const unread = alerts.filter(a => !a.read).length;
    return NextResponse.json({ success: true, alerts, total: alerts.length, unread });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

