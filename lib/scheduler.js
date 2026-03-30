import { db } from './db.js';

/**
 * Singleton scheduler for automatic bill ingestion.
 * Evaluates all workspaces on a 1-minute heartbeat interval,
 * processing those whose time since lastIngestAt exceeds their configured pollingInterval.
 */

let timer = globalThis.__schedulerTimer || null;
let isRunning = globalThis.__schedulerIsRunning || false;
let lastRun = globalThis.__schedulerLastRun || null;
let lastResult = globalThis.__schedulerLastResult || null;

export async function startScheduler() {
  const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute tick

  if (timer) {
    return { status: 'running', intervalMinutes: 1, lastRun, lastResult };
  }

  isRunning = true;
  globalThis.__schedulerIsRunning = true;

  // Run initial cycle immediately upon starting
  runIngestionCycle().catch(console.error);

  timer = setInterval(async () => {
    await runIngestionCycle();
  }, HEARTBEAT_INTERVAL_MS);
  
  globalThis.__schedulerTimer = timer;

  console.log(`[Scheduler] Started — heartbeat tick every 1 minute.`);
  return { status: 'running', intervalMinutes: 1, lastRun, lastResult };
}

export function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    globalThis.__schedulerTimer = null;
  }
  isRunning = false;
  globalThis.__schedulerIsRunning = false;
  console.log('[Scheduler] Stopped.');
  return { status: 'stopped' };
}

export function getSchedulerStatus() {
  return {
    status: isRunning ? 'running' : 'stopped',
    intervalMinutes: 1, // Represents the heartbeat, individual UI settings decide the run frequency
    lastRun,
    lastResult,
  };
}

async function runIngestionCycle() {
  const startTime = new Date();
  
  try {
    const workspaces = await db.workspace.findMany({
      include: { settings: true }
    });

    let totalBills = 0;
    let totalErrors = 0;
    let processedWorkspaces = 0;

    for (const ws of workspaces) {
      if (!ws.settings || !ws.settings.legiscanApiKey) continue;

      const pollMinutes = ws.settings.pollingInterval || 60;
      const pollMs = pollMinutes * 60 * 1000;
      const lastIngest = ws.settings.lastIngestAt ? new Date(ws.settings.lastIngestAt).getTime() : 0;
      
      if (Date.now() - lastIngest < pollMs) {
        continue; // Not due for ingestion yet
      }

      console.log(`[Scheduler] Workspace ${ws.id} is due for ingestion (Interval: ${pollMinutes} min). Running...`);
      processedWorkspaces++;
      
      const workspaceId = ws.id;
      const settings = ws.settings;
      let jurisdictions = ['NE'];
      
      if (settings.jurisdictions) {
        try { jurisdictions = JSON.parse(settings.jurisdictions); } catch {}
      }

      // Dynamic import to avoid circular dependencies
      const { ingestBill } = await import('./ingest.js');
      const { getMasterList, getSessionList } = await import('./legiscan.js');

      for (const state of jurisdictions) {
        try {
          const sessions = await getSessionList(workspaceId, state);
          if (!sessions || sessions.length === 0) continue;

          const currentSession = Array.isArray(sessions)
            ? sessions[0]
            : Object.values(sessions).find(s => typeof s === 'object');
          if (!currentSession?.session_id) continue;

          const { bills } = await getMasterList(workspaceId, currentSession.session_id);
          const batch = bills.slice(0, 15); // Limit per jurisdiction to avoid hitting max rate quotas rapidly

          for (const bill of batch) {
            try {
              await ingestBill(workspaceId, bill.bill_id);
              totalBills++;
            } catch (err) {
              totalErrors++;
            }
          }
        } catch (err) {
          totalErrors++;
        }
      }

      // Trigger Email Digest for this workspace
      try {
        if (settings.digestSchedule && settings.digestSchedule !== 'none' && settings.senderEmail) {
          const { sendDigest } = await import('./email.js');
          const { getUpcomingEvents } = await import('./calendar.js');
          const { getAlerts, listBills } = await import('./store.js');
          
          const isDue = true; // Placeholder for Phase 5 Phase 4 digest calculation

          if (isDue) {
             const upcomingEvents = await getUpcomingEvents(workspaceId, 7);
             const alerts = await getAlerts(workspaceId);
             const recentAlerts = alerts.filter(a => new Date(a.createdAt) > new Date(Date.now() - 86400000));
            
             const matches = recentAlerts.filter(a => a.type === 'keyword').map(a => ({ 
               jurisdiction: a.billNumber ? a.billNumber.split(' ')[0] : '', number: a.billNumber, title: a.title, reason: a.keyword 
             }));
             const changedBills = recentAlerts.filter(a => a.type === 'change').map(a => ({ 
               jurisdiction: a.billNumber ? a.billNumber.split(' ')[0] : '', number: a.billNumber, title: a.title, reason: a.message 
             }));
             const bills = await listBills(workspaceId);
             const newBills = bills.filter(b => new Date(b.createdAt) > new Date(Date.now() - 86400000)).map(b => ({ 
               jurisdiction: b.jurisdiction, number: b.number, title: b.title 
             }));
            
             const digestData = { matches, changedBills, upcomingEvents, newBills };
             await sendDigest(workspaceId, settings.senderEmail, digestData);
          }
        }
      } catch (digestErr) {
        console.error(`[Scheduler] Failed to trigger email digest for ${workspaceId}:`, digestErr.message);
      }

      // Update the timestamp so it waits another interval
      await db.settings.update({
        where: { workspaceId: ws.id },
        data: { lastIngestAt: new Date() }
      });
    }

    if (processedWorkspaces > 0) {
      lastRun = new Date().toISOString();
      globalThis.__schedulerLastRun = lastRun;
      
      lastResult = {
        success: true,
        workspacesProcessed: processedWorkspaces,
        billsProcessed: totalBills,
        errors: totalErrors,
        duration: Date.now() - startTime.getTime(),
      };
      globalThis.__schedulerLastResult = lastResult;
      console.log(`[Scheduler] Cycle complete processing ${processedWorkspaces} workspaces.`);
    }

  } catch (err) {
    lastRun = new Date().toISOString();
    globalThis.__schedulerLastRun = lastRun;
    
    lastResult = { success: false, error: err.message };
    globalThis.__schedulerLastResult = lastResult;
    console.error('[Scheduler] Heartbeat cycle failed:', err.message);
  }
}
