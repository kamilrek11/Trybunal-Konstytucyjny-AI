(function (root) {
  const ART_START = /^[ \t]*Art\.\s*(\d+[a-z]*)\./gm;
  const FRAGMENT_TARGET = 3000;
  const FRAGMENT_MAX = 4000;

  function hardCut(block) {
    const out = [];
    let rest = block;
    while (rest.length > FRAGMENT_MAX) {
      let cut = rest.lastIndexOf(' ', FRAGMENT_MAX);
      if (cut < FRAGMENT_MAX / 2) cut = FRAGMENT_MAX;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    if (rest) out.push(rest);
    return out;
  }

  function splitFragments(text) {
    const blocks = text.split(/\n+/).map((b) => b.trim()).filter(Boolean).flatMap(hardCut);
    const out = [];
    let cur = '';
    for (const b of blocks) {
      if (cur && cur.length + b.length + 1 > FRAGMENT_TARGET) {
        out.push(cur);
        cur = '';
      }
      cur = cur ? `${cur}\n${b}` : b;
    }
    if (cur) out.push(cur);
    return out.map((t, i) => ({ label: `Fragment ${i + 1}`, text: t }));
  }

  function splitArticles(text) {
    const starts = [...text.matchAll(ART_START)].map((m) => ({ index: m.index, num: m[1] }));
    if (starts.length === 0) return splitFragments(text);
    const out = [];
    const preamble = text.slice(0, starts[0].index).trim();
    if (preamble) out.push({ label: 'Wstęp', text: preamble });
    starts.forEach((s, i) => {
      const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
      out.push({ label: `Art. ${s.num}`, text: text.slice(s.index, end).trim() });
    });
    return out;
  }

  function batchArticles(articles, maxChars = 12000) {
    const batches = [];
    let cur = [];
    let size = 0;
    for (const a of articles) {
      if (cur.length && size + a.text.length > maxChars) {
        batches.push(cur);
        cur = [];
        size = 0;
      }
      cur.push(a);
      size += a.text.length;
    }
    if (cur.length) batches.push(cur);
    return batches;
  }

  const api = { splitArticles, batchArticles };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
