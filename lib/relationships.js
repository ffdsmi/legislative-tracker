import fs from 'fs';
import path from 'path';
import { listBills } from './store.js';

const DATA_DIR = path.join(process.cwd(), '.data');

function getRefsFile(workspaceId) {
  return path.join(DATA_DIR, workspaceId || 'default', 'relationships.json');
}

/**
 * Load cached relationships.
 */
export function loadRelationships(workspaceId) {
  const file = getRefsFile(workspaceId);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

/**
 * Save cached relationships.
 */
function saveRelationships(workspaceId, data) {
  const file = getRefsFile(workspaceId);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Batch job scanning all stored bills and detecting relationships.
 * Uses Prisma `listBills`.
 */
export async function computeRelationships(workspaceId) {
  const bills = await listBills(workspaceId);

  const relationships = {}; // billId -> Array of { relatedBillId, type, reason }
  const addRel = (bId, relatedId, type, reason) => {
    if (!bId || !relatedId) return;
    if (!relationships[bId]) relationships[bId] = [];
    if (!relationships[bId].some(r => r.relatedBillId === relatedId && r.type === type)) {
      relationships[bId].push({ relatedBillId: relatedId, type, reason });
    }
  };

  const SAST_MAP = {
    1: 'Same As', 2: 'Similar To', 3: 'Replaced By',
    4: 'Replaces', 5: 'Cross-filed', 6: 'Enabling For',
    7: 'Enabled By', 8: 'Related', 9: 'Carry Over'
  };

  for (let i = 0; i < bills.length; i++) {
    const a = bills[i];

    // parse JSON arrays
    let aSasts = [];
    if (a.sasts) {
      if (typeof a.sasts === 'string') {
        try { aSasts = JSON.parse(a.sasts); } catch {}
      } else {
        aSasts = a.sasts;
      }
    }

    // 0. Official SAST Exact Mappings
    if (aSasts && Array.isArray(aSasts)) {
      for (const sast of aSasts) {
        if (sast.sast_bill_id) {
          const relationType = SAST_MAP[sast.type_id] || sast.type || 'Related';
          addRel(a.id, String(sast.sast_bill_id), relationType, 'Official companion bill / direct relationship');
        }
      }
    }

    for (let j = i + 1; j < bills.length; j++) {
      const b = bills[j];

      // 1. Same Title (Companion / Cross-Jurisdiction)
      if (a.title && b.title) {
        // Strip common prefixes like "Relating to ", "A bill for an act to "
        const cleanA = a.title.toLowerCase().replace(/^(relating to |a bill for an act to |an act )/, '').trim();
        const cleanB = b.title.toLowerCase().replace(/^(relating to |a bill for an act to |an act )/, '').trim();
        
        if (cleanA.length > 20 && (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA))) {
          if (a.jurisdiction === b.jurisdiction) {
            addRel(a.id, b.id, 'companion', 'Similar title (Same jurisdiction)');
            addRel(b.id, a.id, 'companion', 'Similar title (Same jurisdiction)');
          } else {
            addRel(a.id, b.id, 'cross-jurisdiction', 'Similar title (Different jurisdiction)');
            addRel(b.id, a.id, 'cross-jurisdiction', 'Similar title (Different jurisdiction)');
          }
        }
      }

      // 2. Shared Sponsors
      let aSpon = [];
      let bSpon = [];
      try { if (a.sponsors) aSpon = typeof a.sponsors === 'string' ? JSON.parse(a.sponsors) : a.sponsors; } catch {}
      try { if (b.sponsors) bSpon = typeof b.sponsors === 'string' ? JSON.parse(b.sponsors) : b.sponsors; } catch {}

      const aSponIds = Array.isArray(aSpon) ? aSpon.map(s => String(s.people_id)) : [];
      const bSponIds = Array.isArray(bSpon) ? bSpon.map(s => String(s.people_id)) : [];
      
      let commonSponsors = 0;
      for (const sponId of aSponIds) {
        if (sponId && bSponIds.includes(sponId)) {
          commonSponsors++;
        }
      }
      if (commonSponsors > 0) {
        const reason = `Shares ${commonSponsors} sponsor${commonSponsors > 1 ? 's' : ''}`;
        addRel(a.id, b.id, 'same_sponsor', reason);
        addRel(b.id, a.id, 'same_sponsor', reason);
      }

      // 3. Shared Subjects (LegiScan exact match subjects)
      let aSub = [];
      let bSub = [];
      try { if (a.subjects) aSub = typeof a.subjects === 'string' ? JSON.parse(a.subjects) : a.subjects; } catch {}
      try { if (b.subjects) bSub = typeof b.subjects === 'string' ? JSON.parse(b.subjects) : b.subjects; } catch {}

      const aSubIds = Array.isArray(aSub) ? aSub.map(s => String(s.subject_id)) : [];
      const bSubIds = Array.isArray(bSub) ? bSub.map(s => String(s.subject_id)) : [];

      let commonSubjects = 0;
      for (const subId of aSubIds) {
        if (subId && bSubIds.includes(subId)) {
          commonSubjects++;
        }
      }
      if (commonSubjects > 0 && commonSubjects >= 3) {
        const reason = `Shares ${commonSubjects} LegiScan subjects`;
        addRel(a.id, b.id, 'same_subject', reason);
        addRel(b.id, a.id, 'same_subject', reason);
      }
    }
  }

  saveRelationships(workspaceId, relationships);
  return relationships;
}

/**
 * Get related bills for a given bill ID.
 */
export async function getRelatedBills(workspaceId, billId) {
  const allRels = loadRelationships(workspaceId);
  const rels = allRels[billId] || [];

  if (rels.length === 0) return [];

  const bills = await listBills(workspaceId);
  const billMap = bills.reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {});

  const enriched = [];

  for (const r of rels) {
    const bill = billMap[r.relatedBillId];
    if (bill) {
      enriched.push({
        ...r,
        billNumber: bill.number,
        title: bill.title,
        jurisdiction: bill.jurisdiction,
        status: bill.status
      });
    }
  }

  // Deduplicate and sort
  const unique = [];
  const seen = new Set();
  for (const e of enriched) {
    if (!seen.has(e.relatedBillId)) {
      seen.add(e.relatedBillId);
      unique.push(e);
    }
  }
  return unique.sort((a, b) => b.type.localeCompare(a.type));
}
