import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.data');
const BILLS_DIR = path.join(DATA_DIR, 'bills');
const TEXTS_DIR = path.join(DATA_DIR, 'texts');
const DIFFS_DIR = path.join(DATA_DIR, 'diffs');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');
const KEYWORDS_FILE = path.join(DATA_DIR, 'keywords.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize directories
ensureDir(DATA_DIR);
ensureDir(BILLS_DIR);
ensureDir(TEXTS_DIR);
ensureDir(DIFFS_DIR);

// ─── Bill Storage ──────────────────────────────────────────────

export function saveBill(bill) {
  ensureDir(BILLS_DIR);
  const filePath = path.join(BILLS_DIR, `${bill.id}.json`);
  const existing = loadBill(bill.id);
  const merged = existing ? { ...existing, ...bill, updatedAt: new Date().toISOString() } : { ...bill, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function loadBill(id) {
  const filePath = path.join(BILLS_DIR, `${id}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

export function listBills() {
  ensureDir(BILLS_DIR);
  try {
    return fs.readdirSync(BILLS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(BILLS_DIR, f), 'utf-8')));
  } catch { return []; }
}

// ─── Text Version Storage ──────────────────────────────────────

export function saveTextVersion(billId, docId, text, metadata = {}) {
  ensureDir(TEXTS_DIR);
  const billTextsDir = path.join(TEXTS_DIR, String(billId));
  ensureDir(billTextsDir);
  const filePath = path.join(billTextsDir, `${docId}.json`);
  const data = { billId, docId, text, ...metadata, savedAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function loadTextVersion(billId, docId) {
  const filePath = path.join(TEXTS_DIR, String(billId), `${docId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

export function listTextVersions(billId) {
  const billTextsDir = path.join(TEXTS_DIR, String(billId));
  try {
    if (!fs.existsSync(billTextsDir)) return [];
    return fs.readdirSync(billTextsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(billTextsDir, f), 'utf-8')))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  } catch { return []; }
}

// ─── Diff Storage ──────────────────────────────────────────────

export function saveDiff(billId, oldDocId, newDocId, diffResult) {
  ensureDir(DIFFS_DIR);
  const filePath = path.join(DIFFS_DIR, `${billId}_${oldDocId}_${newDocId}.json`);
  const data = { billId, oldDocId, newDocId, ...diffResult, createdAt: new Date().toISOString() };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

export function loadDiff(billId, oldDocId, newDocId) {
  const filePath = path.join(DIFFS_DIR, `${billId}_${oldDocId}_${newDocId}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return null;
}

export function listDiffsForBill(billId) {
  ensureDir(DIFFS_DIR);
  try {
    return fs.readdirSync(DIFFS_DIR)
      .filter(f => f.startsWith(`${billId}_`) && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(DIFFS_DIR, f), 'utf-8')));
  } catch { return []; }
}

// ─── Watchlist ─────────────────────────────────────────────────

export function getWatchlist() {
  try {
    if (fs.existsSync(WATCHLIST_FILE)) {
      return JSON.parse(fs.readFileSync(WATCHLIST_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

export function addToWatchlist(item) {
  const list = getWatchlist();
  const existing = list.find(w => w.billId === item.billId);
  if (existing) {
    Object.assign(existing, item, { updatedAt: new Date().toISOString() });
  } else {
    list.push({ ...item, addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return list;
}

export function removeFromWatchlist(billId) {
  const list = getWatchlist().filter(w => String(w.billId) !== String(billId));
  fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return list;
}

export function updateWatchlistPosition(billId, position) {
  const list = getWatchlist();
  const item = list.find(w => String(w.billId) === String(billId));
  if (item) {
    item.position = position;
    item.updatedAt = new Date().toISOString();
    fs.writeFileSync(WATCHLIST_FILE, JSON.stringify(list, null, 2), 'utf-8');
  }
  return list;
}

// ─── Keywords ──────────────────────────────────────────────────

export function getKeywords() {
  try {
    if (fs.existsSync(KEYWORDS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

export function addKeyword(keyword) {
  const list = getKeywords();
  const id = Date.now().toString(36);
  const entry = { id, ...keyword, active: true, matchCount: 0, createdAt: new Date().toISOString() };
  list.push(entry);
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return entry;
}

export function updateKeyword(id, updates) {
  const list = getKeywords();
  const item = list.find(k => k.id === id);
  if (item) {
    Object.assign(item, updates);
    fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  }
  return list;
}

export function deleteKeyword(id) {
  const list = getKeywords().filter(k => k.id !== id);
  fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return list;
}

// ─── Alerts ────────────────────────────────────────────────────

export function getAlerts() {
  try {
    if (fs.existsSync(ALERTS_FILE)) {
      return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

export function addAlert(alert) {
  const list = getAlerts();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const entry = { id, ...alert, read: false, createdAt: new Date().toISOString() };
  list.unshift(entry); // newest first
  // Keep only last 200 alerts
  if (list.length > 200) list.length = 200;
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return entry;
}

export function markAlertRead(id) {
  const list = getAlerts();
  const item = list.find(a => a.id === id);
  if (item) {
    item.read = true;
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  }
  return list;
}

export function markAllAlertsRead() {
  const list = getAlerts();
  list.forEach(a => { a.read = true; });
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  return list;
}
