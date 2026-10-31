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


## Widok fizycznego stołu (v5 — równe plansze)

- **Cztery plansze wokół warsztatów:** twoja na dole, bot naprzeciwko do góry nogami, a dwaj pozostali po bokach (obróceni o 90°). Tak samo, jak przy prawdziwym stole. Dla 2–3 graczy nieobecne miejsca są pomijane.
- **Pełne kwatery:** wszystkie plansze korzystają z tego samego komponentu `WindowCard`; żadnych uproszczonych miniaturek. Kliknij ikonę powiększenia przy graczu, aby obejrzeć planszę z bliska.
- **Kwadratowe tafle:** naprawiono problem z zawężaniem szkła przez procentową wysokość w automatycznej siatce CSS. Wielkość tafli zależy od rozmiaru pola, zachowuje proporcje 1:1.
- **Mniejsze warsztaty** są w centrum stołu. Wyniki, stan tury, tor stłuczeń i przycisk historii znajdują się obok nich, bez zabierania miejsca czterem planszom.
- Historia partii otwiera się w dużym oknie z filtrami, zamiast zajmować stale widoczną kolumnę; tor stłuczonego szkła pozostaje widoczny.
- Na typowych desktopach plansze dopasowują się do wysokości okna. Na niskich i wąskich ekranach stół może być przewijany, aby nie zmniejszać tafli do kilku pikseli.
- Przycisk **„Odwróć orientację”** zmienia orientację planszy naprzeciwko i kierunek obrotu plansz bocznych.

### Równe rozmiary plansz (v5)

Wszyscy czterej gracze mają dokładnie ten sam komponent `TableSeat`, osiem kwater i taki sam bazowy rozmiar. Plansze boczne zajmują całą wysokość stołu zamiast być ściskane do środkowego rzędu; plansza człowieka nie jest już renderowana osobno na całą szerokość. W małych oknach korzystaj z ikon powiększenia, a w bardzo wąskich układ może wymagać przewijania. Zasady i AI pozostają bez zmian.

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

- **Witraże wszystkich graczy:** pełne, rozmieszczone wokół stołu plansze wraz z witrażystą, taflami, poziomem AI i punktami. Kliknięcie powiększa wybrany witraż.
- **Historia rozgrywki:** pełna oś czasu z filtrowaniem po rundzie i uczestniku; liczba pobranych, ułożonych i stłuczonych tafli, źródło, premia za kolor, punkty za okno, znacznik pierwszego gracza.
- **Ściągawka rewersu:** pięć małych pól na szczycie każdej kwatery przedstawia wzór drugiej strony, a nie dodatkowe miejsca na tafle.
- **Tor stłuczonego szkła:** stopnie `0, −1, −2, −4, −6, −8, −11, −14, −18`, osobne pionki dla uczestników, wyjaśnienie resetu znacznika i natychmiastowej kary `−18`.
- **AI osobno dla botów:** na ekranie nowej partii konfiguracja poziomu każdego przeciwnika.
- **Punktacja okien:** skorygowano do układu `4, 3, 3, 2, 2, 1, 1, 2` z oryginalnej planszy.

### Wierność kolorów kwater

Wzory przechowujemy jako osiem sparowanych, dwustronnych pasków w `PATTERN_STRIPS` w `src/game/engine.ts` — każdy gracz losuje kolejność i początkową stronę, poza paskiem z dwoma jokerami (ten zaczyna jokerami w dół). **Rozkłady kolorów zostały zrekonstruowane z publicznych fotografii fizycznej gry, ale nie są zweryfikowaną reprodukcją wszystkich 16 wzorów i ich parowania.** Instrukcja nie zawiera pełnej tabeli 32 stron fizycznych pasków. Żeby osiągnąć zgodność 1:1, potrzebne będą zdjęcia obu stron kompletu 8 pasków; wtedy wystarczy podmienić definicje, bez zmian w silniku gry.

Źródła: [instrukcja gry (PDF)](https://gusandco.net/wp-content/uploads/2018/12/EN-Azul-Sintra-Rules.pdf), [fotografia planszy](https://pimg.1px.tw/punchboardgame/1555934372-2551694762.jpg), [komponenty w BGG](https://boardgamegeek.com/boardgame/256226/azul-stained-glass-sintra).

## Widoki stołu v6

Domyślny układ **Duże plansze** wyświetla pełne kwatery wszystkich graczy w dwóch rzędach po dwie plansze, przedzielonych paskiem warsztatów, wyników i toru stłuczeń. W odróżnieniu od wcześniejszego wymuszonego dopasowania nie zmniejsza szkiełek do mikroskopijnych rozmiarów. Przy typowej rozdzielczości laptopa trzeba **przewinąć środkowy obszar stołu**, aby zobaczyć drugi rząd; w prawym górnym rogu są skróty **Plansze AI** i **Moje witraże**. Wybranie tafli automatycznie przewija do własnych kwater.

Przełącznik **Stół fizyczny** przywraca cztery plansze wokół warsztatów z obrotem górnej i bocznych, przeznaczony do oglądania całego stołu naraz. Oba układy wykorzystują te same komponenty i stan rozgrywki, bez restartu partii. Nie jest fizycznie możliwe zmieszczenie czterech pełnowymiarowych, obróconych plansz na ekranie 1440 × 900 bez znaczącego pomniejszenia albo przewijania.


## Widok stołu: czytelne plansze (v7)

W wersji testowej ekran gry znów przedstawia stół planszowy: Aurora naprzeciwko, Iris po prawej, Noctis po lewej, Ty na dole. Każdy gracz korzysta z tego samego ośmiokwaterowego komponentu i **identycznego rozmiaru planszy**; boczne witraże są obrócone, a nie pomniejszone. Tafle są kwadratowe, warsztaty zajmują mniej miejsca, a tor stłuczeń i dziennik pozostają dostępne.

Usunięto układ 2×2 i zbędny przełącznik wielkości plansz. W niższych rozdzielczościach przewijana jest powierzchnia stołu, ponieważ zachowanie czytelnych szkieł jest ważniejsze niż sztuczne zmniejszanie wszystkiego.

**Weryfikacja:** widok sprawdzony statycznie w Chromium na makiecie 1440×900 i 1920×1080; nie jest to jeszcze test całej aplikacji React. Przed scaleniem uruchom `npm run build`, `npm test` i sprawdź interakcje w przeglądarce.
