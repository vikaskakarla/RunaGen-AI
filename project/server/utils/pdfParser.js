import fs from 'fs/promises';

export async function parsePdfToText(filePath) {
  try {
    const buf = await fs.readFile(filePath);
    const pdfParse = (await import('pdf-parse')).default;

    // Suppress "Indexing all PDF objects" warning
    const originalWarn = console.warn;
    console.warn = (msg, ...args) => {
      if (typeof msg === 'string' && msg.includes('Indexing all PDF objects')) return;
      originalWarn.apply(console, [msg, ...args]);
    };

    let data;
    try {
      data = await pdfParse(buf);
    } finally {
      console.warn = originalWarn;
    }
    return String(data.text || '')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  } catch (error) {
    console.warn('PDF parse failed, returning empty text:', error?.message || error);
    return '';
  }
}


