import { getBill, getBillText, decodeText, getMasterList, getSessionList } from './legiscan.js';
import { saveBill, saveTextVersion, loadTextVersion, listTextVersions, saveDiff, addAlert, getKeywords } from './store.js';
import { computeDiff, stripHtml, summarizeDiff } from './diff-engine.js';
import { getSettings } from './settings.js';

/**
 * Ingest a single bill: fetch detail, texts, compute diffs, and check keywords.
 * @param {number} billId - LegiScan bill ID
 * @returns {Promise<object>} Ingestion result
 */
export async function ingestBill(billId) {
  const bill = await getBill(billId);
  if (!bill) return { error: 'Bill not found' };

  // Save bill metadata
  saveBill({
    id: bill.bill_id,
    number: bill.bill_number,
    title: bill.title,
    description: bill.description,
    jurisdiction: bill.state,
    session: bill.session?.session_title || '',
    status: bill.status,
    statusDate: bill.status_date,
    lastActionDate: bill.last_action_date,
    lastAction: bill.last_action,
    url: bill.url,
    stateLink: bill.state_link,
    sponsors: bill.sponsors || [],
    subjects: bill.subjects || [],
    history: bill.history || [],
  });

  // Fetch and save text versions
  const newVersions = [];
  const texts = bill.texts || [];

  for (const textInfo of texts) {
    const existing = loadTextVersion(bill.bill_id, textInfo.doc_id);
    if (existing) continue; // Already have this version

    try {
      const textData = await getBillText(textInfo.doc_id);
      if (textData && textData.doc) {
        const decoded = decodeText(textData.doc);
        const plainText = stripHtml(decoded);
        saveTextVersion(bill.bill_id, textInfo.doc_id, plainText, {
          date: textInfo.date,
          type: textInfo.type,
          mime: textInfo.mime,
          rawHtml: decoded.slice(0, 50000), // cap storage
        });
        newVersions.push({ docId: textInfo.doc_id, type: textInfo.type, date: textInfo.date });
      }
    } catch (err) {
      console.error(`Failed to fetch text ${textInfo.doc_id}:`, err.message);
    }
  }

  // Compute diffs between consecutive versions
  const allVersions = listTextVersions(bill.bill_id);
  const newDiffs = [];

  for (let i = 1; i < allVersions.length; i++) {
    const prev = allVersions[i - 1];
    const curr = allVersions[i];
    
    // Check if we already have this diff
    const existingDiff = loadTextVersion(bill.bill_id, `diff_${prev.docId}_${curr.docId}`);
    if (existingDiff) continue;

    if (prev.text && curr.text) {
      const diffResult = computeDiff(prev.text, curr.text);
      saveDiff(bill.bill_id, prev.docId, curr.docId, {
        ...diffResult,
        oldType: prev.type,
        newType: curr.type,
        oldDate: prev.date,
        newDate: curr.date,
      });
      newDiffs.push({
        from: prev.type,
        to: curr.type,
        stats: diffResult.stats,
      });

      // Create alert if there are changes
      if (diffResult.stats.additions > 0 || diffResult.stats.removals > 0) {
        addAlert({
          type: 'change',
          billId: bill.bill_id,
          billNumber: bill.bill_number,
          title: `${bill.bill_number} text changed`,
          message: `${summarizeDiff(diffResult)} between ${prev.type || 'version'} and ${curr.type || 'version'}`,
        });
      }
    }
  }

  // Check keywords
  checkKeywordMatches(bill);

  return {
    billId: bill.bill_id,
    billNumber: bill.bill_number,
    newVersions: newVersions.length,
    newDiffs: newDiffs.length,
    totalVersions: allVersions.length,
  };
}

/**
 * Check if a bill matches any tracked keywords and create alerts.
 */
function checkKeywordMatches(bill) {
  const keywords = getKeywords().filter(k => k.active);
  const searchable = `${bill.title} ${bill.description || ''} ${bill.bill_number}`.toLowerCase();

  for (const kw of keywords) {
    const term = (kw.term || kw.keyword || '').toLowerCase();
    if (term && searchable.includes(term)) {
      addAlert({
        type: 'keyword',
        billId: bill.bill_id,
        billNumber: bill.bill_number,
        keyword: kw.term || kw.keyword,
        title: `Keyword match: "${kw.term || kw.keyword}"`,
        message: `${bill.bill_number} — ${bill.title}`,
      });
    }
  }
}

/**
 * Ingest bills from the master list of a state's current session.
 * @param {string} state - Two-letter state code
 * @param {number} [limit=20] - Max bills to ingest per run
 */
export async function ingestState(state, limit = 20) {
  const settings = getSettings();
  if (!settings.legiscanApiKey) {
    throw new Error('LegiScan API key not configured.');
  }

  const sessions = await getSessionList(state);
  if (!sessions || sessions.length === 0) {
    return { error: `No sessions found for ${state}`, results: [] };
  }

  const currentSession = Array.isArray(sessions)
    ? sessions[0]
    : Object.values(sessions).find(s => typeof s === 'object');

  if (!currentSession?.session_id) {
    return { error: 'Could not determine current session', results: [] };
  }

  const { bills: masterBills } = await getMasterList(currentSession.session_id);
  const results = [];

  // Ingest up to `limit` bills that have changed or are new
  const toIngest = masterBills.slice(0, limit);

  for (const billSummary of toIngest) {
    try {
      const result = await ingestBill(billSummary.bill_id);
      results.push(result);
    } catch (err) {
      results.push({ billId: billSummary.bill_id, error: err.message });
    }
  }

  return {
    state,
    session: currentSession.session_title,
    totalInSession: masterBills.length,
    ingested: results.length,
    results,
  };
}
