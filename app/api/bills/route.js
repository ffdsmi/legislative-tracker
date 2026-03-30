import { NextResponse } from 'next/server';
import { searchBills, getSessionList, getMasterList } from '@/lib/legiscan';
import { getSettings } from '@/lib/settings';
import { listBills } from '@/lib/store';
import { requireSession } from '@/lib/session';

// GET /api/bills — search or list bills from LegiScan (or local store)
export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');

    // Return locally stored bills (for testimony bill picker)
    if (source === 'local') {
      const dbBills = await listBills(session.workspaceId);
      const bills = dbBills.map(b => ({
        id: b.id,
        number: b.number,
        title: b.title,
        jurisdiction: b.jurisdiction,
        status: b.status,
      }));
      return NextResponse.json({ bills, total: bills.length, source: 'local' });
    }

    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json(
        { error: 'LegiScan API key not configured. Go to Settings to add your key.', bills: [] },
        { status: 200 }
      );
    }

    const search = searchParams.get('search') || '';
    const state = searchParams.get('state') || 'NE';

    if (search) {
      // Search mode
      const result = await searchBills(session.workspaceId, search, { state: state === 'ALL' ? '' : state });
      const bills = [];
      for (const [key, value] of Object.entries(result)) {
        if (key !== 'summary' && typeof value === 'object' && value.bill_id) {
          bills.push({
            id: value.bill_id,
            number: value.bill_number,
            title: value.title,
            jurisdiction: value.state,
            status: statusLabel(value.status) || 'Unknown',
            lastAction: value.last_action_date || '',
            lastActionText: value.last_action || '',
            relevance: value.relevance,
            url: value.url,
          });
        }
      }
      const summary = result.summary || {};
      return NextResponse.json({ bills, total: summary.count || bills.length, source: 'search' });
    } else {
      // Master list mode — get current session bills
      const sessions = await getSessionList(session.workspaceId, state);
      if (!sessions || sessions.length === 0) {
        return NextResponse.json({ bills: [], total: 0, error: `No sessions found for state: ${state}` });
      }

      // Get the most recent session
      const currentSession = Array.isArray(sessions)
        ? sessions[0]
        : Object.values(sessions).find(s => typeof s === 'object');

      if (!currentSession || !currentSession.session_id) {
        return NextResponse.json({ bills: [], total: 0, error: 'Could not determine current session' });
      }

      const { session: masterSession, bills: masterBills } = await getMasterList(session.workspaceId, currentSession.session_id);

      const bills = masterBills.slice(0, 50).map((b) => ({
        id: b.bill_id,
        number: b.number,
        title: b.title,
        jurisdiction: state,
        status: statusLabel(b.status),
        lastAction: b.last_action_date || '',
        lastActionText: b.last_action || '',
        url: b.url,
      }));

      return NextResponse.json({
        bills,
        total: masterBills.length,
        session: masterSession,
        source: 'masterlist',
        showing: bills.length,
      });
    }
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message, bills: [] }, { status: 200 });
  }
}

function statusLabel(statusCode) {
  const map = {
    1: 'Introduced',
    2: 'Engrossed',
    3: 'Enrolled',
    4: 'Passed',
    5: 'Vetoed',
    6: 'Failed',
  };
  return map[statusCode] || `Status ${statusCode}`;
}

export const dynamic = 'force-dynamic';

