import { db } from './db';

/**
 * List all testimonies, optionally filtered by billId.
 */
export async function listTestimonies(workspaceId, billId = null) {
  const whereClause = { workspaceId };
  if (billId) {
    whereClause.billId = String(billId);
  }

  const testimonies = await db.testimony.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' }
  });

  return testimonies.map(t => ({
    ...t,
    wordCount: countWords(t.body || '')
  }));
}

/**
 * Get a single testimony by ID.
 */
export async function getTestimony(workspaceId, id) {
  const testimony = await db.testimony.findFirst({
    where: { id, workspaceId }
  });

  if (!testimony) return null;

  return {
    ...testimony,
    wordCount: countWords(testimony.body || '')
  };
}

/**
 * Create a new testimony.
 * @param {object} data - { billId, billNumber, billTitle, title, body, status, etc. }
 */
export async function createTestimony(workspaceId, userId, data) {
  const testimony = await db.testimony.create({
    data: {
      workspaceId,
      userId,
      billId: data.billId ? String(data.billId) : null,
      billNumber: data.billNumber || '',
      billTitle: data.billTitle || '',
      sectionRef: data.sectionRef || '',
      title: data.title || 'Untitled Testimony',
      authorName: data.authorName || '',
      jobTitle: data.jobTitle || '',
      organization: data.organization || '',
      committeeDate: data.committeeDate || '',
      position: data.position || 'neutral',
      body: data.body || '',
      status: data.status || 'draft',
    }
  });

  return {
    ...testimony,
    wordCount: countWords(testimony.body || '')
  };
}

/**
 * Update a testimony by ID.
 */
export async function updateTestimony(workspaceId, id, updates) {
  try {
    const testimony = await db.testimony.update({
      where: { id, workspaceId },
      data: {
        billId: updates.billId !== undefined ? (updates.billId ? String(updates.billId) : null) : undefined,
        billNumber: updates.billNumber,
        billTitle: updates.billTitle,
        sectionRef: updates.sectionRef,
        title: updates.title,
        authorName: updates.authorName,
        jobTitle: updates.jobTitle,
        organization: updates.organization,
        committeeDate: updates.committeeDate,
        position: updates.position,
        body: updates.body,
        status: updates.status,
      }
    });

    return {
      ...testimony,
      wordCount: countWords(testimony.body || '')
    };
  } catch {
    return null;
  }
}

/**
 * Delete a testimony by ID.
 */
export async function deleteTestimony(workspaceId, id) {
  try {
    await db.testimony.delete({
      where: { id, workspaceId }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Count words in HTML content by stripping tags.
 */
function countWords(html) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
}
