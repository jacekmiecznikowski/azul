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

Projekt fanowski, niezwiązany z autorem ani wydawcą gry. Nie wykorzystuje oficjalnych grafik ani dźwięków.
