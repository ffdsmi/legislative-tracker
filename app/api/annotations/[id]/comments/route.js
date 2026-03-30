import { NextResponse } from 'next/server';
import { getComments, createComment, deleteComment } from '@/lib/annotations';
import { requireSession } from '@/lib/session';

export async function GET(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const comments = await getComments(session.workspaceId, id);
    return NextResponse.json({ comments, total: comments.length });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const comment = await createComment(session.workspaceId, session.userId, {
      annotationId: id,
      parentCommentId: body.parentCommentId || null,
      body: body.body,
    });
    return NextResponse.json({ comment });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
    }
    await deleteComment(session.workspaceId, commentId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export const dynamic = 'force-dynamic';

