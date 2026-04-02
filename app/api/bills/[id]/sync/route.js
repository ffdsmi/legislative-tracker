import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/session';
import { getSettings } from '@/lib/settings';
import { loadBill } from '@/lib/store';
import { getBill } from '@/lib/legiscan';
import { ingestBill } from '@/lib/ingest';

export async function POST(request, { params }) {
  try {
    const session = await requireSession();
    const settings = await getSettings(session.workspaceId);
    if (!settings.legiscanApiKey) {
      return NextResponse.json({ error: 'LegiScan API key not configured.' }, { status: 400 });
    }

    const { id } = await params;
    
    // 1. Fetch live Bill from LegiScan to get the real-time `change_hash` footprint
    const liveBill = await getBill(session.workspaceId, id);
    if (!liveBill) {
      return NextResponse.json({ error: 'Bill not found on LegiScan' }, { status: 404 });
    }
    
    // 2. Load our local version
    const localBill = await loadBill(session.workspaceId, id);
    
    // 3. Compare their exact data hashes. If they match completely, save our network/CPU usage.
    if (localBill && localBill.changeHash === liveBill.change_hash) {
      return NextResponse.json({ success: true, updated: false, message: 'Data is fully up to date.' });
    }
    
    // 4. If hashes mismatched, or bill does not exist locally (fallback error trap), run the intensive Ingest function
    console.log(`[API] Manual Sync triggered for ${id}. Hash mismatched (${localBill?.changeHash} -> ${liveBill.change_hash}). Executing deep ingest...`);
    const ingestResult = await ingestBill(session.workspaceId, id);
    
    return NextResponse.json({
      success: true,
      updated: true,
      message: 'New data retrieved and saved locally.',
      details: ingestResult
    });

  } catch (err) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
