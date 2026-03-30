import { getCalendar } from './legiscan.js';
import { listBills } from './store.js';

import { getSettings } from './settings.js';

/**
 * Get calendar events with optional filters.
 * In Phase 1 MVP we simulate these events or derive them from LegiScan mocks.
 */
export async function getCalendarEvents(workspaceId, filters = {}) {
  let statesToFetch = [];
  
  if (filters.state && filters.state !== 'ALL') {
    statesToFetch = [filters.state.toUpperCase()];
  } else {
    const settings = await getSettings(workspaceId);
    statesToFetch = (settings.trackedJurisdictions && settings.trackedJurisdictions.length > 0)
      ? settings.trackedJurisdictions
      : ['US'];
  }

  let allEvents = [];
  for (const st of statesToFetch) {
    const evts = await getCalendar(workspaceId, st, new Date().getFullYear());
    allEvents.push(...evts);
  }

  if (filters.state && filters.state !== 'ALL') {
    allEvents = allEvents.filter(e => e.state === filters.state.toUpperCase());
  }
  if (filters.type) {
    allEvents = allEvents.filter(e => e.type === filters.type || e.event_type === filters.type);
  }
  if (filters.from) {
    allEvents = allEvents.filter(e => new Date(e.date || e.event_date) >= new Date(filters.from));
  }
  if (filters.to) {
    allEvents = allEvents.filter(e => new Date(e.date || e.event_date) <= new Date(filters.to));
  }

  // Map LegiScan `event_*` variables to standard variables used by the frontend
  const mappedEvents = allEvents.map(e => ({
    ...e,
    id: e.event_id || e.id,
    date: e.event_date || e.date,
    time: e.event_time || e.time,
    type: e.event_type || e.type || e.action || 'Hearing'
  }));

  // Sort by date then time
  return mappedEvents.sort((a, b) => {
    const d1 = new Date(`${a.date}T${a.time || '00:00:00'}`);
    const d2 = new Date(`${b.date}T${b.time || '00:00:00'}`);
    return d1 - d2;
  });
}

/**
 * Sync calendar from locally tracked LegiScan bills for a given state.
 * LegiScan free tier does not have a global state-wide calendar fetch.
 */
export async function syncCalendar(workspaceId, state) {
  try {
    const events = await getCalendar(workspaceId, state, new Date().getFullYear());
    return events;
  } catch (err) {
    console.error(`Failed to sync calendar for ${state}:`, err.message);
    return [];
  }
}
