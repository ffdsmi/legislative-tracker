import { getSettings } from './settings.js';

const BASE_URL = 'https://api.legiscan.com/?key=';

/**
 * Make a LegiScan API request.
 * @param {string} workspaceId - The internal workspace UUID for configuration
 * @param {string} op - API operation (e.g., 'getSessionList', 'getSearch')
 * @param {Record<string, string>} params - Additional query parameters
 * @returns {Promise<object>} API response data
 */
async function apiRequest(workspaceId, op, params = {}) {
  const settings = await getSettings(workspaceId);
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

export async function getSessionList(workspaceId, state) {
  const data = await apiRequest(workspaceId, 'getSessionList', { state });
  return data.sessions || [];
}

export async function getMasterList(workspaceId, sessionId) {
  const data = await apiRequest(workspaceId, 'getMasterList', { id: String(sessionId) });
  const masterlist = data.masterlist || {};
  const bills = [];
  for (const [key, value] of Object.entries(masterlist)) {
    if (key !== 'session' && typeof value === 'object') {
      bills.push(value);
    }
  }
  return { session: masterlist.session, bills };
}

export async function getBill(workspaceId, billId) {
  const data = await apiRequest(workspaceId, 'getBill', { id: String(billId) });
  return data.bill || null;
}

export async function getBillText(workspaceId, docId) {
  const data = await apiRequest(workspaceId, 'getBillText', { id: String(docId) });
  return data.text || null;
}

export async function searchBills(workspaceId, query, options = {}) {
  const params = { query };
  if (options.state) params.state = options.state;
  if (options.year) params.year = String(options.year);
  if (options.page) params.page = String(options.page);

  const data = await apiRequest(workspaceId, 'getSearch', params);
  return data.searchresult || {};
}

export async function getDatasetList(workspaceId, state, year) {
  const params = { state };
  if (year) params.year = String(year);
  const data = await apiRequest(workspaceId, 'getDatasetList', params);
  return data.datasetlist || [];
}

export async function getDataset(workspaceId, accessKey) {
  const data = await apiRequest(workspaceId, 'getDataset', { access_key: accessKey });
  return data.dataset || null;
}

export function decodeText(base64Text) {
  if (!base64Text) return '';
  return Buffer.from(base64Text, 'base64').toString('utf-8');
}

export async function getCalendar(workspaceId, state, year) {
  console.log(`[LegiScan] Simulating calendar events for ${state}...`);
  const events = [];
  const eventTypes = ['hearing', 'markup', 'floor vote', 'committee'];
  const locations = ['Room 101', 'Capitol Chamber', 'Subcommittee Room B', 'Virtual', 'Room 205', 'Main Gallery'];
  const now = new Date();
  
  const count = Math.floor(Math.random() * 5) + 5; 
  
  for (let i = 0; i < count; i++) {
    const futureDays = Math.floor(Math.random() * 30);
    const eventDate = new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000);
    const hour = Math.floor(Math.random() * 8) + 9;
    
    events.push({
      event_id: `mock-${state}-${i}-${Date.now()}`,
      state: state.toUpperCase(),
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      event_date: eventDate.toISOString().split('T')[0],
      event_time: `${String(hour).padStart(2, '0')}:00:00`,
      description: `Hearing on Legislative Proposal ${Math.floor(Math.random() * 1000) + 100}`,
      location: locations[Math.floor(Math.random() * locations.length)],
      bill_id: null,
      url: `https://legiscan.com/${state.toUpperCase()}`
    });
  }
  
  return events;
}

export async function getSessionPeople(workspaceId, sessionId) {
  const data = await apiRequest(workspaceId, 'getSessionPeople', { id: String(sessionId) });
  return data.sessionpeople || {};
}
