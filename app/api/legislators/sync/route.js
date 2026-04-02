import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { saveLegislator, getLegislator } from '@/lib/legislators';
import { requireSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';

export async function POST() {
  try {
    const session = await requireSession();
    const workspaceId = session.workspaceId;
    const settings = await getSettings(workspaceId);
    const osKey = settings?.openStatesApiKey;

    const billsDir = path.join(process.cwd(), '.data', 'bills');
    if (!fs.existsSync(billsDir)) {
      return NextResponse.json({ success: true, count: 0 });
    }
    
    const files = fs.readdirSync(billsDir).filter(f => f.endsWith('.json'));
    
    // First Pass: Aggregate unique sponsors across all 1800+ bills and perfectly assemble their sponsoredBillIds lists
    const uniqueSponsorsMap = new Map();
    for (const file of files) {
      const billData = JSON.parse(fs.readFileSync(path.join(billsDir, file), 'utf-8'));
      if (billData.sponsors && Array.isArray(billData.sponsors)) {
        for (const sp of billData.sponsors) {
          if (sp.people_id) {
            if (!uniqueSponsorsMap.has(sp.people_id)) {
              uniqueSponsorsMap.set(sp.people_id, {
                ...sp,
                state: billData.jurisdiction || billData.state,
                bill_ids: new Set()
              });
            }
            uniqueSponsorsMap.get(sp.people_id).bill_ids.add(billData.id || billData.bill_id);
          }
        }
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (payload) => {
          controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
        };

        try {
          const totalSponsors = uniqueSponsorsMap.size;
          sendUpdate({ type: 'start', message: `Found ${totalSponsors} unique legislators. Synchronizing...` });

          // Second Pass: Process each unique legislator EXACTLY ONCE
          let count = 0;
          const resolvedCache = {};

          for (const sp of uniqueSponsorsMap.values()) {
            count++;
            sendUpdate({ 
              type: 'progress', 
              current: count, 
              total: totalSponsors, 
              message: `Syncing ${sp.name} (${sp.state})...` 
            });

            let imageUrl = null;
            if (sp.bioguide_id) {
              imageUrl = `https://bioguide.congress.gov/bioguide/photo/${sp.bioguide_id.charAt(0)}/${sp.bioguide_id}.jpg`;
            } else if (osKey && sp.state && sp.state !== 'US') {
               // We only need to check DB/API once per person now
               const existing = await getLegislator(workspaceId, sp.people_id);
               const REFRESH_MS = 21 * 24 * 60 * 60 * 1000;
               const isStale = !existing?.imageUpdatedAt || (Date.now() - new Date(existing.imageUpdatedAt).getTime() > REFRESH_MS);

               let apiChecked = false;
               if (!isStale) {
                 imageUrl = existing?.imageUrl || null;
               } else {
                 apiChecked = true;
                 try {
                   let osData = null;
                   const url = `https://v3.openstates.org/people?jurisdiction=${sp.state}&name=${encodeURIComponent(sp.name)}`;
                   const osRes = await fetch(url, { headers: { 'X-API-KEY': osKey }});
                   if (osRes.ok) { osData = await osRes.json(); }

                   if ((!osData || !osData.results || osData.results.length === 0) && sp.last_name) {
                     const fallbackUrl = `https://v3.openstates.org/people?jurisdiction=${sp.state}&name=${encodeURIComponent(sp.last_name)}`;
                     const fbRes = await fetch(fallbackUrl, { headers: { 'X-API-KEY': osKey }});
                     if (fbRes.ok) {
                       const fbData = await fbRes.json();
                       if (fbData.results && fbData.results.length === 1) { osData = fbData; }
                     }
                   }
                   if (osData && osData.results && osData.results.length > 0 && osData.results[0].image) {
                     imageUrl = osData.results[0].image;
                   }
                 } catch (e) {
                   console.error("OpenStates Fetch Error:", e.message);
                 }
               }
               resolvedCache[sp.people_id] = { imageUrl: imageUrl || 'NOT_FOUND', apiChecked };
               
               const cached = resolvedCache[sp.people_id];
               imageUrl = cached?.imageUrl || imageUrl;
               if (imageUrl === 'NOT_FOUND') imageUrl = null;
            }

            const legPayload = {
              peopleId: sp.people_id,
              name: sp.name,
              firstName: sp.first_name,
              lastName: sp.last_name,
              party: sp.party_id === 1 ? 'D' : sp.party_id === 2 ? 'R' : sp.party_id === 3 ? 'I' : sp.party || 'I',
              role: sp.role,
              district: String(sp.district || ''),
              state: sp.state,
              imageUrl: imageUrl,
              sponsoredBillIds: Array.from(sp.bill_ids)
            };
            
            if (sp.bioguide_id || resolvedCache[sp.people_id]?.apiChecked) {
               legPayload.imageUpdatedAt = new Date();
            }

            await saveLegislator(workspaceId, legPayload);
          }

          sendUpdate({ type: 'done', result: { success: true, count } });
        } catch (err) {
          sendUpdate({ type: 'error', message: err.message });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

