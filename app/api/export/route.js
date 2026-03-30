import { NextResponse } from 'next/server';
import { loadBill, listTextVersions } from '@/lib/store';
import { getMarkups } from '@/lib/markups';
import { getAnnotations } from '@/lib/annotations';
import { buildPdfHtml, buildTestimonyPdfHtml } from '@/lib/pdf-template';
import { getTestimony } from '@/lib/testimonies';
import { requireSession } from '@/lib/session';

export async function GET(request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId');
    const versionDocId = searchParams.get('versionDocId');
    const testimonyId = searchParams.get('testimonyId');
    const type = searchParams.get('type');

    let html = '';
    let filename = 'export.pdf';

    if (type === 'testimony') {
      if (!testimonyId) return NextResponse.json({ error: 'testimonyId is required for testimony export' }, { status: 400 });
      const testimony = await getTestimony(session.workspaceId, testimonyId);
      if (!testimony) return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
      
      html = buildTestimonyPdfHtml({ testimony });
      filename = `${testimony.billNumber || 'Memorandum'}-testimony.pdf`;
    } else {
      if (!billId) {
        return NextResponse.json({ error: 'billId is required' }, { status: 400 });
      }

      // Load bill data
      const bill = await loadBill(session.workspaceId, billId);
      if (!bill) {
        return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
      }

      // Load text version
      let versionText = '';
      const versions = await listTextVersions(session.workspaceId, billId);
      if (versionDocId) {
        const v = versions.find(v => String(v.docId) === String(versionDocId));
        if (v?.text) {
          versionText = v.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      } else if (versions.length > 0) {
        const latest = versions[versions.length - 1];
        if (latest?.text) {
          versionText = latest.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Load markups and annotations
      const markups = await getMarkups(session.workspaceId, billId, versionDocId);
      const annotations = await getAnnotations(session.workspaceId, billId);

      // Optional testimony
      let testimony = null;
      if (testimonyId) {
        testimony = await getTestimony(session.workspaceId, testimonyId);
      }

      // Build HTML
      html = buildPdfHtml({ bill, versionText, markups, annotations, testimony });
      filename = `${bill.number || 'bill'}-export.pdf`;
    }

    // Render PDF with Puppeteer
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.75in', left: '0.5in' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 8pt; color: #94a3b8; text-align: center; width: 100%; padding: 0 0.5in;">
          <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
    });
    await browser.close();

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('PDF export error:', err);
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: `Export failed: ${err.message}` }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

