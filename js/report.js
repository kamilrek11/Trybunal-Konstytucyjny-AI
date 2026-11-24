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

  function buildReport(articles, valid, rejected, unanalyzedLabels = []) {
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
    const skipped = new Set(unanalyzedLabels);
    // Wstęp (tytuł, nagłówek) nie jest artykułem: liczy się tylko, gdy ma na sobie zarzut.
    const scored = articles.filter((a) => !skipped.has(a.label) && (a.label !== 'Wstęp' || worst.has(a.label)));
    const statuses = scored.map((a) => worst.get(a.label) || 'zgodny');
    const counts = { niezgodny: 0, watpliwy: 0, zgodny: 0, rejected: rejected.length, unanalyzed: skipped.size };
    statuses.forEach((s) => { counts[s]++; });
    return { score: computeScore(statuses), counts, findings, total: scored.length };
  }

  // Analizuje paczki po kolei. bad_json w jednej paczce nie przerywa reszty (jej artykuły trafiają do `unanalyzed`);
  // każdy inny błąd (klucz, sieć, limit) przerywa całość.
  async function analyzeBatches(batches, analyzeFn, onProgress = () => {}) {
    const findings = [];
    const unanalyzed = [];
    for (let i = 0; i < batches.length; i++) {
      onProgress(i, batches.length);
      try {
        findings.push(...(await analyzeFn(batches[i], i)));
      } catch (e) {
        if (e && e.kind === 'bad_json') unanalyzed.push(...batches[i].map((a) => a.label));
        else throw e;
      }
    }
    return { findings, unanalyzed };
  }

  const api = { buildReport, analyzeBatches };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
