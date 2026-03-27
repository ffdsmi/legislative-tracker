import { NextResponse } from 'next/server';
import { searchBills, getSessionList, getMasterList } from '@/lib/legiscan';
import { getSettings } from '@/lib/settings';

// GET /api/bills — search or list bills from LegiScan
export async function GET(request) {
  const settings = getSettings();
  if (!settings.legiscanApiKey) {
    return NextResponse.json(
      { error: 'LegiScan API key not configured. Go to Settings to add your key.', bills: [] },
      { status: 200 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const state = searchParams.get('state') || 'NE';

  try {
    if (search) {
      // Search mode
      const result = await searchBills(search, { state: state === 'ALL' ? '' : state });
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
      const sessions = await getSessionList(state);
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

      const { session, bills: masterBills } = await getMasterList(currentSession.session_id);

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
        session: session,
        source: 'masterlist',
        showing: bills.length,
      });
    }
  } catch (err) {
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
