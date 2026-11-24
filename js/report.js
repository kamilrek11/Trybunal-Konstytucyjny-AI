(function (root) {
  const norm = root.TK && root.TK.normalize ? root.TK.normalize : (typeof require !== 'undefined' ? require('./validate.js').normalize : (s) => String(s).toLowerCase());
  const compact = (s) => String(s).toLowerCase().replace(/\s+/g, '');
  const RANK = { zgodny: 0, watpliwy: 1, niezgodny: 2 };
  const { computeScore } = root.TK && root.TK.computeScore ? root.TK : require('./validate.js');

  function resolveLabel(articles, finding) {
    const byLabel = articles.find((a) => compact(a.label) === compact(finding.articleLabel));
    if (byLabel) return byLabel.label;
    const q = norm(finding.quote);
    const byQuote = articles.find((a) => norm(a.text).includes(q));
    return byQuote ? byQuote.label : null;
  }

  function buildReport(articles, valid, rejected) {
    const worst = new Map();
    const findings = valid.map((f) => {
      const label = resolveLabel(articles, f);
      if (label) {
        const prev = worst.get(label);
        if (!prev || RANK[f.level] > RANK[prev]) worst.set(label, f.level);
      }
      return { ...f, articleLabel: label || f.articleLabel };
    });
    findings.sort((a, b) => RANK[b.level] - RANK[a.level]);
    const statuses = articles.map((a) => worst.get(a.label) || 'zgodny');
    const counts = { niezgodny: 0, watpliwy: 0, zgodny: 0, rejected: rejected.length };
    statuses.forEach((s) => { counts[s]++; });
    return { score: computeScore(statuses), counts, findings, total: articles.length };
  }

  const api = { buildReport };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
