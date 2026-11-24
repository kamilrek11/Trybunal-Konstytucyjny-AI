const test = require('node:test');
const assert = require('node:assert');
const { analyzeBatch, buildPrompt, GeminiError } = require('../js/gemini.js');

const batch = [{ label: 'Art. 1', text: 'Art. 1. Treść.' }];
const finding = { articleLabel: 'Art. 1', level: 'niezgodny', quote: 'Treść', constitutionArticles: ['2'], reasoning: 'x' };
const okBody = (payload) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] });
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
const base = { apiKey: 'TEST-KEY', batch, constitutionFullText: 'KONSTYTUCJA', model: 'm', sleep: async () => {} };

test('poprawna odpowiedź zwraca Finding[]', async () => {
  const r = await analyzeBatch({ ...base, fetchImpl: async () => res(200, okBody({ findings: [finding] })) });
  assert.deepStrictEqual(r, [finding]);
});

test('odpowiedź będąca samą tablicą też działa', async () => {
  const r = await analyzeBatch({ ...base, fetchImpl: async () => res(200, okBody([finding])) });
  assert.deepStrictEqual(r, [finding]);
});

test('429 dwa razy potem 200 → wynik, sleep wywołany 2 razy', async () => {
  let calls = 0, sleeps = 0;
  const fetchImpl = async () => (++calls <= 2 ? res(429, {}) : res(200, okBody({ findings: [] })));
  const r = await analyzeBatch({ ...base, fetchImpl, sleep: async () => { sleeps++; } });
  assert.deepStrictEqual(r, []);
  assert.strictEqual(sleeps, 2);
});

test('401 → GeminiError kind auth, fetch wywołany raz', async () => {
  let calls = 0;
  await assert.rejects(
    analyzeBatch({ ...base, fetchImpl: async () => { calls++; return res(401, {}); } }),
    (e) => e instanceof GeminiError && e.kind === 'auth'
  );
  assert.strictEqual(calls, 1);
});

test('400 z komunikatem o kluczu API → auth, inny 400 → other', async () => {
  await assert.rejects(
    analyzeBatch({ ...base, fetchImpl: async () => res(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }) }),
    (e) => e.kind === 'auth'
  );
  await assert.rejects(
    analyzeBatch({ ...base, fetchImpl: async () => res(400, { error: { message: 'Invalid JSON payload' } }) }),
    (e) => e.kind === 'other'
  );
});

test('fetch rzuca → kind network', async () => {
  await assert.rejects(
    analyzeBatch({ ...base, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }),
    (e) => e.kind === 'network'
  );
});

test('śmieci zamiast JSON → ponowienie, potem bad_json', async () => {
  let calls = 0;
  const garbage = { candidates: [{ content: { parts: [{ text: 'to nie jest json' }] } }] };
  await assert.rejects(
    analyzeBatch({ ...base, fetchImpl: async () => { calls++; return res(200, garbage); } }),
    (e) => e.kind === 'bad_json'
  );
  assert.strictEqual(calls, 2);
});

test('klucz jest w nagłówku, nie w URL', async () => {
  let seen;
  await analyzeBatch({ ...base, fetchImpl: async (url, opts) => { seen = { url, opts }; return res(200, okBody({ findings: [] })); } });
  assert.ok(!seen.url.includes('TEST-KEY'));
  assert.strictEqual(seen.opts.headers['x-goog-api-key'], 'TEST-KEY');
  assert.ok(seen.url.includes('/models/m:generateContent'));
  assert.strictEqual(JSON.parse(seen.opts.body).generationConfig.responseMimeType, 'application/json');
});

test('przerwany signal przerywa bez ponawiania', async () => {
  const ac = new AbortController();
  ac.abort();
  let calls = 0;
  await assert.rejects(
    analyzeBatch({ ...base, signal: ac.signal, fetchImpl: async () => { calls++; return res(200, okBody([])); } }),
    (e) => e.kind === 'aborted'
  );
  assert.strictEqual(calls, 0);
});

test('prompt zawiera Konstytucję, artykuły ustawy i zakaz zmyślania', () => {
  const p = buildPrompt(batch, 'TEKST-KONSTYTUCJI');
  assert.ok(p.includes('TEKST-KONSTYTUCJI'));
  assert.ok(p.includes('Art. 1. Treść.'));
  assert.ok(/dosłown/i.test(p));
});
