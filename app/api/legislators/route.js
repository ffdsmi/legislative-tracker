import { NextResponse } from 'next/server';
import { listLegislators, getLegislator, getLegislatorBills, saveLegislator } from '@/lib/legislators';
import { getSessionPeople } from '@/lib/legiscan';
import { getSettings } from '@/lib/settings';
import { requireSession } from '@/lib/session';

export async function GET(req) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const chamber = searchParams.get('chamber');
    const id = searchParams.get('id');

    if (id) {
      const leg = await getLegislator(session.workspaceId, id);
      if (!leg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const bills = await getLegislatorBills(session.workspaceId, id);
      return NextResponse.json({ legislator: leg, sponsoredBills: bills.map(b => ({ id: b.id, number: b.number, title: b.title, statusDate: b.statusDate })) });
    }

    const filters = {};
    if (search) filters.search = search;
    if (state) filters.state = state;
    if (party) filters.party = party;
    if (chamber) filters.chamber = chamber;

    const legislators = await listLegislators(session.workspaceId, filters);
    return NextResponse.json({ legislators });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await requireSession();
    const { sessionId, state } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    const peopleResponse = await getSessionPeople(session.workspaceId, sessionId);
    const people = Array.isArray(peopleResponse) ? peopleResponse : Object.values(peopleResponse).filter(v => typeof v === 'object' && v.people_id);

    let updated = 0;
    for (const person of people) {
      await saveLegislator(session.workspaceId, {
        peopleId: person.people_id,
        name: person.name,
        firstName: person.first_name,
        lastName: person.last_name,
        party: person.party_id === '1' ? 'D' : person.party_id === '2' ? 'R' : 'I', // Mapping might vary
        role: person.role,
        district: person.district,
        state: state || person.state,
        sponsoredBillIds: []
      });
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

