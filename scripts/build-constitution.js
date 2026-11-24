// Użycie: node scripts/build-constitution.js <tekst-z-pdftotext.txt>
// Źródło: https://eli.gov.pl/api/acts/DU/1997/483/text/U/D19970483Lj.pdf (tekst jednolity, Kancelaria Sejmu)
// Wcześniej: pdftotext -layout D19970483Lj.pdf plik.txt
const fs = require('node:fs');

const raw = fs.readFileSync(process.argv[2], 'utf8');
const cleaned = raw
  .split('\n')
  .map((l) => l.replace(/\s+/g, ' ').trim())
  .filter((l) => l && !/^©Kancelaria Sejmu/.test(l) && !/^\d{4}-\d{2}-\d{2}$/.test(l));
// Nagłówki rozdziałów i działów: wersaliki, "Rozdział X" oraz krótkie linie bez kropki tuż przed "Art. N".
const upper = (l) => /^[A-ZĄĆĘŁŃÓŚŹŻ ,.\-–]+$/.test(l) && l.length > 3;
const kept = cleaned.filter((l) => !upper(l) && !/^Rozdział [IVX]+$/.test(l));
const lines = [];
let nextIsArt = false;
for (let i = kept.length - 1; i >= 0; i--) {
  const l = kept[i];
  const heading = nextIsArt && l.length < 100 && !/[.;:?!)"”]$/.test(l) && !/^Art\./.test(l);
  if (heading) continue; // nextIsArt zostaje true: kolejny nagłówek nad nim też wypadnie
  lines.unshift(l);
  nextIsArt = /^Art\. \d/.test(l);
}
let text = lines.join('\n').replace(/([a-ząćęłńóśźż])-\n([a-ząćęłńóśźż])/g, '$1$2').replace(/\n/g, ' ');
const start = text.search(/Art\. 1\./);
if (start < 0) throw new Error('Nie znaleziono Art. 1.');
const body = text.slice(start);
const parts = body.split(/(?=Art\. \d+[a-z]?\. )/);
const articles = parts.map((p) => {
  const m = p.match(/^Art\. (\d+[a-z]?)\. /);
  return { num: m[1], text: p.trim() };
});
const fullText = articles.map((a) => a.text).join('\n\n');

const out = `// Wygenerowane przez scripts/build-constitution.js. Nie edytuj ręcznie.
// Źródło: Konstytucja RP, tekst jednolity (Dz.U. 1997 nr 78 poz. 483), eli.gov.pl
(function (root) {
  const CONSTITUTION = ${JSON.stringify({ articles, fullText }, null, 1)};
  const api = { CONSTITUTION };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
`;
fs.writeFileSync(__dirname + '/../js/constitution.js', out);
console.log('artykułów:', articles.length);
