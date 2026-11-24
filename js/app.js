(function () {
  const TK = window.TK;
  const $ = (id) => document.getElementById(id);
  const KEY_STORE = 'tk_api_key';
  const MODEL_STORE = 'tk_model';
  const LEVEL = { niezgodny: ['🔴', 'Niezgodny'], watpliwy: ['🟡', 'Wątpliwy'] };

  const store = {
    get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage niedostępny */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage niedostępny */ } },
  };

  let controller = null;

  function el(tag, props = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => { if (k === 'class') n.className = v; else n.setAttribute(k, v); });
    [].concat(children).forEach((c) => n.append(c));
    return n;
  }

  function showError(msg) {
    $('error').textContent = msg;
    $('error').hidden = false;
    $('status').hidden = true;
  }

  function renderResult(report, rejectedCount) {
    const c = report.counts;
    const root = $('result');
    root.replaceChildren();
    root.append(el('div', { class: 'disclaimer' }, 'Szacunek AI, nie opinia prawna ani orzeczenie Trybunału.'));
    root.append(el('div', { class: 'card score' }, [
      el('div', { class: 'hint' }, 'Zgodność z Konstytucją (orientacyjnie)'),
      el('div', { class: 'pct' }, `~${Math.round(report.score)}%`),
      el('div', { class: 'hint' }, `Wzór: (zgodne + 0,5 × wątpliwe) / wszystkie artykuły × 100 · przeanalizowano ${report.total}`),
      el('div', { class: 'counts' }, [
        `🔴 niezgodne: ${c.niezgodny}`, `🟡 wątpliwe: ${c.watpliwy}`, `🟢 zgodne: ${c.zgodny}`,
        ...(rejectedCount ? [`odrzucone jako niezweryfikowane: ${rejectedCount}`] : []),
        ...(c.unanalyzed ? [`⚠ nieprzeanalizowane (błąd odpowiedzi modelu): ${c.unanalyzed}`] : []),
      ].map((t) => el('span', {}, t))),
    ]));
    if (!report.findings.length) {
      root.append(el('div', { class: 'card' }, 'Nie znaleziono zapisów niezgodnych ani wątpliwych.'));
    } else {
      root.append(el('h2', { style: 'margin-top:24px' }, `Problematyczne zapisy (${report.findings.length})`));
    }
    for (const f of report.findings) {
      const [icon, name] = LEVEL[f.level];
      root.append(el('div', { class: `card finding ${f.level}` }, [
        el('h3', {}, `${icon} ${f.articleLabel} ustawy – ${name.toUpperCase()}`),
        el('blockquote', {}, `„${f.quote}"`),
        el('div', { class: 'refs' }, `Narusza: ${f.constitutionArticles.map((a) => `Art. ${String(a).replace(/^art\.?\s*/i, '')}`).join(', ')} Konstytucji`),
        el('p', {}, f.reasoning),
      ]));
    }
    root.hidden = false;
  }

  async function runAnalysis(file) {
    if (controller) return; // trwa już analiza
    $('error').hidden = true;
    $('result').hidden = true;
    const apiKey = $('apiKey').value.trim();
    if (!apiKey) return showError('Wklej najpierw klucz API Gemini.');
    store.set(KEY_STORE, apiKey);
    store.set(MODEL_STORE, $('model').value.trim());

    controller = new AbortController();
    $('status').hidden = false;
    $('statusText').textContent = 'Wczytuję plik…';
    $('progress').value = 0;
    try {
      const text = await TK.extractText(file);
      const articles = TK.splitArticles(text);
      const batches = TK.batchArticles(articles);
      $('progress').max = batches.length;
      const { findings: all, unanalyzed } = await TK.analyzeBatches(batches, async (batch) => {
        const found = await TK.analyzeBatch({
          apiKey, batch, constitutionFullText: TK.CONSTITUTION.fullText,
          model: $('model').value.trim() || TK.DEFAULT_MODEL, signal: controller.signal,
          sleep: (ms) => { $('statusText').textContent = `Czekam na limit darmowego API (${Math.round(ms / 1000)} s)…`; return new Promise((r) => setTimeout(r, ms)); },
        });
        $('progress').value += 1;
        return found;
      }, (i, n) => { $('statusText').textContent = `Analizuję paczkę ${i + 1} z ${n}…`; });
      const { valid, rejected } = TK.validateFindings(all, text, TK.CONSTITUTION);
      renderResult(TK.buildReport(articles, valid, rejected, unanalyzed), rejected.length);
      $('status').hidden = true;
    } catch (e) {
      if (e && e.kind === 'aborted') { $('status').hidden = true; return; }
      showError(e && e.message ? e.message : 'Nieoczekiwany błąd.');
    } finally {
      controller = null;
    }
  }
  TK.runAnalysis = runAnalysis;

  function init() {
    $('apiKey').value = store.get(KEY_STORE);
    $('model').value = store.get(MODEL_STORE) || TK.DEFAULT_MODEL;
    $('clearKey').addEventListener('click', () => { $('apiKey').value = ''; store.del(KEY_STORE); });
    $('cancel').addEventListener('click', () => { if (controller) controller.abort(); });
    const drop = $('drop');
    const pick = () => $('file').click();
    drop.addEventListener('click', pick);
    drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    $('file').addEventListener('change', (e) => { if (e.target.files[0]) runAnalysis(e.target.files[0]); e.target.value = ''; });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) runAnalysis(f); });
  }
  init();
})();
