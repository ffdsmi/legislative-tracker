import { getSettings } from './settings.js';
import { db } from './db.js';

const DEMO_KEY = 'DEMO_KEY';
const BASE_URL = 'https://api.regulations.gov/v4';

/**
 * Sync latest dockets from Regulations.gov for specified agencies
 */
export async function syncDockets(workspaceId, agencies = ['NCUA', 'CFPB']) {
  const settings = await getSettings(workspaceId);
  const apiKey = settings.regulationsApiKey || DEMO_KEY;
  let newDocketsCount = 0;

  for (const agency of agencies) {
    try {
      // Fetch latest 25 dockets updated recently
      const url = `${BASE_URL}/dockets?filter[agencyId]=${agency}&sort=-lastModifiedDate&page[size]=25`;
      
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`Regulations API Rate Limit hit for ${agency}`);
          continue;
        }
        throw new Error(`Regulations API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const dockets = json.data || [];

      for (const item of dockets) {
        const id = item.id;
        const attrs = item.attributes || {};
        
        // Ensure it doesn't already exist
        const existing = await db.docket.findUnique({
          where: {
            id_workspaceId: { id, workspaceId }
          }
        });

        const status = (attrs.openForComment) ? 'Open for Comment' : 'Closed';
        const type = attrs.docketType || 'Rulemaking';

        if (!existing) {
          await db.docket.create({
            data: {
              id,
              workspaceId,
              agency,
              title: attrs.title || 'Untitled Docket',
              type,
              status,
              documentUrl: `https://www.regulations.gov/docket/${id}`,
              commentEndDate: attrs.commentEndDate || null
            }
          });
          newDocketsCount++;

          // Create alert
          await db.alert.create({
            data: {
              workspaceId,
              type: 'regulatory',
              title: `${id}: ${type} Published`,
              message: attrs.title || 'New generic regulations posted.',
              read: false
            }
          });
        } else {
          // Update existing
          await db.docket.update({
            where: {
              id_workspaceId: { id, workspaceId }
            },
            data: {
              title: attrs.title || existing.title,
              status,
              type,
              commentEndDate: attrs.commentEndDate || existing.commentEndDate
            }
          });
        }
      }
    } catch (err) {
      console.error(`Error syncing dockets for ${agency}:`, err);
    }
  }

  return { success: true, newCount: newDocketsCount };
}

export async function getDockets(workspaceId) {
  return await db.docket.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' }
  });
}
