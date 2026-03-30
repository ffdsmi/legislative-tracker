import { db } from './db';

// ─── Collections ───────────────────────────────────────────

export async function getCollections(workspaceId) {
  return await db.collection.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' }
  });
}

export async function getCollection(workspaceId, id) {
  return await db.collection.findFirst({
    where: { workspaceId, id }
  });
}

export async function createCollection(workspaceId, { name, description }) {
  const newCollection = await db.collection.create({
    data: {
      workspaceId,
      name: name || 'Untitled Collection',
      description: description || '',
    }
  });
  return newCollection;
}

export async function updateCollection(workspaceId, id, updates) {
  try {
    return await db.collection.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
      }
    });
  } catch {
    return null;
  }
}

export async function deleteCollection(workspaceId, id) {
  try {
    await db.collection.delete({
      where: { id }
    });
  } catch {
    // ignore
  }
  return await getCollections(workspaceId);
}

// ─── Collection-Bill Relationships ─────────────────────────

export async function getCollectionBills(workspaceId, collectionId) {
  const list = await db.billCollection.findMany({
    where: { workspaceId, collectionId },
    include: { bill: true }
  });
  // Remap to match legacy format
  return list.map(cb => {
    let parsedSponsors = [];
    try { if (cb.bill?.sponsors) parsedSponsors = JSON.parse(cb.bill.sponsors); } catch(e){}

    return {
      collectionId: cb.collectionId,
      billId: cb.billId,
      billNumber: cb.bill?.number || '',
      billTitle: cb.bill?.title || '',
      jurisdiction: cb.bill?.state || cb.bill?.jurisdiction || '',
      addedAt: cb.bill?.createdAt, // approximation
      description: cb.bill?.description || '',
      status: cb.bill?.status || 0,
      lastActionDate: cb.bill?.lastActionDate || '',
      sponsors: parsedSponsors,
      // Advocacy Fields
      targetStance: cb.targetStance || '',
      talkingPoints: cb.talkingPoints || '',
      considerations: cb.considerations || '',
    };
  });
}

export async function getBillCollections(workspaceId, billId) {
  const list = await db.billCollection.findMany({
    where: { workspaceId, billId: String(billId) }
  });
  return list.map(cb => ({
    collectionId: cb.collectionId,
    billId: cb.billId,
  }));
}

export async function addBillToCollection(workspaceId, collectionId, billId, billMeta = {}) {
  try {
    await db.billCollection.upsert({
      where: { billId_collectionId: { billId: String(billId), collectionId } },
      create: { workspaceId, billId: String(billId), collectionId },
      update: {}
    });
  } catch(e) {
    console.error(e);
  }
  return await getCollectionBills(workspaceId, collectionId);
}

export async function removeBillFromCollection(workspaceId, collectionId, billId) {
  try {
    await db.billCollection.delete({
      where: { billId_collectionId: { billId: String(billId), collectionId } }
    });
  } catch {
    // skip
  }
  return await getCollectionBills(workspaceId, collectionId);
}

export async function updateAdvocacyPacket(workspaceId, collectionId, billId, { targetStance, talkingPoints, considerations }) {
  try {
    await db.billCollection.update({
      where: { billId_collectionId: { billId: String(billId), collectionId } },
      data: {
        targetStance,
        talkingPoints,
        considerations
      }
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}
