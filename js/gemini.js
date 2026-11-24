(function (root) {
  // Uwaga: nazwa modelu niezweryfikowana w oficjalnej dokumentacji (patrz ledger); w UI jest edytowalna.
  const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
  const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/';
  const MAX_RATE_RETRIES = 5;

  class GeminiError extends Error {
    constructor(kind, message) {
      super(message);
      this.name = 'GeminiError';
      this.kind = kind;
    }
  }

  function buildPrompt(batch, constitutionFullText) {
    const law = batch.map((a) => `[${a.label}]\n${a.text}`).join('\n\n');
    return [
      'Jesteś ekspertem prawa konstytucyjnego. Oceń fragmenty ustawy wyłącznie względem poniższego tekstu Konstytucji RP.',
      'Zasady:',
      '- Zgłaszaj tylko przepisy ustawy, które są niezgodne z Konstytucją (level "niezgodny") albo budzą poważne wątpliwości (level "watpliwy"). Przepisy zgodne pomijaj.',
      '- "quote" musi być dosłownym, krótkim cytatem z fragmentu ustawy (bez zmian, bez parafrazy).',
      '- "constitutionArticles" to numery artykułów Konstytucji z podanego tekstu (np. "2", "32"). Nie powołuj się na nic spoza podanego tekstu Konstytucji i nie wymyślaj artykułów.',
      '- "articleLabel" to etykieta fragmentu ustawy w nawiasach kwadratowych, np. "Art. 5".',
      '- "reasoning" to zwięzłe uzasadnienie po polsku.',
      '- Jeśli nic nie budzi zastrzeżeń, zwróć pustą listę.',
      'Odpowiedz wyłącznie JSON-em w postaci: {"findings":[{"articleLabel":"...","level":"niezgodny|watpliwy","quote":"...","constitutionArticles":["..."],"reasoning":"..."}]}',
      '',
      '=== KONSTYTUCJA RP ===',
      constitutionFullText,
      '',
      '=== FRAGMENTY USTAWY ===',
      law,
    ].join('\n');
  }

  function parseFindings(responseBody) {
    const text = responseBody && responseBody.candidates && responseBody.candidates[0] &&
      responseBody.candidates[0].content && responseBody.candidates[0].content.parts &&
      responseBody.candidates[0].content.parts.map((p) => p.text || '').join('');
    if (!text) throw new GeminiError('bad_json', 'Model nie zwrócił odpowiedzi.');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new GeminiError('bad_json', 'Model zwrócił odpowiedź, której nie da się odczytać.');
    }
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.findings;
    if (!Array.isArray(list)) throw new GeminiError('bad_json', 'Odpowiedź modelu ma nieoczekiwany format.');
    return list;
  }

  async function analyzeBatch({
    apiKey, batch, constitutionFullText, model = DEFAULT_MODEL,
    fetchImpl = (...a) => fetch(...a), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), signal,
  }) {
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(batch, constitutionFullText) }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    });
    const url = `${ENDPOINT}${encodeURIComponent(model)}:generateContent`;
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body, signal };

    let rateRetries = 0;
    let jsonRetried = false;
    for (;;) {
      if (signal && signal.aborted) throw new GeminiError('aborted', 'Analiza została przerwana.');
      let res;
      try {
        res = await fetchImpl(url, opts);
      } catch (e) {
        if (e && e.name === 'AbortError') throw new GeminiError('aborted', 'Analiza została przerwana.');
        throw new GeminiError('network', 'Brak połączenia z serwerem Google. Sprawdź internet.');
      }
      if (res.status === 429 || res.status === 503) {
        if (rateRetries >= MAX_RATE_RETRIES) {
          throw new GeminiError('rate', 'Przekroczono limit darmowego API (lub serwer jest przeciążony). Spróbuj za kilka minut.');
        }
        await sleep(Math.min(2000 * 2 ** rateRetries, 60000));
        rateRetries++;
        continue;
      }
      if (!res.ok) {
        let msg = '';
        try { const j = await res.json(); msg = (j && j.error && j.error.message) || ''; } catch (e) { /* brak treści */ }
        const keyProblem = res.status === 401 || res.status === 403 || (res.status === 400 && /api key/i.test(msg));
        if (keyProblem) throw new GeminiError('auth', 'Klucz API jest nieprawidłowy lub nie ma uprawnień.');
        throw new GeminiError('other', `Błąd API Gemini (HTTP ${res.status}). ${msg}`.trim());
      }
      try {
        return parseFindings(await res.json());
      } catch (e) {
        if (e instanceof GeminiError && e.kind === 'bad_json' && !jsonRetried) { jsonRetried = true; continue; }
        throw e;
      }
    }
  }

  const api = { DEFAULT_MODEL, GeminiError, buildPrompt, analyzeBatch };
  if (typeof module !== 'undefined') module.exports = api;
  else root.TK = Object.assign(root.TK || {}, api);
})(this);
