import { db } from './db';

/**
 * Upsert a legislator into the database.
 * @param {string} workspaceId
 * @param {object} legislator - Partial or complete legislator info
 */
export async function saveLegislator(workspaceId, legislator) {
  if (!legislator || !legislator.peopleId) return null;

  const data = {
    name: legislator.name || '',
    firstName: legislator.firstName || null,
    lastName: legislator.lastName || null,
    party: legislator.party || null,
    role: legislator.role || null,
    district: legislator.district || null,
    state: legislator.state || null,
    imageUrl: legislator.imageUrl || null,
    ballotpedia: legislator.ballotpedia || null,
    openSecretsId: legislator.openSecretsId || null,
    voteSmartId: legislator.voteSmartId ? String(legislator.voteSmartId) : null,
  };
  
  if (legislator.imageUpdatedAt !== undefined) {
    data.imageUpdatedAt = legislator.imageUpdatedAt;
  }

  const saved = await db.legislator.upsert({
    where: { workspaceId_peopleId: { workspaceId, peopleId: Number(legislator.peopleId) } },
    update: data,
    create: { workspaceId, peopleId: Number(legislator.peopleId), ...data }
  });

  if (legislator.sponsoredBillIds && legislator.sponsoredBillIds.length > 0) {
    const stringIds = legislator.sponsoredBillIds.map(String);
    
    // Check which bills actually exist to prevent noisy Prisma Foreign Key error logs
    const existingBills = await db.bill.findMany({
      where: {
        workspaceId,
        id: { in: stringIds }
      },
      select: { id: true }
    });
    
    const validBillIds = new Set(existingBills.map(b => b.id));

    for (const billId of stringIds) {
      if (!validBillIds.has(billId)) continue;
      
      try {
        await db.legislatorBill.upsert({
          where: {
            legislatorId_billId: {
              legislatorId: saved.id,
              billId: billId
            }
          },
          update: {},
          create: {
            workspaceId,
            legislatorId: saved.id,
            billId: billId
          }
        });
      } catch (err) {
        // Ignored
      }
    }
  }

  return saved;
}

/**
 * Get a single legislator by people_id.
 * @param {string} workspaceId
 * @param {number|string} id 
 */
export async function getLegislator(workspaceId, id) {
  return await db.legislator.findUnique({
    where: { workspaceId_peopleId: { workspaceId, peopleId: Number(id) } }
  });
}

/**
 * Fetch all legislators matching optional filters.
 * @param {string} workspaceId
 * @param {object} filters 
 */
export async function listLegislators(workspaceId, filters = {}) {
  const where = { workspaceId };
  if (filters.search) {
    const term = filters.search;
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { district: { contains: term, mode: 'insensitive' } }
    ];
  }
  if (filters.state) {
    where.state = filters.state;
  }
  if (filters.party) {
    where.party = filters.party;
  }
  if (filters.chamber) {
    if (filters.chamber === 'S') {
      where.role = { startsWith: 'Sen' };
    } else if (filters.chamber === 'H') {
      where.role = { not: { startsWith: 'Sen' } };
    }
  }

  return await db.legislator.findMany({
    where,
    orderBy: [
      { state: 'asc' },
      { name: 'asc' }
    ]
  });
}

/**
 * For a given peopleId, return the actual bill objects from the local bill store.
 */
export async function getLegislatorBills(workspaceId, peopleId) {
  const leg = await db.legislator.findUnique({
    where: { workspaceId_peopleId: { workspaceId, peopleId: Number(peopleId) } },
    include: {
      sponsoredBills: {
        include: {
          bill: true
        }
      }
    }
  });

  if (!leg || !leg.sponsoredBills || leg.sponsoredBills.length === 0) return [];

  const bills = leg.sponsoredBills.map(sb => {
    const b = sb.bill;
    if (b.history) {
      try { b.history = JSON.parse(b.history); } catch { }
    }
    if (b.sponsors) {
      try { b.sponsors = JSON.parse(b.sponsors); } catch { }
    }
    if (b.subjects) {
      try { b.subjects = JSON.parse(b.subjects); } catch { }
    }
    return b;
  });

  return bills.sort((a, b) => new Date(b.statusDate || b.updatedAt || 0) - new Date(a.statusDate || a.updatedAt || 0));
}
