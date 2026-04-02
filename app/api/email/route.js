import { NextResponse } from 'next/server';
import { testEmailConfig, sendDigest, buildDigestHtml } from '@/lib/email';
import { requireSession } from '@/lib/session';

export async function POST(req) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop(); // 'test' or 'digest' // Wait the route is /api/email, so pop() is "email". No wait, the route is /api/email/route.js. Let's fix that.

    // Actually the action was parsed from url.pathname.split('/').pop(). 
    // If the path is /api/email/test it would be test, but this file is app/api/email/route.js.
    // So /api/email doesn't have an action at the end. I will check searchParams instead.
    const actionParam = url.searchParams.get('action') || 'test';

    if (actionParam === 'test') {
      const body = await req.json(); // Accept temp settings from UI
      await testEmailConfig(session.workspaceId, body);
      return NextResponse.json({ success: true, message: 'Test email sent successfully' });
    }

    if (actionParam === 'digest') {
      const body = await req.json();
      const result = await sendDigest(session.workspaceId, body.data || {});
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Generate a dummy preview body
    const sampleData = {
      matches: [{ jurisdiction: 'NE', number: 'LB123', title: 'Example Keyword Match Bill' }],
      changedBills: [{ jurisdiction: 'NE', number: 'LB456', title: 'Example Changed Bill', reason: 'Amended in Committee' }],
      upcomingEvents: [{ date: '2026-04-15', time: '10:00', description: 'Sample Hearing', location: 'Room 1113' }],
      newBills: [{ jurisdiction: 'US', number: 'HR 101', title: 'New Federal Tracked Bill' }]
    };

    const html = buildDigestHtml(sampleData);
    
    // Return HTML proper content type
    return new NextResponse(html || 'No preview content available', {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (err) {
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

