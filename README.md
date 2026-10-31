# Sintra Glass — edycja cyfrowa (redesign v8)

Nieoficjalna komputerowa adaptacja mechaniki gry **Azul: Witraże Sintry** z graczami AI. Projekt wykorzystuje React, TypeScript, Vite, Tailwind CSS oraz Vitest.

## Uruchomienie

Node.js 22.12+:

```bash
npm install
npm run dev
```

W przeglądarce otwórz `http://localhost:5173`.

## Interfejs v8

- Cztery **identyczne, pełne plansze** przy wspólnym stole: gracz na dole, Aurora u góry, Noctis po lewej i Iris po prawej. Plansze przeciwników są odwrócone zgodnie z perspektywą fizycznego stołu, w tym poprawiony kierunek bocznych plansz.
- Nowy renderer `src/components/GameBoard.tsx`: łukowe okna, kwadratowe tafle, podgląd rewersu, pole witrażysty, panel zachowanych tafli i jednolita punktacja.
- Nowe centrum: zwarty rynek z warsztatami, fizyczny żeton pierwszego gracza, wynik oraz tor stłuczeń. Historia jest dostępna przyciskiem, **a żaden stan witraża nie wymaga kliknięcia powiększenia**.
- Opóźnienie ruchów AI: łatwy ok. 1,1–1,55 s, normalny ok. 1,5–1,95 s, trudny ok. 1,9–2,35 s. Każdy bot ma osobny poziom trudności.
- Przy 1440×900 cztery pełne plansze mieszczą się w widoku. Na niższych ekranach przewijana jest powierzchnia stołu, nie zmniejszamy tafli do nieczytelnych kresek.

## Sprawdzenie

```bash
npm run build
npm test
```

Silnik zasad i strategie AI znajdują się odpowiednio w `src/game/engine.ts` i `src/game/ai.ts`. Wizualny redesign nie zmienia mechaniki partii.

## Własność i zastrzeżenia

Projekt fanowski, niezwiązany z wydawcą. Nie dołączono oficjalnej grafiki gry. Układy pasków są rekonstrukcją i nie są zweryfikowane jako w 100% identyczne z każdym egzemplarzem fizycznej gry.
