import { db } from './db';

/**
 * Get all markups for a bill, optionally filtered by version docId.
 */
export async function getMarkups(workspaceId, billId, versionDocId = null) {
  const whereClause = {
    workspaceId,
    billId: String(billId)
  };

  if (versionDocId) {
    whereClause.versionDocId = String(versionDocId);
  }

  return await db.markup.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Create a new markup.
 * @param {object} data - { billId, versionDocId, startOffset, endOffset, selectedText, type, suggestedText, note, color }
 *   type: 'highlight' | 'strikethrough' | 'suggest'
 */
export async function createMarkup(workspaceId, userId, data) {
  const markup = await db.markup.create({
    data: {
      workspaceId,
      userId,
      billId: String(data.billId),
      versionDocId: data.versionDocId ? String(data.versionDocId) : null,
      startOffset: data.startOffset || 0,
      endOffset: data.endOffset || 0,
      selectedText: data.selectedText || '',
      type: data.type || 'highlight', // highlight | strikethrough | suggest
      suggestedText: data.suggestedText || '',
      note: data.note || '',
      color: data.color || '#fbbf24',
    }
  });
  return markup;
}

/**
 * Delete a markup by ID.
 */
export async function deleteMarkup(workspaceId, id) {
  try {
    const target = await db.markup.findUnique({ where: { id } });
    if (!target || target.workspaceId !== workspaceId) {
      return null;
    }

    await db.markup.delete({
      where: { id }
    });
  } catch {
    // skip
  }
}

/**
 * Update a markup by ID.
 */
export async function updateMarkup(workspaceId, id, updates) {
  try {
    return await db.markup.update({
      where: { id, workspaceId },
      data: updates
    });
  } catch {
    return null;
  }
}
