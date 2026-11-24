# Trybunał Konstytucyjny AI – projekt

Data: 2026-11-24

## Po co to jest
Aplikacja hobbystyczna, tylko dla autora. Użytkownik wgrywa ustawę (PDF lub DOCX) i dostaje:
1. szacunkowy stopień zgodności z Konstytucją RP,
2. listę zapisów ustawy, które są niezgodne z Konstytucją lub budzą wątpliwości, z cytatem, wskazaniem artykułu Konstytucji i uzasadnieniem.

## Cele
- Prosta obsługa: otwórz plik HTML, wklej klucz, wgraj ustawę.
- Ocena oparta wyłącznie na tekście Konstytucji RP (Dz.U. 1997 nr 78 poz. 483) dołączonym do aplikacji.
- Każdy zarzut da się sprawdzić: cytat z ustawy i artykuł Konstytucji są prawdziwe.

## Nie-cele
- Orzecznictwo TK, prawo UE, EKPCz, inne ustawy (autor zdecydował: tylko Konstytucja).
- Konta, historia analiz, serwer, baza danych.
- OCR skanów. PDF bez warstwy tekstowej daje czytelny błąd.
- Lokalny Bielik w wersji 1 (MacBook Neo ma 8 GB RAM; do rozważenia później).

## Anty-cele (porażka, nawet jeśli „działa")
- Zmyślone artykuły Konstytucji lub cytaty, których nie ma w ustawie.
- Wrażenie oficjalnego wyroku. Aplikacja zawsze pokazuje zastrzeżenie: „Szacunek AI, nie opinia prawna ani orzeczenie Trybunału."

## Ograniczenia
- Silnik: darmowe API Google Gemini, klucz generuje użytkownik w Google AI Studio i wkleja do strony (przechowywany w localStorage przeglądarki; nigdy nie wysyłany nigdzie poza Google).
- Wszystko działa w przeglądarce (statyczna strona, bez instalacji).
- Darmowe limity Gemini (zapytania/min, tokeny/min, zapytania/dzień) mogą spowalniać duże ustawy.

## Rozważone podejścia
- **A. Python + FastAPI + strona:** największa kontrola, łatwy Bielik przez Ollamę; wymaga instalacji.
- **B. Statyczna strona HTML (WYBRANE przez autora):** zero instalacji; słabsza droga do lokalnego Bielika, więcej pracy po stronie przeglądarki.
- **C. Streamlit:** najmniej kodu; trudniej o czytelny układ wyniku.

## Decyzje autora
- Tylko Konstytucja jako podstawa oceny.
- Gemini jako silnik, darmowy klucz.
- Podejście B.
- Wynik: procent + lista zarzutów z poziomami 🔴 niezgodny / 🟡 wątpliwy / 🟢 zgodny, w układzie naszkicowanym w rozmowie.

## Projekt (decyzje buildera – moje, do poprawienia)
- **Pliki:** `index.html` + `constitution.js` (tekst Konstytucji, pobrany z oficjalnego źródła eli.gov.pl) + biblioteki z CDN do PDF (pdf.js) i DOCX (mammoth.js), wersje przypięte.
- **Przepływ:** wczytanie pliku → wyciągnięcie tekstu → podział na artykuły (wzorzec „Art. N.") z awaryjnym podziałem na bloki o stałej długości, gdy ustawa tego nie ma → grupowanie w paczki → zapytanie do Gemini na paczkę (z pełnym tekstem Konstytucji w instrukcji) → odpowiedź w ustrukturyzowanym JSON → walidacja → scalenie i wyświetlenie.
- **Walidacja (przeciw zmyślaniu):** cytat zarzutu musi występować w tekście ustawy, a wskazany artykuł Konstytucji musi istnieć w dołączonym tekście; zarzuty niespełniające warunków są odrzucane lub oznaczane jako niezweryfikowane.
- **Procent zgodności:** (zgodne + 0,5 × wątpliwe) / wszystkie przeanalizowane artykuły × 100. Wzór jest pokazany w interfejsie. Wartość orientacyjna.
- **Limity:** pasek postępu, automatyczne czekanie i ponawianie po błędzie 429, możliwość przerwania.
- **Język interfejsu i wyników:** polski.
- **Model Gemini:** nazwa i limity do sprawdzenia w oficjalnej dokumentacji w dniu budowy (źródła są niespójne).
- **Do sprawdzenia przy budowie:** czy wywołania API Gemini działają z pliku otwartego lokalnie (CORS).

## Co zostaje buildowi
Dokładny prompt, rozmiar paczek, wygląd (kolory, układ), obsługa błędów, testy na przykładowej ustawie.
