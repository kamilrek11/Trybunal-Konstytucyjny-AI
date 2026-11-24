# Trybunał Konstytucyjny AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Statyczna strona HTML, która wczytuje ustawę (PDF/DOCX), ocenia ją względem Konstytucji RP przez API Gemini i pokazuje procent zgodności oraz listę zapisów niezgodnych/wątpliwych.

**Architecture:** Brak serwera. Logika w małych klasycznych skryptach JS (UMD: `module.exports` w Node dla testów, globalny obiekt `TK` w przeglądarce), bo moduły ES nie działają z `file://`. Przepływ: tekst → podział na artykuły → paczki → Gemini (JSON) → walidacja → wynik.

**Tech Stack:** HTML/CSS/JS bez bundlera; pdf.js i mammoth.js z CDN (wersje przypięte, ≥2 tygodnie starsze); `node --test` do testów jednostkowych; Playwright (preinstalowany) do testu przeglądarkowego z zamockowanym Gemini.

**Spec:** `docs/superpowers/specs/2026-11-24-trybunal-ai-design.md`

## Global Constraints

- Klucz API nigdy w kodzie ani repozytorium; użytkownik wpisuje go w polu strony (`localStorage`, w `try/catch`).
- Podstawa oceny wyłącznie tekst Konstytucji RP (Dz.U. 1997 nr 78 poz. 483), bez orzecznictwa.
- Interfejs i wyniki po polsku; stałe zastrzeżenie: „Szacunek AI, nie opinia prawna ani orzeczenie Trybunału."
- Poziomy: `niezgodny` 🔴, `watpliwy` 🟡, `zgodny` 🟢.
- Procent = `(zgodne + 0,5 × wątpliwe) / wszystkie artykuły × 100`, wzór widoczny w UI.
- Zarzut odrzucamy, gdy cytat nie występuje w tekście ustawy lub artykułu Konstytucji nie ma w dołączonym tekście.
- Brak OCR; PDF bez warstwy tekstowej → czytelny błąd.
- Statyczna strona działa po otwarciu `index.html` z dysku (bez modułów ES).

## Review Focus

1. Ustawa bez wzorca „Art. N." (np. uchwała, tekst bez numeracji): wynik powinien powstać przez podział awaryjny, nie błąd.
2. PDF będący skanem (pusty tekst): jasny komunikat po polsku, bez wywołania API.
3. Zły klucz (HTTP 400/401/403), limit (429), brak sieci: osobne, zrozumiałe komunikaty; 429 ponawiane z czekaniem, reszta nie.
4. Model zwraca niepoprawny JSON, artykuł typu „Art. 12a" lub cytat z innymi odstępami/łamaniem wierszy niż w PDF: nie psuje wyniku (normalizacja białych znaków, odrzucenie z licznikiem).
5. Tekst ustawy zawiera `<script>`/HTML: wyświetlany jako tekst, nie wykonywany.

---

### Task 1: Szkielet, higiena klucza, testowanie

**Files:**
- Create: `package.json` (tylko skrypt `"test": "node --test tests/"`, bez zależności), `.gitignore` (`node_modules/`, `.env*`, `*.key`), `README.md` (jak uzyskać klucz w Google AI Studio i jak uruchomić: otwórz `index.html`), `tests/no-secrets.test.js`

**Interfaces:**
- Produces: konwencja UMD dla wszystkich plików `js/*.js`: `(function (root) { const api = {...}; if (typeof module !== 'undefined') module.exports = api; else root.TK = Object.assign(root.TK || {}, api); })(this);`

- [ ] **Step 1:** Napisz `tests/no-secrets.test.js`: test `repo nie zawiera kluczy API` przechodzi po plikach śledzonych przez git (`git ls-files`) i oczekuje braku dopasowań `/AIza[0-9A-Za-z_-]{30,}/`.
- [ ] **Step 2:** Utwórz pliki z sekcji Files. Uruchom `npm test`, oczekiwany wynik: PASS.
- [ ] **Step 3:** Commit `chore: szkielet projektu i test braku sekretów`.

### Task 2: Tekst Konstytucji

**Files:**
- Create: `scripts/build-constitution.js` (jednorazowy generator), `js/constitution.js`, `tests/constitution.test.js`

**Interfaces:**
- Produces: `TK.CONSTITUTION: { articles: Array<{ num: string, text: string }>, fullText: string }`, gdzie `num` to np. `"2"`, a `fullText` to cały tekst do wklejenia w prompt.

- [ ] **Step 1:** Napisz `tests/constitution.test.js`: `ma 243 artykuły`; `art. 1 zawiera "dobrem wspólnym wszystkich obywateli"`; `art. 2 zawiera "demokratycznym państwem prawnym"`; `fullText zawiera "Art. 243"`.
- [ ] **Step 2:** Uruchom, oczekiwany wynik: FAIL (brak pliku).
- [ ] **Step 3:** Pobierz oficjalny tekst z eli.gov.pl (`https://eli.gov.pl/eli/DU/1997/483/ogl`, wersja tekstowa lub PDF), sparsuj do struktury powyżej skryptem `scripts/build-constitution.js` i zapisz wynik jako `js/constitution.js` (UMD, Task 1). Jeśli sieć blokuje pobranie, zatrzymaj się i zapytaj użytkownika o plik źródłowy, nie pisz tekstu z pamięci.
- [ ] **Step 4:** `npm test`, oczekiwany wynik: PASS. Przejrzyj ręcznie art. 2, 32, 233, 243 względem źródła.
- [ ] **Step 5:** Commit `feat: tekst Konstytucji RP`.

### Task 3: Podział ustawy na artykuły i paczki

**Files:**
- Create: `js/splitter.js`, `tests/splitter.test.js`

**Interfaces:**
- Produces: `splitArticles(text: string) -> Array<{ label: string, text: string }>` (`label` np. `"Art. 5"`, `"Art. 12a"`; bez wzorca „Art." zwraca bloki `"Fragment 1"`… po ok. 3000 znaków, cięte na granicach akapitu); `batchArticles(articles, maxChars = 12000) -> Array<Array<article>>` (artykuł dłuższy niż limit idzie sam).

- [ ] **Step 1:** Testy: `dzieli na Art. 1 i Art. 2`; `rozpoznaje Art. 12a`; `ustawa bez numeracji daje Fragment 1..n`; `batchArticles nie przekracza limitu poza pojedynczym długim artykułem`; `tekst przed pierwszym Art. (tytuł) nie ginie` (trafia do pierwszego elementu jako `"Wstęp"`).
- [ ] **Step 2:** Uruchom, oczekiwany wynik: FAIL.
- [ ] **Step 3:** Zaimplementuj oba w `js/splitter.js` (wzorzec początku linii `/^\s*Art\.\s*\d+[a-z]*\./m`).
- [ ] **Step 4:** `npm test`, oczekiwany wynik: PASS. Commit `feat: podział ustawy na artykuły i paczki`.

### Task 4: Walidacja zarzutów i procent

**Files:**
- Create: `js/validate.js`, `tests/validate.test.js`

**Interfaces:**
- Consumes: `TK.CONSTITUTION` (Task 2) przekazywany jako parametr.
- Produces: `normalize(s: string) -> string` (zwija białe znaki, łączy rozdzielone myślnikiem końce wierszy, ujednolica cudzysłowy, małe litery); `validateFindings(findings, lawText, constitution) -> { valid: Finding[], rejected: Array<{finding, reason}> }`; `computeScore(statuses: Array<'zgodny'|'watpliwy'|'niezgodny'>) -> number` (0–100, jedno miejsce po przecinku; pusta lista → 100).
- Typ `Finding`: `{ articleLabel: string, level: 'niezgodny'|'watpliwy', quote: string, constitutionArticles: string[], reasoning: string }`.

- [ ] **Step 1:** Testy: `computeScore(['zgodny','watpliwy','niezgodny','zgodny']) === 62.5`; `cytat z innymi odstępami i łamaniem wiersza jest akceptowany`; `cytat nieobecny w ustawie jest odrzucony z reason "cytat"`; `art. Konstytucji 999 odrzucony z reason "artykuł"`; `"Art. 2"` i `"2"` oba rozpoznane jako ten sam artykuł Konstytucji; `finding bez wymaganych pól odrzucony`.
- [ ] **Step 2:** Uruchom, oczekiwany wynik: FAIL.
- [ ] **Step 3:** Zaimplementuj w `js/validate.js`.
- [ ] **Step 4:** `npm test`, oczekiwany wynik: PASS. Commit `feat: walidacja zarzutów i wyliczenie procentu`.

### Task 5: Klient Gemini

**Files:**
- Create: `js/gemini.js`, `tests/gemini.test.js`

**Interfaces:**
- Consumes: `Finding` (Task 4).
- Produces: `buildPrompt(batch, constitutionFullText) -> string` (instrukcja po polsku: oceniaj tylko względem dołączonej Konstytucji, nie wymyślaj, cytuj dosłownie, zwracaj tylko problemy, każdy z polami `Finding`); `analyzeBatch({ apiKey, batch, constitutionFullText, model, fetchImpl = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), signal }) -> Promise<Finding[]>`; błędy jako `GeminiError` z `kind: 'auth'|'rate'|'network'|'bad_json'|'other'` i polskim `message`.
- Zachowanie: żądanie POST na `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`, klucz w nagłówku `x-goog-api-key`, `responseMimeType: "application/json"` ze schematem odpowiedzi; 429 ponawiane do 5 razy z rosnącym czekaniem (przez `sleep`), 400/401/403 → `auth` bez ponawiania, wyjątek fetch → `network`, niepoprawny JSON → jedno ponowienie, potem `bad_json`.
- Model: nazwę i dokładny format żądania potwierdź w oficjalnej dokumentacji Gemini API w dniu budowy; wpisz jako stałą `DEFAULT_MODEL` w `js/gemini.js` (nie z pamięci).

- [ ] **Step 1:** Testy z fałszywym `fetchImpl`: `poprawna odpowiedź zwraca Finding[]`; `429 dwa razy potem 200 → wynik, sleep wywołany 2 razy`; `401 → GeminiError kind auth, fetch wywołany raz`; `fetch rzuca → kind network`; `śmieci zamiast JSON → ponowienie, potem bad_json`; `klucz jest w nagłówku, nie w URL`; `signal przerwany → przerywa bez ponawiania`.
- [ ] **Step 2:** Uruchom, oczekiwany wynik: FAIL.
- [ ] **Step 3:** Zaimplementuj w `js/gemini.js`.
- [ ] **Step 4:** `npm test`, oczekiwany wynik: PASS. Commit `feat: klient Gemini z ponawianiem`.

### Task 6: Wyciąganie tekstu z PDF/DOCX

**Files:**
- Create: `js/extract.js`, `tests/extract.test.js`

**Interfaces:**
- Produces: `assertHasText(text: string) -> string` (czysta funkcja, Node: rzuca `Error` z komunikatem o braku warstwy tekstowej/OCR, gdy po `trim` jest mniej niż 200 znaków; w przeciwnym razie zwraca tekst); `extractText(file: File) -> Promise<string>` (tylko przeglądarka: `.pdf` przez pdf.js, `.docx` przez mammoth.js `extractRawText`, inne rozszerzenia → błąd „Obsługiwane formaty: PDF, DOCX"; wynik przechodzi przez `assertHasText`).

- [ ] **Step 1:** Testy dla `assertHasText`: `pusty tekst rzuca błąd z "OCR"`; `dłuższy tekst przechodzi bez zmian`.
- [ ] **Step 2:** Uruchom, oczekiwany wynik: FAIL.
- [ ] **Step 3:** Zaimplementuj `assertHasText` i `extractText`. Biblioteki ładowane w `index.html` (Task 7); `extractText` odwołuje się do globalnych `pdfjsLib` i `mammoth`.
- [ ] **Step 4:** `npm test`, oczekiwany wynik: PASS. Commit `feat: wyciąganie tekstu z PDF i DOCX`.

### Task 7: Interfejs i orkiestracja

**Files:**
- Create: `index.html`, `js/app.js`, `css/style.css`

**Interfaces:**
- Consumes: `TK.CONSTITUTION`, `TK.splitArticles`, `TK.batchArticles`, `TK.validateFindings`, `TK.computeScore`, `TK.analyzeBatch`, `TK.extractText` (Taski 2–6).
- Produces: `window.TK.runAnalysis(file) ` wywoływane z UI; strona działa po otwarciu z dysku.

Wymagania UI (układ jak w rozmowie z autorem):
- Pole klucza (type=password, zapis w `localStorage` w `try/catch`, przycisk „Wyczyść klucz"), przeciągnij-i-upuść plik, przycisk „Anuluj" (AbortController), pasek postępu „paczka X z Y", komunikat o czekaniu przy 429.
- Wynik: duży procent + wzór, liczniki 🔴/🟡 i odrzuconych jako niezweryfikowane, karty zarzutów (artykuł ustawy, cytat, naruszone artykuły Konstytucji, uzasadnienie), stałe zastrzeżenie na górze wyniku.
- Cały tekst pochodzący z ustawy lub modelu wstawiany przez `textContent` (nigdy `innerHTML`).
- Skrypty ładowane klasycznie `<script src>` w kolejności: biblioteki CDN, `constitution.js`, `splitter.js`, `validate.js`, `gemini.js`, `extract.js`, `app.js`.

- [ ] **Step 1:** Zbuduj stronę zgodnie z wymaganiami; wersje pdf.js i mammoth.js przypnij po sprawdzeniu najnowszych stabilnych na cdnjs sprzed ≥2 tygodni.
- [ ] **Step 2:** Sprawdź ręcznie w przeglądarce (Playwright, zrzut ekranu przy `deviceScaleFactor: 1`) pusty stan i stan z błędem „brak klucza".
- [ ] **Step 3:** Commit `feat: interfejs i orkiestracja analizy`.

### Task 8: Test przeglądarkowy z zamockowanym Gemini

**Files:**
- Create: `tests/e2e/smoke.test.js` (Playwright, odpalany ręcznie: `node tests/e2e/smoke.test.js`), `tests/e2e/fixtures/ustawa.docx` (generowany skryptem w teście lub dołączony mały plik z 3 artykułami, jeden celowo sprzeczny z Konstytucją)

- [ ] **Step 1:** Test: otwórz `file://…/index.html`, wpisz atrapę klucza `TEST-KEY` (nie prawdziwy), podmień żądania do `generativelanguage.googleapis.com` przez `page.route` na odpowiedź z jednym zarzutem 🔴 (cytat dosłownie z fixture) i jednym z cytatem zmyślonym; wgraj fixture; oczekuj: procent widoczny, 1 karta zarzutu, licznik „odrzucone: 1", zastrzeżenie widoczne.
- [ ] **Step 2:** Drugi przypadek: odpowiedź 401 z mocka → widoczny komunikat o złym kluczu, brak wyniku.
- [ ] **Step 3:** Trzeci przypadek: ustawa z `<script>alert(1)</script>` w treści → brak okna dialogowego, tekst widoczny dosłownie.
- [ ] **Step 4:** Uruchom, oczekiwany wynik: wszystkie trzy przypadki PASS. Commit `test: test przeglądarkowy z zamockowanym Gemini`.

### Task 9: Weryfikacja na prawdziwym API (z udziałem użytkownika)

- [ ] **Step 1:** Poproś użytkownika o wklejenie własnego klucza w pole na stronie (nie w czat) i wgranie małej prawdziwej ustawy.
- [ ] **Step 2:** Potwierdź, że CORS z `file://` działa. Jeśli nie, zatrzymaj się i zaproponuj użytkownikowi najprostsze obejście (np. uruchomienie `python3 -m http.server` w katalogu projektu).
- [ ] **Step 3:** Zaktualizuj `README.md` o wynik weryfikacji i znane limity darmowego API. Commit `docs: weryfikacja na prawdziwym API`.
