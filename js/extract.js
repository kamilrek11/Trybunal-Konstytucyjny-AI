(function (root) {
  const MIN_CHARS = 200;

  function assertHasText(text) {
    if (String(text).trim().length < MIN_CHARS) {
      throw new Error('Nie znaleziono tekstu w pliku. To może być skan bez warstwy tekstowej; aplikacja nie obsługuje OCR. Użyj pliku z zaznaczalnym tekstem.');
    }
    return text;
  }

  const SUPERSCRIPT = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

  // Składa elementy tekstu z pdf.js w linie. Mały, podniesiony fragment cyfr to indeks górny (np. Art. 22¹).
  function joinTextItems(items) {
    let out = '';
    let lastY = null;
    let lastH = 0;
    for (const item of items) {
      const y = item.transform ? item.transform[5] : null;
      const h = item.height || 0;
      let str = item.str;
      let newLine = false;
      if (out && lastY !== null && y !== null) {
        const dy = y - lastY;
        const threshold = Math.max(2, 0.6 * Math.max(h, lastH));
        if (Math.abs(dy) > threshold) newLine = true;
        else if (dy > 0 && h && lastH && h < 0.8 * lastH && /^\d+$/.test(str)) str = str.replace(/\d/g, (d) => SUPERSCRIPT[d]);
      }
      if (newLine) out += '\n';
      out += str;
      if (item.hasEOL) out += '\n';
      if (y !== null && !(h && lastH && h < 0.8 * lastH && !newLine)) { lastY = y; lastH = h; }
    }
    return out;
  }

  async function extractPdf(file) {
    const pdfjs = root.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const content = await (await doc.getPage(p)).getTextContent();
      const out = joinTextItems(content.items);
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

  const api = { assertHasText, extractText, joinTextItems };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
