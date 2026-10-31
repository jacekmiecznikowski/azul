# Sintra Glass — Witraże Sintry (v10)

Nieoficjalna komputerowa adaptacja zasad **Azul: Witraże Sintry**. React 19, TypeScript, Vite 8, czterech graczy (jeden człowiek i maksymalnie trzech botów), rozgrywka lokalna.

## Uruchomienie

Wymagany Node.js 22.12+:

```bash
npm install
npm run dev
```

W przeglądarce: `http://localhost:5173`. Weryfikacja lokalna: `npm run build` i `npm test`.

## Zmiany v10

- Tor stłuczonego szkła zajmuje znacznie mniej miejsca; dziewięć pól i znaczniki wszystkich graczy pozostają widoczne.
- Warsztaty wykorzystują lepiej przestrzeń środkowej kolumny. Nie zmieniamy wielkości pełnych plansz graczy.
- Historia pokazuje zielone dodatnie i czerwone ujemne zmiany punktów. Ukończone kwatery mają osobno: punkty za okna, premię koloru rundy i natychmiastowe −18 za przekroczenie toru.
- Po szóstej rundzie wyświetla się **pełne podliczenie końcowe** dla każdego gracza: punkty z rund, pozostałe tafle (1 pkt za 3), końcowa kara, premia strony A lub B, wynik i łączna liczba punktów utraconych na torze jako kryterium remisu.
- Nowa trudność AI **Ekspert**: ocenia postęp, wartość okien po prawej, przyszłe wykorzystanie pól i możliwe odpowiedzi następnego przeciwnika. Rozpatruje do dwóch wariantów odpowiedzi przeciwnika; w dwuosobowej grze planuje również swoją kolejną akcję. W ograniczonym zestawie testów na silniku pokonał poziom Trudny 24 razy na 24 pojedynki (różne pozycje startowe i strony punktowania). To wynik testowy, a nie gwarancja zwycięstwa w każdej grze.
- Dostępne nadal: niezależna trudność każdego bota, losowy pierwszy gracz, fizyczny żeton gracza rozpoczynającego, efekty WebAudio i w pełni widoczne plansze.

## Zasady i weryfikacja

Podstawą kontroli jest polska instrukcja *Witraże Sintry* (6 stron, 2018). Logika implementuje: 5/7/9 warsztatów, pobieranie tafli, ruch witrażysty, jokery, rozbijanie nadmiaru, premia za kolor rundy przy ukończeniu kwatery, punktowanie ukończonych okien po prawej, natychmiastowe −18 i powrót na start toru, finałowe premie stron A/B oraz remis według łącznych kar z toru.

**Ograniczenie wierności:** zestaw wzorów i par kolorów 8 dwustronnych kwater pochodzi z wcześniejszej rekonstrukcji na podstawie zdjęć. Nie jest udowodniona zgodność z wszystkimi 32 oryginalnymi paskami; nie należy traktować tego jak w 100% wiernej reprodukcji egzemplarza pudełkowego.

W kodzie logika jest oddzielona od interfejsu: `src/game/engine.ts`, `src/game/ai.ts`, testy `src/game/engine.test.ts`; historia `src/components/LiveHistory.tsx`, finał `src/components/FinalResults.tsx`, zmiany stylów `src/center-v10.css`.

## Ważne

Projekt fanowski, niezwiązany z autorem ani wydawcą gry. Nie wykorzystuje oficjalnych grafik. Ścieżka muzyczna została przekazana przez użytkownika jako nagranie z domeny publicznej.

## Zestawy kwater graczy i bilans 100 tafli (v12)

Zestawy **czerwony, żółty, niebieski, biały** mają osobne, dwustronne wzory 8 kwater,
zgodnie z ręcznym zestawieniem przekazanym dla fizycznej gry. Przypisanie do miejsc:
Ty — czerwony, Aurora — żółty, Iris — niebieski, Noctis — biały.
Kwatery są losowo tasowane; każda strona poza jokerami może być losowo stroną początkową.
Strona z dwoma jokerami jest zawsze początkowo odwrócona.

**Ważne:** zestawienie podaje *liczbę* szkiełek każdego koloru na danej stronie,
lecz nie dokładną kolejność ich położenia w pionowym pasku. Z tego względu rozkłady
liczbowe i pary stron odpowiadają zapisanym danym, ale pionowa kolejność pól jest
umowna. Można ją później skorygować w `PHYSICAL_STRIPS` w `src/game/engine.ts`.

W warsztatach widoczna jest **Szklana Wieża** i bilans tafli:
**na stole** (warsztaty + środek), **witraże** (pola kwater i zachowane oszklenia),
**woreczek**, **wieża**, **tor rund**. Suma wszystkich pozycji zawsze wynosi **100**.
Znaczniki kolorów rund nadal są taflami i muszą zostać uwzględnione w bilansie.
Aby użyć nowych kwater, wybierz **Nowa gra** — wcześniejsze zapisane partie mają stare układy.

## Zmiany v13 — mechanika i wygoda

- **Jokery**: po wybraniu kwatery mającej więcej niż jeden legalny sposób rozmieszczenia tafli, pojawia się okno wyboru konkretnych pól. Można zachować joker na przyszłość lub zająć go teraz. Nadmiar nadal musi zostać stłuczony, a tafle muszą trafić na jedną kwaterę.
- **Losowe kolory pałaców**: na początku nowej partii tasuje się czerwony, żółty, niebieski i biały komplet. Człowiek pozostaje na dole stołu, ale nie dostaje z góry czerwonego zestawu. Kolor widać przy nazwie i znacznikach toru.
- **Kolejność zgodna z zegarem**: w grze 4-osobowej góra (Aurora) → prawo (Iris) → dół (Ty) → lewo (Noctis). Gracze rozpoczynający rundę nadal wynikają z zasad żetonu pierwszego gracza.
- **Pasek rund**: aktywny kolor jest większy, rozegrane kolory przygaszone.
- **Koniec gry**: pasek z akcjami jest wyśrodkowany w oknie.
- **Historia**: komunikat „Twój ruch / gra bot” znajduje się na górze panelu historii; oddzielna dolna belka została usunięta.

**Migracja zapisów:** rozpocznij **Nową grę**, aby zobaczyć losowy przydział kolorów i nowy sposób wyboru pól z jokerami. Wcześniejsze zapisy są nadal odczytywane, ale zachowują przydzielone wcześniej kolory i aktualny przebieg rozgrywki.

## Zmiany v14 — czytelniejsze jokery i muzyka ambientowa

- Pola **joker** mają teraz fioletowe szkło i wyraźnie odróżniają się od białych tafli, również w podglądzie drugiej strony kwatery.
- Żeton pierwszego gracza ma ciemny, czytelny numer „1” na jasnym kaflu z kontrastową ramką.
- W górnym pasku są **dwa niezależne przełączniki**: **Muzyka** (odtwarzanie lokalnego pliku MP3 dostarczonego przez użytkownika) oraz **Dźwięk** (krótkie efekty akcji).
- Muzyka jest domyślnie włączona, ale ze względu na zasady automatycznego odtwarzania przeglądarek zaczyna grać po pierwszym kliknięciu lub naciśnięciu klawisza. Każdy przełącznik pamięta ustawienie w `localStorage`.
- Odtwarzanie muzyki odbywa się offline, z lokalnego pliku `public/background.mp3`.

## Muzyka z pliku background.mp3 (v15)

Gra odtwarza w pętli przekazany utwór MP3 zamiast poprzedniej generowanej melodii.
Umieść **własną kopię** nagrania w `public/background.mp3` (Vite kopiuje ten plik
podczas `npm run build`). W uruchomionej grze:
- `Muzyka` włącza/wycisza zapętlony utwór; początkowa głośność to 20%.
- `Dźwięk` niezależnie steruje efektami gry.
- Oba ustawienia są zapamiętywane w przeglądarce.
- Ze względu na ograniczenia automatycznego odtwarzania muzyka uruchamia się
  po pierwszym kliknięciu lub naciśnięciu klawisza.
- Jeśli pliku nie ma, przycisk poinformuje `Brak MP3` po próbie odtworzenia.

**Dostarczenie pliku:** źródłowe nagranie `background.mp3` jest w paczce ZIP z gry.
Kod odtwarzacza znajduje się na GitHubie. Po sklonowaniu repozytorium bez pliku MP3
skopiuj nagranie do `public/background.mp3`; plik może być wersjonowany w GitHubie.
