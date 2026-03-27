import { NextResponse } from 'next/server';
import { getAlerts, markAlertRead, markAllAlertsRead } from '@/lib/store';

// GET /api/alerts
export async function GET() {
  const alerts = getAlerts();
  const unread = alerts.filter(a => !a.read).length;
  return NextResponse.json({ alerts, total: alerts.length, unread });
}

// PUT /api/alerts — mark alert(s) as read
export async function PUT(request) {
  const body = await request.json();
  if (body.all) {
    const list = markAllAlertsRead();
    return NextResponse.json({ success: true, alerts: list });
  } else if (body.id) {
    const list = markAlertRead(body.id);
    return NextResponse.json({ success: true, alerts: list });
  }
  return NextResponse.json({ error: 'Provide id or all:true' }, { status: 400 });
}
