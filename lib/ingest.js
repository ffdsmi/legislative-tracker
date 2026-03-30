import { getBill, getBillText, decodeText, getMasterList, getSessionList, getDatasetList, getDataset } from './legiscan.js';
import { saveBill, loadBill, saveTextVersion, loadTextVersion, listTextVersions, saveDiff, loadDiff, addAlert, getKeywords, loadDatasetTracker, saveDatasetTracker } from './store.js';
import AdmZip from 'adm-zip';
import { computeDiff, stripHtml, summarizeDiff } from './diff-engine.js';
import { isPdfContent, extractPdfText } from './pdf-extract.js';
import { getSettings } from './settings.js';
import { enrichBill } from './congress.js';

/**
 * Ingest a single bill: fetch detail, texts, compute diffs, and check keywords.
 * @param {string} workspaceId
 * @param {number|string} billId - LegiScan bill ID
 * @returns {Promise<object>} Ingestion result
 */
export async function ingestBill(workspaceId, billId) {
  const bill = await getBill(workspaceId, billId);
  if (!bill) return { error: 'Bill not found' };

  // Save bill metadata
  await saveBill(workspaceId, {
    id: String(bill.bill_id),
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
    calendar: bill.calendar || [],
    texts: bill.texts || [],
    votes: bill.votes || [],
    amendments: bill.amendments || [],
    supplements: bill.supplements || [],
  });

  // Phase 4: Auto-populate legislators from sponsors
  try {
    const { saveLegislator } = await import('./legislators.js');
    if (bill.sponsors && Array.isArray(bill.sponsors)) {
      for (const sp of bill.sponsors) {
        if (sp.people_id) {
          await saveLegislator(workspaceId, {
            peopleId: sp.people_id,
            name: sp.name,
            party: sp.party_id === 1 ? 'D' : sp.party_id === 2 ? 'R' : sp.party_id === 3 ? 'I' : sp.party || 'I',
            role: sp.role,
            district: sp.district,
            state: bill.state,
            sponsoredBillIds: [String(bill.bill_id)],
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync sponsors to directory:', err.message);
  }

  // Fetch and save text versions
  const newVersions = [];
  const texts = bill.texts || [];

  for (const textInfo of texts) {
    const existing = await loadTextVersion(workspaceId, bill.bill_id, textInfo.doc_id);
    if (existing) continue; // Already have this version

    try {
      const textData = await getBillText(workspaceId, textInfo.doc_id);
      if (textData && textData.doc) {
        const decoded = decodeText(textData.doc);
        
        // Detect content type and extract clean text
        let plainText;
        if (isPdfContent(decoded)) {
          // PDF content: extract text from PDF binary
          const pdfBuffer = Buffer.from(textData.doc, 'base64');
          plainText = await extractPdfText(pdfBuffer);
        } else {
          // HTML content: strip tags
          plainText = stripHtml(decoded);
        }

        await saveTextVersion(workspaceId, bill.bill_id, textInfo.doc_id, plainText, {
          date: textInfo.date,
          type: textInfo.type,
          mime: textInfo.mime,
        });
        newVersions.push({ docId: textInfo.doc_id, type: textInfo.type, date: textInfo.date });
      }
    } catch (err) {
      console.error(`Failed to fetch text ${textInfo.doc_id}:`, err.message);
    }
  }

  // Compute diffs between consecutive versions
  const allVersions = await listTextVersions(workspaceId, bill.bill_id);
  const newDiffs = [];

  for (let i = 1; i < allVersions.length; i++) {
    const prev = allVersions[i - 1];
    const curr = allVersions[i];
    
    // Check if we already have this diff
    const existingDiff = await loadDiff(workspaceId, bill.bill_id, prev.docId, curr.docId);
    if (existingDiff) continue;

    if (prev.text && curr.text) {
      const diffResult = computeDiff(prev.text, curr.text);
      await saveDiff(workspaceId, bill.bill_id, prev.docId, curr.docId, {
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
        await addAlert(workspaceId, {
          type: 'change',
          billId: String(bill.bill_id),
          billNumber: bill.bill_number,
          title: `${bill.bill_number} text changed`,
          message: `${summarizeDiff(diffResult)} between ${prev.type || 'version'} and ${curr.type || 'version'}`,
        });
      }
    }
  }

  // Check keywords (only if this is a new bill or has new versions)
  if (newVersions.length > 0 || newDiffs.length > 0) {
    await checkKeywordMatches(workspaceId, bill);
  }

  // Congress.gov enrichment for federal bills
  let enrichmentData = null;
  if (bill.state === 'US') {
    try {
      const savedBill = await loadBill(workspaceId, bill.bill_id);
      const enriched = await enrichBill(workspaceId, {
        ...savedBill,
        number: bill.bill_number,
        jurisdiction: bill.state,
      });
      if (enriched.crsSummary || enriched.amendmentCount) {
        await saveBill(workspaceId, {
          id: String(bill.bill_id),
          crsSummary: enriched.crsSummary,
          amendmentCount: enriched.amendmentCount,
          enrichedAt: enriched.enrichedAt,
        });
        enrichmentData = {
          hasSummary: !!enriched.crsSummary,
          amendmentCount: enriched.amendmentCount,
        };
      }
    } catch (err) {
      console.error(`Congress.gov enrichment failed for ${bill.bill_number}:`, err.message);
    }
  }

  return {
    billId: bill.bill_id,
    billNumber: bill.bill_number,
    newVersions: newVersions.length,
    newDiffs: newDiffs.length,
    totalVersions: allVersions.length,
    enrichment: enrichmentData,
  };
}

/**
 * Check if a bill matches any tracked keywords and create alerts.
 */
async function checkKeywordMatches(workspaceId, bill) {
  const keywords = await getKeywords(workspaceId);
  const activeKeywords = keywords.filter(k => k.active);
  const searchable = `${bill.title} ${bill.description || ''} ${bill.bill_number}`.toLowerCase();

  for (const kw of activeKeywords) {
    const term = (kw.term || kw.keyword || '').toLowerCase();
    if (term && searchable.includes(term)) {
      await addAlert(workspaceId, {
        type: 'keyword',
        billId: String(bill.bill_id),
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
 * Uses change_hash to skip bills that haven't changed since last ingestion.
 * @param {string} workspaceId
 * @param {string} state - Two-letter state code
 * @param {number} [limit=20] - Max bills to ingest per run
 */
export async function ingestState(workspaceId, state, limit = 20) {
  const settings = await getSettings(workspaceId);
  if (!settings.legiscanApiKey) {
    throw new Error('LegiScan API key not configured.');
  }

  const sessions = await getSessionList(workspaceId, state);
  if (!sessions || sessions.length === 0) {
    return { error: `No sessions found for ${state}`, results: [] };
  }

  const currentSession = Array.isArray(sessions)
    ? sessions[0]
    : Object.values(sessions).find(s => typeof s === 'object');

  if (!currentSession?.session_id) {
    return { error: 'Could not determine current session', results: [] };
  }

  // Phase A: LegiScan Hybrid Dataset Intercept
  try {
    const datasetTracker = await loadDatasetTracker(workspaceId);
    const datasets = await getDatasetList(workspaceId, state);
    const activeDataset = datasets.find(d => d.session_id === currentSession.session_id);
    
    if (activeDataset && activeDataset.dataset_hash) {
      if (datasetTracker[`${state}_${currentSession.session_id}`] !== activeDataset.dataset_hash) {
        console.log(`[LegiScan] New bulk dataset detected for ${state}. Initiating Base64 Intercept...`);
        const datasetPayload = await getDataset(workspaceId, activeDataset.access_key);
        if (datasetPayload && datasetPayload.zip) {
          const buffer = Buffer.from(datasetPayload.zip, 'base64');
          const zip = new AdmZip(buffer);
          const zipEntries = zip.getEntries();
          
          let bulkExtracted = 0;
          for (const entry of zipEntries) {
            if (!entry.isDirectory && entry.entryName.includes('bill/') && entry.entryName.endsWith('.json')) {
              const content = entry.getData().toString('utf8');
              const data = JSON.parse(content);
              if (data && data.bill) {
                const bill = data.bill;
                await saveBill(workspaceId, {
                  id: String(bill.bill_id),
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
                  calendar: bill.calendar || [],
                  texts: bill.texts || [],
                  votes: bill.votes || [],
                  amendments: bill.amendments || [],
                  supplements: bill.supplements || [],
                  changeHash: bill.change_hash
                });
                bulkExtracted++;
              }
            }
          }
          console.log(`[LegiScan] Bulk Extraction complete: mapped ${bulkExtracted} bills locally.`);
          // Save active tracker
          datasetTracker[`${state}_${currentSession.session_id}`] = activeDataset.dataset_hash;
          await saveDatasetTracker(workspaceId, datasetTracker);
        }
      }
    }
  } catch (err) {
    console.warn(`[LegiScan] Auto-Dataset Phase A skipped: ${err.message}. Resuming standard Delta fetch...`);
  }

  // Phase B: Central Delta Polishing
  const { bills: masterBills } = await getMasterList(workspaceId, currentSession.session_id);
  const results = [];
  let skipped = 0;
  let updated = 0;

  // Sort master list by last_action_date descending to ensure we track the newest/most active bills first
  if (masterBills && Array.isArray(masterBills)) {
    masterBills.sort((a, b) => {
      const dateA = a.last_action_date ? new Date(a.last_action_date) : new Date(0);
      const dateB = b.last_action_date ? new Date(b.last_action_date) : new Date(0);
      return dateB - dateA;
    });

    // Exhaustive Delta Tracker: Iterate across 100% of the active session's master list
    // The system relies strictly on `change_hash` alignment to bypass API limits rather than an arbitrary subset
    const toCheck = masterBills;

    for (const billSummary of toCheck) {
      // Compare change_hash with stored bill to detect changes
      const stored = await loadBill(workspaceId, billSummary.bill_id);
      if (stored && stored.changeHash && stored.changeHash === billSummary.change_hash) {
        skipped++;
        continue; // Bill hasn't changed, skip API calls
      }

      try {
        const result = await ingestBill(workspaceId, billSummary.bill_id);
        // Store the change_hash so we can skip next time
        await saveBill(workspaceId, { id: String(billSummary.bill_id), changeHash: billSummary.change_hash });
        results.push(result);
        // Count as "updated" only if there was actually new content
        if (result.newVersions > 0 || result.newDiffs > 0) {
          updated++;
        }
      } catch (err) {
        results.push({ billId: billSummary.bill_id, error: err.message });
      }
    }
  }

  return {
    state,
    session: currentSession.session_title,
    totalInSession: masterBills ? masterBills.length : 0,
    checked: masterBills && Array.isArray(masterBills) ? masterBills.length : 0,
    updated,
    skipped,
    results,
  };
}
