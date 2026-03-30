/**
 * Detect if text content is a PDF binary.
 * @param {string} text - Text content to check
 * @returns {boolean}
 */
export function isPdfContent(text) {
  if (!text) return false;
  return text.startsWith('%PDF') || text.includes('%PDF-');
}

/**
 * Extract readable text from a PDF buffer using pdfjs-dist.
 * @param {Buffer} buffer - PDF binary buffer
 * @returns {Promise<string>} Extracted plain text
 */
export async function extractPdfText(buffer) {
  try {
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const pdfData = await pdfParse(buffer);
    
    return pdfData.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch (err) {
    console.error('PDF extraction failed:', err.message);
    return '[PDF Text Extraction Failed]';
  }
}
