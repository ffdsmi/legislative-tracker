import { db } from './db';

// ─── Utility ──────────────────────────────────────────────

function stringifyFields(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] !== undefined && typeof result[field] !== 'string') {
      result[field] = JSON.stringify(result[field]);
    }
  }
  return result;
}

function parseFields(obj, fields) {
  if (!obj) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = JSON.parse(result[field]);
      } catch {
        // ignore
      }
    }
  }
  return result;
}

const billJsonFields = ['sponsors', 'subjects', 'history', 'calendar', 'legiscanTexts', 'votes', 'amendments', 'supplements'];

export async function saveBill(workspaceId, bill) {
  const mapped = stringifyFields(bill, billJsonFields);
  
  const updateData = {};
  
  if ('state' in mapped || 'jurisdiction' in mapped) {
    updateData.state = mapped.state || mapped.jurisdiction || '';
    updateData.jurisdiction = mapped.jurisdiction || mapped.state || null;
  }
  
  if ('session' in mapped) updateData.session = mapped.session ? String(mapped.session) : null;
  if ('number' in mapped) updateData.number = mapped.number || '';
  if ('title' in mapped) updateData.title = mapped.title || '';
  if ('description' in mapped) updateData.description = mapped.description || null;
  if ('status' in mapped) updateData.status = mapped.status ? Number(mapped.status) : null;
  if ('statusDate' in mapped) updateData.statusDate = mapped.statusDate || null;
  if ('lastAction' in mapped) updateData.lastAction = mapped.lastAction || null;
  if ('lastActionDate' in mapped) updateData.lastActionDate = mapped.lastActionDate || null;
  if ('url' in mapped) updateData.url = mapped.url || null;
  if ('stateLink' in mapped) updateData.stateLink = mapped.stateLink || null;
  if ('sponsors' in mapped) updateData.sponsors = mapped.sponsors;
  if ('subjects' in mapped) updateData.subjects = mapped.subjects;
  if ('history' in mapped) updateData.history = mapped.history;
  if ('calendar' in mapped) updateData.calendar = mapped.calendar;
  if ('legiscanTexts' in mapped) updateData.legiscanTexts = mapped.legiscanTexts;
  if ('texts' in mapped) updateData.legiscanTexts = mapped.texts; // Bridge LegiScan live payload -> Postgres mapping
  if ('votes' in mapped) updateData.votes = mapped.votes;
  if ('amendments' in mapped) updateData.amendments = mapped.amendments;
  if ('supplements' in mapped) updateData.supplements = mapped.supplements;
  if ('changeHash' in mapped) updateData.changeHash = mapped.changeHash;

  const createData = {
    workspaceId,
    id: String(mapped.id),
    state: updateData.state || '',
    number: updateData.number || '',
    title: updateData.title || '',
    ...updateData
  };

  const saved = await db.bill.upsert({
    where: { id_workspaceId: { id: String(mapped.id), workspaceId } },
    update: updateData,
    create: createData
  });
  
  return parseFields(saved, billJsonFields);
}

export async function loadBill(workspaceId, id) {
  const bill = await db.bill.findUnique({
    where: { id_workspaceId: { id: String(id), workspaceId } }
  });
  return parseFields(bill, billJsonFields);
}

export async function listBills(workspaceId) {
  const bills = await db.bill.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' }
  });
  return bills.map(b => parseFields(b, billJsonFields));
}

// ─── Text Version Storage ──────────────────────────────────────

export async function saveTextVersion(workspaceId, billId, docId, text, metadata = {}) {
  const saved = await db.billText.upsert({
    where: { docId_workspaceId: { docId: String(docId), workspaceId } },
    update: {
      text,
      date: metadata.date || null,
      type: metadata.type || null,
      url: metadata.url || null,
    },
    create: {
      workspaceId,
      billId: String(billId),
      docId: String(docId),
      text,
      date: metadata.date || null,
      type: metadata.type || null,
      url: metadata.url || null,
    }
  });

  return saved;
}

export async function loadTextVersion(workspaceId, billId, docId) {
  return await db.billText.findUnique({
    where: { docId_workspaceId: { docId: String(docId), workspaceId } }
  });
}

export async function listTextVersions(workspaceId, billId) {
  return await db.billText.findMany({
    where: { workspaceId, billId: String(billId) },
    orderBy: { date: 'asc' }
  });
}

// ─── Diff Storage ──────────────────────────────────────────────

export async function saveDiff(workspaceId, billId, oldDocId, newDocId, diffResult) {
  const changesJson = JSON.stringify(diffResult.changes || []);
  
  return await db.billDiff.upsert({
    where: {
      workspaceId_billId_oldDocId_newDocId: {
        workspaceId,
        billId: String(billId),
        oldDocId: String(oldDocId),
        newDocId: String(newDocId)
      }
    },
    update: {
      changes: changesJson,
      additions: diffResult.additions || 0,
      deletions: diffResult.deletions || 0,
    },
    create: {
      workspaceId,
      billId: String(billId),
      oldDocId: String(oldDocId),
      newDocId: String(newDocId),
      changes: changesJson,
      additions: diffResult.additions || 0,
      deletions: diffResult.deletions || 0,
    }
  });
}

export async function loadDiff(workspaceId, billId, oldDocId, newDocId) {
  const diff = await db.billDiff.findUnique({
    where: {
      workspaceId_billId_oldDocId_newDocId: {
        workspaceId,
        billId: String(billId),
        oldDocId: String(oldDocId),
        newDocId: String(newDocId)
      }
    }
  });
  
  if (diff && diff.changes) {
    diff.changes = JSON.parse(diff.changes);
  }
  return diff;
}

export async function listDiffsForBill(workspaceId, billId) {
  const diffs = await db.billDiff.findMany({
    where: { workspaceId, billId: String(billId) },
    orderBy: { createdAt: 'desc' }
  });
  
  return diffs.map(diff => {
    if (diff.changes) diff.changes = JSON.parse(diff.changes);
    return diff;
  });
}

// ─── Watchlist ─────────────────────────────────────────────────

export async function getWatchlist(workspaceId) {
  const items = await db.watchlist.findMany({
    where: { workspaceId },
    orderBy: { addedAt: 'desc' },
    include: { bill: true }
  });

  return items.map(item => ({
    ...item,
    billNumber: item.bill?.number || '',
    title: item.bill?.title || '',
    jurisdiction: item.bill?.jurisdiction || item.bill?.state || '',
    status: item.bill?.status || 0,
  }));
}

export async function addToWatchlist(workspaceId, item) {
  await db.watchlist.upsert({
    where: { workspaceId_billId: { workspaceId, billId: String(item.billId) } },
    update: { position: item.position || 'watch' },
    create: { workspaceId, billId: String(item.billId), position: item.position || 'watch' }
  });
  return await getWatchlist(workspaceId);
}

export async function removeFromWatchlist(workspaceId, billId) {
  try {
    await db.watchlist.delete({
      where: { workspaceId_billId: { workspaceId, billId: String(billId) } }
    });
  } catch {
    // Ignore if not exists
  }
  return await getWatchlist(workspaceId);
}

export async function updateWatchlistPosition(workspaceId, billId, position) {
  try {
    await db.watchlist.update({
      where: { workspaceId_billId: { workspaceId, billId: String(billId) } },
      data: { position }
    });
  } catch {
    // Ignore
  }
  return await getWatchlist(workspaceId);
}

// ─── Keywords ──────────────────────────────────────────────────

export async function getKeywords(workspaceId) {
  return await db.keyword.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function addKeyword(workspaceId, keyword) {
  await db.keyword.create({
    data: {
      workspaceId,
      term: keyword.term,
      active: keyword.active !== false,
      matchCount: keyword.matchCount || 0
    }
  });
  return await getKeywords(workspaceId);
}

export async function updateKeyword(workspaceId, id, updates) {
  try {
    await db.keyword.update({
      where: { id },
      data: updates
    });
  } catch {
    // skip
  }
  return await getKeywords(workspaceId);
}

export async function deleteKeyword(workspaceId, id) {
  try {
    await db.keyword.delete({ where: { id } });
  } catch {
    // skip
  }
  return await getKeywords(workspaceId);
}

// ─── Alerts ────────────────────────────────────────────────────

export async function getAlerts(workspaceId) {
  const alerts = await db.alert.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 200 // Only get last 200
  });

  if (alerts.length === 0) return alerts;

  const billIds = [...new Set(alerts.filter(a => a.billId).map(a => String(a.billId)))];
  const bills = await db.bill.findMany({
    where: {
      workspaceId,
      id: { in: billIds }
    },
    select: { id: true, number: true, title: true }
  });

  const billMap = {};
  for (const b of bills) billMap[b.id] = b;

  return alerts.map(a => {
    if (!a.billId) return a;
    const b = billMap[String(a.billId)];
    if (!b) return a;
    return {
      ...a,
      billNumber: b.number,
      title: a.title || b.title || a.message,
    };
  });
}

export async function addAlert(workspaceId, alert) {
  await db.alert.create({
    data: {
      workspaceId,
      type: alert.type || 'info',
      title: alert.title || null,
      message: alert.message || '',
      keyword: alert.keyword || null,
      billId: alert.billId ? String(alert.billId) : null,
      read: false
    }
  });
  
  // Prune old alerts (keep 200)
  // SQLite doesn't directly support delete with offset, so find IDs to delete
  const recentAlerts = await db.alert.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
    skip: 200
  });
  
  if (recentAlerts.length > 0) {
    await db.alert.deleteMany({
      where: { id: { in: recentAlerts.map(a => a.id) } }
    });
  }
  
  return alert;
}

export async function markAlertRead(workspaceId, id, readState = true) {
  try {
    await db.alert.update({
      where: { id },
      data: { read: readState }
    });
  } catch { }
  return await getAlerts(workspaceId);
}

export async function markAllAlertsRead(workspaceId) {
  await db.alert.updateMany({
    where: { workspaceId },
    data: { read: true }
  });
  return await getAlerts(workspaceId);
}

export async function updateAlertsRead(workspaceId, ids, readState = true) {
  await db.alert.updateMany({
    where: {
      workspaceId,
      id: { in: ids }
    },
    data: { read: readState }
  });
  return await getAlerts(workspaceId);
}

// ─── Dataset Tracker Storage ───────────────────────────────────

// Dataset Tracker is a bit global/meta. We can just store it in a generic Settings table 
// or keep it in the DB associated with a "system" level, but since instances are per workspace now,
// we can either track it per workspace or globally. For single-tenant simplicity evolving to multi-tenant, 
// let's put it on the Settings table per workspace, or keep tracking it via fs locally for raw dataset state.
// Actually, I'll store it as 'DatasetTracker' pseudo-record in a JSON blob string on the settings table.
export async function loadDatasetTracker(workspaceId) {
  if (!workspaceId) return {};
  const settings = await db.settings.findUnique({ where: { workspaceId }});
  if (settings && settings.datasetTracker) {
    try {
      return JSON.parse(settings.datasetTracker);
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveDatasetTracker(workspaceId, trackerData) {
  if (!workspaceId) return;
  await db.settings.upsert({
    where: { workspaceId },
    update: { datasetTracker: JSON.stringify(trackerData) },
    create: { workspaceId, datasetTracker: JSON.stringify(trackerData) }
  });
}
