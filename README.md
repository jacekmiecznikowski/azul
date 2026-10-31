# Sintra Glass — przeglądarkowa gra witrażowa

Nieoficjalna adaptacja mechaniki **Azul: Witraże Sintry**, z autorskim interfejsem, lokalnymi przeciwnikami AI i zapisem rozgrywki w przeglądarce.

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide i Vitest. Bez serwera i płatnych usług.

## Uruchomienie

Wymagany Node.js **22.12+**.

```bash
npm install
npm run dev
```

Otwórz adres wskazany przez Vite (zazwyczaj `http://localhost:5173`). Build: `npm run build`; testy: `npm test`.

### Problemy z instalacją na Windows / PowerShell

W razie błędu npm `Cannot read properties of null (reading 'edgesOut')` pobierz najnowszy kod (Vitest 5 zastępuje Vitest 4, który wywoływał znany problem w npm 10):

```powershell
git pull --ff-only
if (Test-Path .\node_modules) { Remove-Item -Recurse -Force .\node_modules }
if (Test-Path .\package-lock.json) { Remove-Item -Force .\package-lock.json }
npm.cmd install
npm.cmd run dev
```

Node.js 22.18.0 jest zgodny z Vite 8 i Vitest 5. Nie próbuj instalować npm 12 na tej wersji Node.


## Układ stołu na ekranie (v3)

- Na desktopach (od 1200 px szerokości i 700 px wysokości) stół z ośmioma kwaterami **każdego** gracza, warsztatami, żetonem pierwszego gracza oraz torem stłuczeń mieści się w oknie bez przewijania całej strony.
- Przeciwnicy korzystają z tego samego renderer'a `WindowCard` co człowiek: pięć pól, widok rewersu, ukończone ramy i pozycja witrażysty są bezpośrednio widoczne na planszy.
- Twoje kwatery są na dole stołu, przycisk **Cofnij witrażystę** znajduje się w nagłówku Twojej planszy. Warsztaty są na środku, a boty wokół stołu.
- Wyniki oraz tor stłuczeń pozostają widoczne obok stołu; tylko historia ruchów przewija się wewnątrz panelu.
- Na węższych ekranach aplikacja przechodzi w przewijalny układ, aby utrzymać czytelność i dostępność przycisków (nie ukrywa żadnej planszy).

## Co jest zaimplementowane

- Gra 2–4-osobowa: 1 człowiek + od 1 do 3 botów.
- Trzy poziomy AI: **łatwy** (losowy), **normalny** (ocena bieżącego ruchu) i **trudny** (strategiczne premiowanie postępu i punktów okien).
- 5/7/9 warsztatów po 4 tafle oraz środek stołu; rozgrywka 6 rund, znacznik pierwszego gracza.
- Osiem dwustronnych kwater po pięć pól, pola joker, przesuwanie i cofanie witrażysty, wybór tafli zachowywanej w gotowym witrażu.
- Punktowanie bezpośrednie, premie za kolor rundy, kary za stłuczenie, końcowy wynik dla stron A/B pałacu, rozstrzyganie remisów.
- Wznawianie partii z `localStorage`, podgląd plansz botów, poradnik i widok mobilny.
- Oddzielny silnik zasad `src/game/engine.ts` i algorytm AI `src/game/ai.ts`. Testy sprawdzają również kompletne gry botów i bilans 100 tafli.

## Ważne odstępstwa

To wersja fanowska, **nie oficjalna implementacja ani produkt wydawcy**. Układy kolorów na dwustronnych kwaterach są autorskimi wariantami (nie są skanami ani wierną reprodukcją fizycznych plansz). Grafiki i ornamenty UI powstały specjalnie dla aplikacji. Wykorzystano mechanikę i punktowanie opisane w instrukcji gry; nie dołączono znaków towarowych ani grafik wydawcy.

## Organizacja

```text
src/
  App.tsx             # ekran, modale, interakcje użytkownika
  styles.css          # responsywny motyw dark / glass
  game/engine.ts      # stan gry, dozwolone ruchy, punktowanie
  game/ai.ts          # strategie AI
  game/engine.test.ts # testy zasad
```

## Zasady i autorstwo

Pierwotna gra planszowa: **Azul: Stained Glass of Sintra / Witraże Sintry**, autor: **Michael Kiesling**. Zobacz [instrukcję opublikowaną przez Rebel](https://files.rebel.pl/files/instrukcje/Instrukcja_Azul-Witraze-Sintry.pdf). Projekt nie jest związany z autorem, Next Move Games ani Rebel.

## Wersja rozszerzona — plansze, historia i AI

- **Witraże wszystkich graczy:** zawsze widoczna galeria miniaturowych plansz wraz z witrażystą, taflami, poziomem AI i punktami. Kliknięcie powiększa wybrany witraż.
- **Historia rozgrywki:** pełna oś czasu z filtrowaniem po rundzie i uczestniku; liczba pobranych, ułożonych i stłuczonych tafli, źródło, premia za kolor, punkty za okno, znacznik pierwszego gracza.
- **Ściągawka rewersu:** pięć małych pól na szczycie każdej kwatery przedstawia wzór drugiej strony, a nie dodatkowe miejsca na tafle.
- **Tor stłuczonego szkła:** stopnie `0, −1, −2, −4, −6, −8, −11, −14, −18`, osobne pionki dla uczestników, wyjaśnienie resetu znacznika i natychmiastowej kary `−18`.
- **AI osobno dla botów:** na ekranie nowej partii konfiguracja poziomu każdego przeciwnika.
- **Punktacja okien:** skorygowano do układu `4, 3, 3, 2, 2, 1, 1, 2` z oryginalnej planszy.

### Wierność kolorów kwater

Wzory przechowujemy jako osiem sparowanych, dwustronnych pasków w `PATTERN_STRIPS` w `src/game/engine.ts` — każdy gracz losuje kolejność i początkową stronę, poza paskiem z dwoma jokerami (ten zaczyna jokerami w dół). **Rozkłady kolorów zostały zrekonstruowane z publicznych fotografii fizycznej gry, ale nie są zweryfikowaną reprodukcją wszystkich 16 wzorów i ich parowania.** Instrukcja nie zawiera pełnej tabeli 32 stron fizycznych pasków. Żeby osiągnąć zgodność 1:1, potrzebne będą zdjęcia obu stron kompletu 8 pasków; wtedy wystarczy podmienić definicje, bez zmian w silniku gry.

Źródła: [instrukcja gry (PDF)](https://gusandco.net/wp-content/uploads/2018/12/EN-Azul-Sintra-Rules.pdf), [fotografia planszy](https://pimg.1px.tw/punchboardgame/1555934372-2551694762.jpg), [komponenty w BGG](https://boardgamegeek.com/boardgame/256226/azul-stained-glass-sintra).
