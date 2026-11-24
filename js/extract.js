(function (root) {
  const MIN_CHARS = 200;

  function assertHasText(text) {
    if (String(text).trim().length < MIN_CHARS) {
      throw new Error('Nie znaleziono tekstu w pliku. To może być skan bez warstwy tekstowej; aplikacja nie obsługuje OCR. Użyj pliku z zaznaczalnym tekstem.');
    }
    return text;
  }

  async function extractPdf(file) {
    const pdfjs = root.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      let out = '';
      let lastY = null;
      for (const item of content.items) {
        const y = item.transform ? item.transform[5] : null;
        if (out && lastY !== null && y !== null && Math.abs(y - lastY) > 2) out += '\n';
        out += item.str;
        if (item.hasEOL) out += '\n';
        if (y !== null) lastY = y;
      }
      pages.push(out);
    }
    return pages.join('\n');
  }

  async function extractDocx(file) {
    const r = await root.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return r.value;
  }

  async function extractText(file) {
    const name = (file.name || '').toLowerCase();
    let text;
    if (name.endsWith('.pdf')) text = await extractPdf(file);
    else if (name.endsWith('.docx')) text = await extractDocx(file);
    else throw new Error('Obsługiwane formaty: PDF, DOCX.');
    return assertHasText(text);
  }

  const api = { assertHasText, extractText };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
