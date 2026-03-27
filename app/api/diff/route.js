import { NextResponse } from 'next/server';
import { computeDiff, stripHtml } from '@/lib/diff-engine';
import { listTextVersions, listDiffsForBill } from '@/lib/store';

// GET /api/diff?billId=123 — get diffs for a bill
// GET /api/diff?billId=123&oldDocId=456&newDocId=789 — compute diff between specific versions
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const billId = searchParams.get('billId');

  if (!billId) {
    return NextResponse.json({ error: 'billId is required' }, { status: 400 });
  }

  const oldDocId = searchParams.get('oldDocId');
  const newDocId = searchParams.get('newDocId');

  if (oldDocId && newDocId) {
    // Compare specific versions
    const versions = listTextVersions(billId);
    const oldVersion = versions.find(v => String(v.docId) === String(oldDocId));
    const newVersion = versions.find(v => String(v.docId) === String(newDocId));

    if (!oldVersion || !newVersion) {
      return NextResponse.json({ error: 'One or both text versions not found' }, { status: 404 });
    }

    const diffResult = computeDiff(oldVersion.text, newVersion.text);
    return NextResponse.json({
      diff: diffResult,
      oldVersion: { docId: oldVersion.docId, type: oldVersion.type, date: oldVersion.date },
      newVersion: { docId: newVersion.docId, type: newVersion.type, date: newVersion.date },
    });
  }

  // Return all stored diffs for this bill
  const diffs = listDiffsForBill(billId);
  const versions = listTextVersions(billId);

  return NextResponse.json({
    billId,
    versions: versions.map(v => ({ docId: v.docId, type: v.type, date: v.date })),
    diffs: diffs.map(d => ({
      oldDocId: d.oldDocId,
      newDocId: d.newDocId,
      oldType: d.oldType,
      newType: d.newType,
      stats: d.stats,
      createdAt: d.createdAt,
    })),
  });
}
