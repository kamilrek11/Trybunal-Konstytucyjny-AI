# Generuje pliki DOCX do testu przeglądarkowego: python3 tests/e2e/make-fixtures.py
import os
from docx import Document

here = os.path.join(os.path.dirname(__file__), 'fixtures')

def make(name, paragraphs):
    d = Document()
    for p in paragraphs:
        d.add_paragraph(p)
    d.save(os.path.join(here, name))

make('ustawa.docx', [
    'USTAWA z dnia 1 stycznia 2030 r. o zezwoleniach testowych',
    'Art. 1. Ustawa określa zasady wydawania zezwoleń na prowadzenie działalności testowej na terytorium Rzeczypospolitej Polskiej.',
    'Art. 2. Minister może w drodze decyzji odmówić wydania zezwolenia bez podania przyczyn i bez prawa do odwołania.',
    'Art. 3. Ustawa wchodzi w życie po upływie 14 dni od dnia ogłoszenia w Dzienniku Ustaw Rzeczypospolitej Polskiej.',
])
make('xss.docx', [
    'Art. 1. Ustawa zawiera tekst <script>window.__xss=1;alert(1)</script> oraz <img src=x onerror="window.__xss=2"> który nie może zostać wykonany jako kod HTML.',
    'Art. 2. Dodatkowy przepis, aby tekst miał wystarczającą długość do analizy przez aplikację testową, bez żadnych zastrzeżeń.',
    'Art. 3. Kolejny przepis o charakterze ogólnym, który również nie budzi żadnych wątpliwości konstytucyjnych w tym teście.',
])
