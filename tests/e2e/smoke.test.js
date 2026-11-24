// Uruchomienie ręczne: NODE_PATH=$(npm root -g) node tests/e2e/smoke.test.js
const assert = require('node:assert');
const path = require('node:path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.resolve(__dirname, '../../index.html');
const fx = (n) => path.join(__dirname, 'fixtures', n);
const gemini = (payload) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] });

async function open(browser, handler) {
  const page = await browser.newPage();
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
  const requests = [];
  await page.route('**/generativelanguage.googleapis.com/**', (route) => {
    requests.push({ url: route.request().url(), headers: route.request().headers() });
    return handler(route);
  });
  await page.goto(PAGE);
  await page.fill('#apiKey', 'TEST-KEY');
  return { page, dialogs, requests };
}

(async () => {
  const browser = await chromium.launch();

  // 1. zarzut prawdziwy + zmyślony cytat
  {
    const { page, requests } = await open(browser, (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(gemini({ findings: [
        { articleLabel: 'Art. 2', level: 'niezgodny', quote: 'odmówić wydania zezwolenia bez podania przyczyn', constitutionArticles: ['2', '45'], reasoning: 'Arbitralność decyzji.' },
        { articleLabel: 'Art. 1', level: 'watpliwy', quote: 'ten cytat nie istnieje w ustawie', constitutionArticles: ['2'], reasoning: 'Zmyślone.' },
      ] })),
    }));
    await page.setInputFiles('#file', fx('ustawa.docx'));
    await page.waitForSelector('#result:not([hidden])');
    assert.match(await page.textContent('#result'), /~67%/);
    assert.strictEqual(await page.locator('.finding').count(), 1);
    assert.match(await page.textContent('#result'), /odrzucone jako niezweryfikowane: 1/);
    assert.match(await page.textContent('#result'), /Szacunek AI, nie opinia prawna/);
    assert.match(await page.textContent('.finding'), /Art\. 45 Konstytucji/);
    assert.ok(requests.length >= 1);
    assert.ok(!requests[0].url.includes('TEST-KEY'));
    assert.strictEqual(requests[0].headers['x-goog-api-key'], 'TEST-KEY');
    await page.close();
    console.log('PASS 1: wynik, odrzucenie zmyślonego cytatu, klucz w nagłówku');
  }

  // 2. zły klucz
  {
    const { page } = await open(browser, (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.setInputFiles('#file', fx('ustawa.docx'));
    await page.waitForSelector('#error:not([hidden])');
    assert.match(await page.textContent('#error'), /Klucz API jest nieprawidłowy/);
    assert.ok(await page.locator('#result').isHidden());
    await page.close();
    console.log('PASS 2: zły klucz');
  }

  // 3. XSS
  {
    const { page, dialogs } = await open(browser, (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(gemini({ findings: [
        { articleLabel: 'Art. 1', level: 'watpliwy', quote: '<script>window.__xss=1;alert(1)</script>', constitutionArticles: ['2'], reasoning: '<img src=x onerror="window.__xss=3">' },
      ] })),
    }));
    await page.setInputFiles('#file', fx('xss.docx'));
    await page.waitForSelector('#result:not([hidden])');
    assert.strictEqual(await page.locator('.finding').count(), 1);
    assert.match(await page.textContent('.finding blockquote'), /<script>window\.__xss=1;alert\(1\)<\/script>/);
    assert.strictEqual(await page.locator('#result script, #result img').count(), 0);
    assert.strictEqual(await page.evaluate(() => window.__xss), undefined);
    assert.deepStrictEqual(dialogs, []);
    await page.close();
    console.log('PASS 3: HTML z ustawy nie jest wykonywany');
  }

  // 4. druga analiza w trakcie pierwszej nie startuje
  {
    let release;
    const gate = new Promise((r) => { release = r; });
    const { page, requests } = await open(browser, async (route) => {
      await gate;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(gemini({ findings: [] })) });
    });
    await page.setInputFiles('#file', fx('ustawa.docx'));
    await page.waitForFunction(() => /paczk/.test(document.getElementById('statusText').textContent));
    await page.setInputFiles('#file', fx('xss.docx'));
    await page.waitForTimeout(300);
    release();
    await page.waitForSelector('#result:not([hidden])');
    assert.strictEqual(requests.length, 1);
    await page.close();
    console.log('PASS 4: brak nakładających się analiz');
  }

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
