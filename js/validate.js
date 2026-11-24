(function (root) {
  const LEVELS = ['niezgodny', 'watpliwy'];

  function normalize(s) {
    return String(s)
      .replace(/([\p{L}])-\s*\n\s*([\p{L}])/gu, '$1$2')
      .replace(/[„”“”"]/g, '"')
      .replace(/[‘’']/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function articleNum(ref) {
    const m = String(ref).match(/\d+[a-z]*/i);
    return m ? m[0].toLowerCase() : null;
  }

  function validateFindings(findings, lawText, constitution) {
    const valid = [];
    const rejected = [];
    const law = normalize(lawText);
    const known = new Set(constitution.articles.map((a) => a.num.toLowerCase()));
    for (const f of findings) {
      const ok =
        f && typeof f === 'object' &&
        typeof f.articleLabel === 'string' && f.articleLabel &&
        LEVELS.includes(f.level) &&
        typeof f.quote === 'string' && f.quote.trim() &&
        Array.isArray(f.constitutionArticles) && f.constitutionArticles.length > 0 &&
        typeof f.reasoning === 'string';
      if (!ok) { rejected.push({ finding: f, reason: 'format' }); continue; }
      if (!law.includes(normalize(f.quote))) { rejected.push({ finding: f, reason: 'cytat' }); continue; }
      const nums = f.constitutionArticles.map(articleNum);
      if (nums.some((n) => !n || !known.has(n))) { rejected.push({ finding: f, reason: 'artykuł' }); continue; }
      valid.push(f);
    }
    return { valid, rejected };
  }

  function computeScore(statuses) {
    if (!statuses.length) return 100;
    const points = statuses.reduce((s, x) => s + (x === 'zgodny' ? 1 : x === 'watpliwy' ? 0.5 : 0), 0);
    return Math.round((points / statuses.length) * 1000) / 10;
  }

  const api = { normalize, validateFindings, computeScore };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
