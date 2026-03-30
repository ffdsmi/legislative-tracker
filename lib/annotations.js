import { db } from './db';

// ─── Annotations ───────────────────────────────────────────

export async function getAnnotations(workspaceId, billId = null) {
  const whereClause = { workspaceId };
  if (billId) {
    whereClause.billId = String(billId);
  }

  return await db.annotation.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' }
  });
}

export async function getAnnotation(workspaceId, id) {
  return await db.annotation.findFirst({
    where: { id, workspaceId }
  });
}

export async function createAnnotation(workspaceId, { billId, startOffset, endOffset, selectedText, note }) {
  const newAnnotation = await db.annotation.create({
    data: {
      workspaceId,
      billId: String(billId),
      startOffset,
      endOffset,
      selectedText: selectedText || '',
      note: note || '',
    }
  });
  return newAnnotation;
}

export async function updateAnnotation(workspaceId, id, updates) {
  try {
    return await db.annotation.update({
      where: { id, workspaceId },
      data: updates
    });
  } catch {
    return null;
  }
}

export async function deleteAnnotation(workspaceId, id) {
  try {
    await db.annotation.delete({
      where: { id, workspaceId }
    });
  } catch {
    // ignore
  }
  return await getAnnotations(workspaceId);
}

// ─── Comments (threaded) ───────────────────────────────────

export async function getComments(workspaceId, annotationId) {
  // Validate annotation belongs to workspace
  const isOwner = await getAnnotation(workspaceId, annotationId);
  if (!isOwner) return [];

  const comments = await db.comment.findMany({
    where: { annotationId },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  return comments;
}

export async function createComment(workspaceId, userId, { annotationId, parentCommentId, body }) {
  // Validate workspace ownership of the parent annotation
  const isOwner = await getAnnotation(workspaceId, annotationId);
  if (!isOwner) throw new Error('Unauthorized');

  const comment = await db.comment.create({
    data: {
      annotationId,
      parentCommentId: parentCommentId || null,
      userId,
      body: body || '',
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return comment;
}

export async function deleteComment(workspaceId, id) {
  // To delete we first verify the commment belongs to an annotation in our workspace
  const target = await db.comment.findUnique({
    where: { id },
    include: { annotation: true }
  });

  if (!target || target.annotation.workspaceId !== workspaceId) {
    return [];
  }

  // Find all children and delete them too (recursive delete)
  // Since Prisma SQLite doesn't currently cascade self-relations automatically without setup,
  // we do a simple manual recursive loop.
  const allComments = await db.comment.findMany({
    where: { annotationId: target.annotationId }
  });

  const idsToDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of allComments) {
      if (c.parentCommentId && idsToDelete.has(c.parentCommentId) && !idsToDelete.has(c.id)) {
        idsToDelete.add(c.id);
        changed = true;
      }
    }
  }

  await db.comment.deleteMany({
    where: { id: { in: Array.from(idsToDelete) } }
  });

  return await getComments(workspaceId, target.annotationId);
}
