import { getSettings } from './settings.js';

const BASE_URL = 'https://api.legiscan.com/?key=';

/**
 * Make a LegiScan API request.
 * @param {string} op - API operation (e.g., 'getSessionList', 'getSearch')
 * @param {Record<string, string>} params - Additional query parameters
 * @returns {Promise<object>} API response data
 */
async function apiRequest(op, params = {}) {
  const settings = getSettings();
  const apiKey = settings.legiscanApiKey;
  if (!apiKey) {
    throw new Error('LegiScan API key not configured. Go to Settings to add your key.');
  }

  const queryParams = new URLSearchParams({ key: apiKey, op, ...params });
  const url = `https://api.legiscan.com/?${queryParams.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`LegiScan API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.status === 'ERROR') {
    throw new Error(`LegiScan API error: ${data.alert?.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * Get the list of available sessions for a state.
 * @param {string} state - Two-letter state code (e.g., 'NE', 'US')
 */
export async function getSessionList(state) {
  const data = await apiRequest('getSessionList', { state });
  return data.sessions || [];
}

/**
 * Get the master list of bills for a session.
 * @param {number} sessionId - LegiScan session ID
 */
export async function getMasterList(sessionId) {
  const data = await apiRequest('getMasterList', { id: String(sessionId) });
  // The masterlist is an object with numeric keys + "session" key
  const masterlist = data.masterlist || {};
  const bills = [];
  for (const [key, value] of Object.entries(masterlist)) {
    if (key !== 'session' && typeof value === 'object') {
      bills.push(value);
    }
  }
  return { session: masterlist.session, bills };
}

/**
 * Get full bill detail by bill_id.
 * @param {number} billId - LegiScan bill ID
 */
export async function getBill(billId) {
  const data = await apiRequest('getBill', { id: String(billId) });
  return data.bill || null;
}

/**
 * Get bill text by doc_id.
 * @param {number} docId - LegiScan document ID
 */
export async function getBillText(docId) {
  const data = await apiRequest('getBillText', { id: String(docId) });
  return data.text || null;
}

/**
 * Search for bills matching a query string.
 * @param {string} query - Search query
 * @param {object} options - { state, year, page }
 */
export async function searchBills(query, options = {}) {
  const params = { query };
  if (options.state) params.state = options.state;
  if (options.year) params.year = String(options.year);
  if (options.page) params.page = String(options.page);

  const data = await apiRequest('getSearch', params);
  return data.searchresult || {};
}

/**
 * Get the dataset list (change hashes) for a session.
 * Used for incremental sync — compare hashes to detect changes.
 * @param {string} state - Two-letter state code
 * @param {number} [year] - Year filter
 */
export async function getDatasetList(state, year) {
  const params = { state };
  if (year) params.year = String(year);
  const data = await apiRequest('getDatasetList', params);
  return data.datasetlist || [];
}

/**
 * Decode base64-encoded bill text from LegiScan.
 * LegiScan returns bill text as base64-encoded HTML/PDF.
 * @param {string} base64Text - Base64-encoded text
 * @returns {string} Decoded text
 */
export function decodeText(base64Text) {
  if (!base64Text) return '';
  return Buffer.from(base64Text, 'base64').toString('utf-8');
}
