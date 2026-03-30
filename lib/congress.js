import { getSettings } from './settings.js';

const BASE_URL = 'https://api.congress.gov/v3';

/**
 * Make a Congress.gov API request.
 */
async function apiRequest(endpoint) {
  const settings = getSettings();
  const apiKey = settings.congressApiKey;
  if (!apiKey) {
    throw new Error('Congress.gov API key not configured.');
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${separator}api_key=${apiKey}&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Congress.gov API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Parse a LegiScan bill number like "HR 1234" or "S 567" into Congress.gov format.
 * Returns { billType, billNumber } or null if unparseable.
 */
export function parseBillNumber(billNumber) {
  if (!billNumber) return null;

  // Map common prefixes to Congress.gov bill types
  const typeMap = {
    'HR': 'hr',
    'S': 's',
    'HB': 'hr',
    'SB': 's',
    'HJR': 'hjres',
    'HJRES': 'hjres',
    'SJR': 'sjres',
    'SJRES': 'sjres',
    'HCONRES': 'hconres',
    'HCR': 'hconres',
    'SCONRES': 'sconres',
    'SCR': 'sconres',
    'HRES': 'hres',
    'SRES': 'sres',
  };

  // Normalize: remove dots, extra spaces
  const cleaned = billNumber.replace(/\./g, '').trim().toUpperCase();
  const match = cleaned.match(/^([A-Z]+)\s*(\d+)$/);
  if (!match) return null;

  const prefix = match[1];
  const number = match[2];
  const billType = typeMap[prefix];
  if (!billType) return null;

  return { billType, billNumber: number };
}

/**
 * Detect current Congress number from year.
 * Each Congress spans 2 years starting Jan 3 of odd-numbered years.
 */
export function getCurrentCongress() {
  const year = new Date().getFullYear();
  return Math.floor((year - 1789) / 2) + 1;
}

/**
 * Get the CRS summary for a federal bill.
 * @param {number} congress - Congress number (e.g. 119)
 * @param {string} billType - Bill type (e.g. 'hr', 's')
 * @param {string} billNumber - Bill number (e.g. '1234')
 * @returns {Promise<string|null>} Summary text or null
 */
export async function getBillSummary(congress, billType, billNumber) {
  try {
    const data = await apiRequest(`/bill/${congress}/${billType}/${billNumber}/summaries`);
    const summaries = data.summaries || [];
    if (summaries.length === 0) return null;
    // Return the most recent summary
    const latest = summaries[summaries.length - 1];
    return latest.text || latest.actionDesc || null;
  } catch (err) {
    console.error('Congress.gov summary fetch error:', err.message);
    return null;
  }
}

/**
 * Get amendments for a federal bill.
 * @returns {Promise<{count: number, amendments: Array}>}
 */
export async function getBillAmendments(congress, billType, billNumber) {
  try {
    const data = await apiRequest(`/bill/${congress}/${billType}/${billNumber}/amendments`);
    const amendments = data.amendments || [];
    return { count: amendments.length, amendments };
  } catch (err) {
    console.error('Congress.gov amendments fetch error:', err.message);
    return { count: 0, amendments: [] };
  }
}

/**
 * Enrich a bill record with Congress.gov data.
 * Only works for federal (US) bills.
 */
export async function enrichBill(bill) {
  if (!bill || bill.jurisdiction !== 'US') return bill;

  const settings = getSettings();
  if (!settings.congressApiKey) return bill;

  const parsed = parseBillNumber(bill.number);
  if (!parsed) return bill;

  const congress = getCurrentCongress();

  const [summary, amendments] = await Promise.all([
    getBillSummary(congress, parsed.billType, parsed.billNumber),
    getBillAmendments(congress, parsed.billType, parsed.billNumber),
  ]);

  return {
    ...bill,
    crsSummary: summary || bill.crsSummary || null,
    amendmentCount: amendments.count,
    enrichedAt: new Date().toISOString(),
  };
}
