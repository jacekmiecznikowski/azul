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
