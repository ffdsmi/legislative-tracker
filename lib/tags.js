import { db } from './db';

// ─── Tags ──────────────────────────────────────────────────

export async function getTags(workspaceId) {
  return await db.tag.findMany({
    where: { workspaceId },
    orderBy: { name: 'asc' },
  });
}

export async function createTag(workspaceId, { name, color }) {
  const existing = await db.tag.findUnique({
    where: { workspaceId_name: { workspaceId, name } }
  });
  if (existing) return existing;

  const newTag = await db.tag.create({
    data: {
      workspaceId,
      name,
      color: color || '#6366f1',
    }
  });
  return newTag;
}

export async function updateTag(workspaceId, id, updates) {
  try {
    await db.tag.update({
      where: { id },
      data: updates
    });
  } catch {
    // skip
  }
  return await getTags(workspaceId);
}

export async function deleteTag(workspaceId, id) {
  try {
    await db.tag.delete({
      where: { id }
    });
  } catch {
    // skip
  }
  return await getTags(workspaceId);
}

// ─── Bill-Tag Relationships ────────────────────────────────

export async function getBillTags(workspaceId, billId = null) {
  if (billId) {
    const billTags = await db.billTag.findMany({
      where: { workspaceId, billId: String(billId) },
      include: { tag: true }
    });
    // Return flat array like the old local logic did or similar format
    return billTags.map(bt => ({
      billId: bt.billId,
      tagId: bt.tagId,
    }));
  } else {
    const all = await db.billTag.findMany({
      where: { workspaceId },
      include: { tag: true }
    });
    return all.map(bt => ({
      billId: bt.billId,
      tagId: bt.tagId,
    }));
  }
}

export async function getTagBills(workspaceId, tagId) {
  const all = await db.billTag.findMany({
    where: { workspaceId, tagId },
  });
  return all.map(bt => ({ billId: bt.billId, tagId: bt.tagId }));
}

export async function addTagToBill(workspaceId, billId, tagId) {
  try {
    await db.billTag.upsert({
      where: { billId_tagId: { billId: String(billId), tagId } },
      create: { workspaceId, billId: String(billId), tagId },
      update: {}
    });
  } catch {
    // skip
  }
  return await getBillTags(workspaceId);
}

export async function removeTagFromBill(workspaceId, billId, tagId) {
  try {
    await db.billTag.delete({
      where: { billId_tagId: { billId: String(billId), tagId } }
    });
  } catch {
    // skip
  }
  return await getBillTags(workspaceId);
}
