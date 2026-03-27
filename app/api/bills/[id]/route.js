import { NextResponse } from 'next/server';
import { getBill, getBillText, decodeText } from '@/lib/legiscan';
import { getSettings } from '@/lib/settings';

// GET /api/bills/[id] — get full bill detail from LegiScan
export async function GET(request, { params }) {
  const settings = getSettings();
  if (!settings.legiscanApiKey) {
    return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 200 });
  }

  const { id } = await params;

  try {
    const bill = await getBill(id);
    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    // Fetch text for each version if available
    const versions = [];
    if (bill.texts && bill.texts.length > 0) {
      // Only fetch text for the first 3 versions to save API calls
      for (const textInfo of bill.texts.slice(0, 3)) {
        try {
          const textData = await getBillText(textInfo.doc_id);
          versions.push({
            docId: textInfo.doc_id,
            date: textInfo.date,
            type: textInfo.type,
            mimeType: textInfo.mime,
            url: textInfo.state_link || textInfo.url,
            text: textData ? decodeText(textData.doc) : null,
            mimeId: textData ? textData.mime : null,
          });
        } catch {
          versions.push({
            docId: textInfo.doc_id,
            date: textInfo.date,
            type: textInfo.type,
            url: textInfo.state_link || textInfo.url,
            text: null,
            error: 'Could not fetch text',
          });
        }
      }
    }

    return NextResponse.json({
      bill: {
        id: bill.bill_id,
        number: bill.bill_number,
        title: bill.title,
        description: bill.description,
        jurisdiction: bill.state,
        session: bill.session?.session_title || '',
        status: bill.status,
        statusDate: bill.status_date,
        introducedDate: bill.history?.[0]?.date || '',
        lastActionDate: bill.last_action_date,
        lastAction: bill.last_action,
        url: bill.url,
        stateLink: bill.state_link,
        sponsors: (bill.sponsors || []).map((s) => ({
          name: s.name,
          party: s.party,
          role: s.role,
          district: s.district,
        })),
        history: (bill.history || []).map((h) => ({
          date: h.date,
          action: h.action,
          chamber: h.chamber,
        })),
        votes: (bill.votes || []).map((v) => ({
          date: v.date,
          desc: v.desc,
          yea: v.yea,
          nay: v.nay,
          absent: v.absent,
        })),
        subjects: bill.subjects || [],
      },
      versions,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 200 });
  }
}
