/**
 * Generates a self-contained HTML document for Puppeteer PDF rendering.
 * Includes bill metadata, text with inline markups, annotations, and branding.
 */
export function buildPdfHtml({ bill, versionText, markups = [], annotations = [], testimony = null }) {
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Apply markups to the bill text
  const renderedText = applyMarkups(versionText || '', markups);

  // Build annotations appendix
  const annotationHtml = annotations.length > 0 ? `
    <div class="section">
      <h2>📝 Annotations</h2>
      ${annotations.map((a, i) => `
        <div class="annotation-entry">
          <div class="annotation-marker">${i + 1}</div>
          <div>
            <div class="annotation-quote">"${escapeHtml((a.selectedText || '').slice(0, 300))}"</div>
            ${a.note ? `<div class="annotation-note">${escapeHtml(a.note)}</div>` : ''}
            <div class="annotation-date">${new Date(a.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Build testimony section if included
  const testimonyHtml = testimony ? `
    <div class="section testimony-section">
      <h2>✍️ Testimony: ${escapeHtml(testimony.title)}</h2>
      <div class="testimony-meta">Status: ${testimony.status === 'final' ? 'Final' : 'Draft'} · ${testimony.wordCount || 0} words</div>
      <div class="testimony-body">${testimony.body || ''}</div>
    </div>
  ` : '';

  // Determine position badge
  const positionBadge = bill.position ? `<span class="badge badge-${bill.position}">${capitalize(bill.position)}</span>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 11pt;
    color: #1e293b;
    line-height: 1.7;
    background: #fff;
  }

  .page {
    padding: 48px 56px;
    max-width: 800px;
    margin: 0 auto;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 3px solid #1e1b4b;
    margin-bottom: 24px;
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-logo {
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #4f46e5, #3b82f6);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 16px;
  }

  .header-title {
    font-size: 14pt;
    font-weight: 800;
    color: #1e1b4b;
    letter-spacing: -0.5px;
  }

  .header-subtitle {
    font-size: 8pt;
    color: #64748b;
    font-weight: 400;
  }

  .header-date {
    font-size: 9pt;
    color: #64748b;
    text-align: right;
  }

  /* Bill info */
  .bill-header {
    margin-bottom: 24px;
  }

  .bill-number {
    font-size: 20pt;
    font-weight: 800;
    color: #0f172a;
    margin-bottom: 4px;
  }

  .bill-title {
    font-size: 12pt;
    color: #334155;
    margin-bottom: 12px;
    line-height: 1.5;
  }

  .badge-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  .badge-status {
    background: #eef2ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
  }

  .badge-jurisdiction {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }

  .badge-support {
    background: #f0fdf4;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }

  .badge-oppose {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  .badge-watch {
    background: #fffbeb;
    color: #b45309;
    border: 1px solid #fde68a;
  }

  .badge-neutral {
    background: #f8fafc;
    color: #475569;
    border: 1px solid #e2e8f0;
  }

  /* Sections */
  .section {
    margin-bottom: 28px;
  }

  .section h2 {
    font-size: 12pt;
    font-weight: 700;
    color: #1e1b4b;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e8f0;
  }

  /* Bill text */
  .bill-text {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    line-height: 1.8;
    color: #1e293b;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Markup styles */
  .markup-highlight {
    background: #fef9c3;
    padding: 1px 2px;
    border-radius: 2px;
  }

  .markup-strikethrough {
    text-decoration: line-through;
    color: #dc2626;
    background: #fef2f2;
    padding: 1px 2px;
    border-radius: 2px;
  }

  .markup-suggest {
    background: #f0fdf4;
    color: #15803d;
    border-bottom: 2px solid #22c55e;
    padding: 1px 2px;
    border-radius: 2px;
  }

  .suggest-label {
    font-size: 7pt;
    color: #15803d;
    font-weight: 700;
    vertical-align: super;
  }

  /* CRS Summary */
  .crs-summary {
    padding: 16px 20px;
    background: #f8fafc;
    border-left: 4px solid #3b82f6;
    border-radius: 0 8px 8px 0;
    font-size: 10pt;
    color: #334155;
    line-height: 1.7;
  }

  /* Metadata grid */
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .meta-item label {
    font-size: 8pt;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    display: block;
    margin-bottom: 2px;
  }

  .meta-item span {
    font-size: 10pt;
    color: #1e293b;
  }

  /* Annotations */
  .annotation-entry {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f1f5f9;
  }

  .annotation-marker {
    width: 24px;
    height: 24px;
    background: #7c3aed;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8pt;
    font-weight: 700;
    flex-shrink: 0;
  }

  .annotation-quote {
    font-style: italic;
    color: #475569;
    font-size: 9.5pt;
    margin-bottom: 4px;
  }

  .annotation-note {
    font-size: 10pt;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .annotation-date {
    font-size: 8pt;
    color: #94a3b8;
  }

  /* Testimony */
  .testimony-section {
    page-break-before: always;
  }

  .testimony-meta {
    font-size: 9pt;
    color: #64748b;
    margin-bottom: 16px;
  }

  .testimony-body {
    font-size: 11pt;
    line-height: 1.8;
  }

  .testimony-body h1, .testimony-body h2, .testimony-body h3 {
    margin: 16px 0 8px;
  }

  .testimony-body blockquote {
    border-left: 3px solid #6366f1;
    padding-left: 16px;
    margin: 12px 0;
    color: #475569;
    font-style: italic;
  }

  /* Footer */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-brand">
      <div class="header-logo">⚖️</div>
      <div>
        <div class="header-title">LegisTracker</div>
        <div class="header-subtitle">Legislative Document Export</div>
      </div>
    </div>
    <div class="header-date">
      Exported: ${exportDate}
    </div>
  </div>

  <!-- Bill Header -->
  <div class="bill-header">
    <div class="bill-number">${escapeHtml(bill.number || '')}</div>
    <div class="bill-title">${escapeHtml(bill.title || '')}</div>
    <div class="badge-row">
      <span class="badge badge-status">${escapeHtml(bill.status || 'Unknown')}</span>
      <span class="badge badge-jurisdiction">${escapeHtml(bill.jurisdiction || '')}</span>
      ${positionBadge}
    </div>
  </div>

  <!-- Metadata -->
  <div class="meta-grid">
    <div class="meta-item">
      <label>Session</label>
      <span>${escapeHtml(bill.session || 'N/A')}</span>
    </div>
    <div class="meta-item">
      <label>Last Action</label>
      <span>${escapeHtml(bill.lastActionDate || 'N/A')}</span>
    </div>
    <div class="meta-item">
      <label>Introduced</label>
      <span>${escapeHtml(bill.introducedDate || 'N/A')}</span>
    </div>
    <div class="meta-item">
      <label>Sponsors</label>
      <span>${bill.sponsors?.length || 0} sponsor${(bill.sponsors?.length || 0) !== 1 ? 's' : ''}</span>
    </div>
  </div>

  ${bill.crsSummary ? `
  <div class="section">
    <h2>📋 CRS Summary</h2>
    <div class="crs-summary">${bill.crsSummary}</div>
  </div>
  ` : ''}

  ${renderedText ? `
  <div class="section">
    <h2>📜 Bill Text</h2>
    <div class="bill-text">${renderedText}</div>
  </div>
  ` : ''}

  ${annotationHtml}

  ${testimonyHtml}

  <div class="footer">
    Generated by LegisTracker · ${exportDate} · For informational purposes only
  </div>
</div>
</body>
</html>`;
}

/**
 * Generates an unbranded, professional legislative memorandum for proper testimony submission.
 */
export function buildTestimonyPdfHtml({ testimony }) {
  const exportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const positionMap = {
    support: 'SUPPORT',
    oppose: 'OPPOSE',
    neutral: 'NEUTRAL',
    interested: 'INTERESTED PARTY'
  };

  const positionText = positionMap[testimony.position] || 'NEUTRAL';
  let dateText = testimony.committeeDate ? new Date(testimony.committeeDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }) : exportDate;

  let renderedBody = testimony.body || '';
  try {
    if (renderedBody.trim().startsWith('[')) {
      const blocks = JSON.parse(renderedBody);
      
      const blockPositionMap = {
        support: 'SUPPORT',
        oppose: 'OPPOSE',
        neutral: 'NEUTRAL',
        interested: 'INTERESTED PARTY',
        amend: 'AMEND'
      };
      
      renderedBody = blocks.map(b => {
        if (b.type === 'section') {
           const ref = b.reference ? `§ ${b.reference}` : 'Section Analysis';
           const pos = blockPositionMap[b.position || 'neutral'] || 'NEUTRAL';
           // Stylized Section sub-header
           return `<div class="section-block" style="margin-top: 30px;">
                     <h3 style="margin-bottom: 15px; border-bottom: 2px solid #334155; padding-bottom: 4px; display: inline-block;">${escapeHtml(ref)} &mdash; ${pos}</h3>
                     ${b.content || ''}
                   </div>`;
        }
        return `<div class="intro-block" style="margin-top: 20px;">${b.content || ''}</div>`;
      }).join('\\n');
    }
  } catch (e) {
    // Legacy raw HTML string fallback
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    margin: 1in;
  }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    color: #000;
    line-height: 1.5;
    background: #fff;
  }

  .document-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .memorandum-title {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 30px;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
  }

  .memo-header {
    display: table;
    width: 100%;
    margin-bottom: 30px;
    border-bottom: 2px solid #000;
    padding-bottom: 20px;
  }

  .memo-row {
    display: table-row;
  }

  .memo-label {
    display: table-cell;
    width: 100px;
    font-weight: bold;
    text-transform: uppercase;
    padding-bottom: 10px;
    vertical-align: top;
  }

  .memo-value {
    display: table-cell;
    padding-bottom: 10px;
    vertical-align: top;
  }

  .memo-author-info {
    font-weight: bold;
  }
  .memo-org-info {
    font-style: italic;
  }

  .memo-position {
    font-weight: bold;
    text-decoration: underline;
  }

  .body-content {
    text-align: justify;
  }

  .body-content p {
    margin-bottom: 15px;
  }

  .body-content h1, .body-content h2, .body-content h3 {
    font-weight: bold;
    margin: 20px 0 10px 0;
    page-break-after: avoid;
  }

  .body-content h1 { font-size: 14pt; }
  .body-content h2 { font-size: 13pt; text-transform: uppercase; }
  .body-content h3 { font-size: 12pt; font-style: italic; }

  .body-content ul, .body-content ol {
    margin-left: 20px;
    margin-bottom: 15px;
  }
  
  .body-content blockquote {
    margin: 15px 40px;
    font-style: italic;
  }
</style>
</head>
<body>
<div class="document-container">
  
  <div class="memorandum-title">Written Testimony</div>

  <div class="memo-header">
    <div class="memo-row">
      <div class="memo-label">DATE:</div>
      <div class="memo-value">${dateText}</div>
    </div>
    <div class="memo-row">
      <div class="memo-label">TO:</div>
      <div class="memo-value">Members of the Committee</div>
    </div>
    <div class="memo-row">
      <div class="memo-label">FROM:</div>
      <div class="memo-value">
        <span class="memo-author-info">${escapeHtml(testimony.authorName || 'Concerned Citizen')}</span><br>
        ${testimony.jobTitle ? `<span class="memo-org-info">${escapeHtml(testimony.jobTitle)}</span><br>` : ''}
        ${testimony.organization ? `<span class="memo-org-info">${escapeHtml(testimony.organization)}</span>` : ''}
      </div>
    </div>
    <div class="memo-row">
      <div class="memo-label">RE:</div>
      <div class="memo-value">
        <strong>${escapeHtml(testimony.billNumber || '')}</strong>${testimony.billTitle ? ` - ${escapeHtml(testimony.billTitle)}` : ''}
        ${testimony.sectionRef ? `<br><em>Section: ${escapeHtml(testimony.sectionRef)}</em>` : ''}
      </div>
    </div>
    <div class="memo-row">
      <div class="memo-label">POSITION:</div>
      <div class="memo-value memo-position">${escapeHtml(positionText)}</div>
    </div>
  </div>

  <div class="body-content">
    ${renderedBody}
  </div>

</div>
</body>
</html>`;
}

/**
 * Apply markups to plain text, returning HTML with inline markup elements.
 * Sorts markups by startOffset and applies them without overlapping.
 */
function applyMarkups(text, markups) {
  if (!markups.length) return escapeHtml(text);

  // Sort by startOffset descending so we can insert from end without shifting indices
  const sorted = [...markups].sort((a, b) => b.startOffset - a.startOffset);
  let result = text;

  for (const m of sorted) {
    const before = result.slice(0, m.startOffset);
    const selected = result.slice(m.startOffset, m.endOffset);
    const after = result.slice(m.endOffset);

    let replacement = '';
    if (m.type === 'highlight') {
      replacement = `<span class="markup-highlight">${escapeHtml(selected)}</span>`;
    } else if (m.type === 'strikethrough') {
      replacement = `<span class="markup-strikethrough">${escapeHtml(selected)}</span>`;
    } else if (m.type === 'suggest') {
      replacement = `<span class="markup-strikethrough">${escapeHtml(selected)}</span> <span class="markup-suggest">${escapeHtml(m.suggestedText || '')}</span><span class="suggest-label"> [suggested]</span>`;
    }

    result = before + replacement + after;
  }

  // Escape any remaining unprocessed text sections
  // Since we're already inserting HTML, we need to be careful
  // The approach above handles it per-markup
  return result;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
