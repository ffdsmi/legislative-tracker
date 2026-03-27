import { diffLines } from 'diff';

/**
 * Compare two versions of bill text and produce a structured diff.
 * Uses the `diff` npm package for deterministic, line-by-line comparison.
 *
 * @param {string} oldText - Previous version of the bill text
 * @param {string} newText - New version of the bill text
 * @returns {{ lines: Array, stats: { additions: number, removals: number, unchanged: number } }}
 */
export function computeDiff(oldText, newText) {
  if (!oldText && !newText) {
    return { lines: [], stats: { additions: 0, removals: 0, unchanged: 0 } };
  }
  if (!oldText) {
    const addedLines = newText.split('\n').map((line, i) => ({
      type: 'added',
      content: line,
      lineNumber: i + 1,
    }));
    return { lines: addedLines, stats: { additions: addedLines.length, removals: 0, unchanged: 0 } };
  }
  if (!newText) {
    const removedLines = oldText.split('\n').map((line, i) => ({
      type: 'removed',
      content: line,
      lineNumber: i + 1,
    }));
    return { lines: removedLines, stats: { additions: 0, removals: removedLines.length, unchanged: 0 } };
  }

  const changes = diffLines(oldText, newText);
  const lines = [];
  let oldLineNum = 1;
  let newLineNum = 1;
  let additions = 0;
  let removals = 0;
  let unchanged = 0;

  for (const change of changes) {
    const changeLines = change.value.replace(/\n$/, '').split('\n');

    for (const line of changeLines) {
      if (change.added) {
        lines.push({
          type: 'added',
          content: line,
          newLineNumber: newLineNum++,
        });
        additions++;
      } else if (change.removed) {
        lines.push({
          type: 'removed',
          content: line,
          oldLineNumber: oldLineNum++,
        });
        removals++;
      } else {
        lines.push({
          type: 'unchanged',
          content: line,
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        });
        unchanged++;
      }
    }
  }

  return { lines, stats: { additions, removals, unchanged } };
}

/**
 * Strip HTML tags from bill text for clean text-based diffing.
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Generate a summary of changes between two bill texts.
 * @param {object} diffResult - Result from computeDiff
 * @returns {string} Human-readable summary
 */
export function summarizeDiff(diffResult) {
  const { stats } = diffResult;
  const parts = [];
  if (stats.additions > 0) parts.push(`${stats.additions} line${stats.additions > 1 ? 's' : ''} added`);
  if (stats.removals > 0) parts.push(`${stats.removals} line${stats.removals > 1 ? 's' : ''} removed`);
  if (parts.length === 0) return 'No changes detected';
  return parts.join(', ');
}
