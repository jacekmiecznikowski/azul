# Raport: samouczenie bota i strategia gry Sintra Glass

**Wersja:** eksperyment AI 1 · 31 października 2026  
**Metoda:** parametryczna ocena legalnych ruchów (17 cech) dostrajana algorytmem CEM i dodatkową selekcją kandydatów. Nie jest to sieć neuronowa ani pełne rozwiązanie gry.

## Skala badania i uczciwy wynik

Przeprowadzono **4 475 pełnych rozgrywek** w silniku gry (2 355 partii strojenia i selekcji oraz 2 120 testów, walidacji i ablacji). Wszystkie ruchy przechodziły przez `legalMoves` i `applyMove`, z kontrolą zachowania 100 tafli szkła. Następne testy otrzymały inne ziarna losowania niż trening. Bot nie ma dostępu do kolejności tafli ukrytych w woreczku.

| Test na nowych rozgrywkach | Bot trenowany | Heurystyka wyjściowa |
| --- | ---: | ---: |
| Przeciwko „Trudnemu”, 2 graczy (180 gier na model) | **58,6%** zwycięstw | **63,9%** |
| Przeciwko trzem „Trudnym”, 4 graczy (100 gier na model) | **22,5%** zwycięstw, remisy liczone ułamkowo | **27,0%** |
| Średni wynik, 2 graczy | 58,4 pkt | 61,5 pkt |
| Średnie punkty za okna, 2 graczy | 44,7 pkt | 47,0 pkt |
| Średnio ułożonych tafli, 2 graczy | 57,7 | 57,0 |
| Średnia liczba stłuczeń, 2 graczy | 3,8 | 3,5 |

**Wniosek dotyczący modelu:** trening **nie pobił** ręcznie ustalonej funkcji oceny w finalnej walidacji. Proponowany tryb „Trenowany” jest celowo oznaczony jako eksperymentalny; wyniki nie upoważniają do nazywania go „najsilniejszym”. Nawet różnica kilku punktów procentowych przy tych próbach jest obarczona niepewnością (orientacyjnie około ±7 p.p. przy 180 partiach dwuosobowych, bez korekty na zależność partii).

## Co z tego może wykorzystać człowiek?

### 1. Dużo szkła to nie to samo co dużo punktów

Bot trenowany układał średnio **0,8 tafli więcej** na partię w pojedynku, ale zdobywał **2,3 pkt mniej za ukończone okna** i kończył grę **3,1 pkt niżej**. To ważna obserwacja: optymalizowanie wyłącznie liczby układanych tafli nie wystarcza. Przy porównywaniu dwóch źródeł szkła pytaj, **które okno ukończysz i ile razy jego wartość będzie jeszcze punktowała**.

### 2. Tor stłuczeń zmienia wartość ruchu

Jedno potłuczone szkło nie zawsze kosztuje tyle samo punktów. Im głębiej na torze, tym wyższa może być strata; pole −18 powoduje natychmiastową karę i reset. Przed wybraniem dużej grupy sprawdzaj nie tylko liczbę tafli, ale też nadmiar, który spadnie na podłogę. To wynika bezpośrednio z zasad gry; eksperyment nie ustalił jednego uniwersalnego progu opłacalności.

### 3. Prawe okna bywają inwestycją, ale nie zawsze priorytetem

Ukończone okna po prawej dodają punkty przy późniejszym oszkleniu okien po lewej. To daje potencjał kombinacji. **Nie należy jednak bezwarunkowo iść maksymalnie w prawo**: koszt przemieszczenia witrażysty, opuszczone kwatery i tempo rundy mogą przeważyć przyszłe punkty. W małej próbie ablacyjnej wyłączenie naszej uproszczonej premii za „przyszłe lewe okna” nawet *pomogło* wynikowi — to sygnał do dalszych testów, nie dowód przeciwko tej mechanice.

### 4. Cofanie witrażysty może być wartościowym ruchem

Cofnięcie zużywa turę, ale odblokowuje rozpoczęte kwatery na lewo. W eksperymencie z wyłączeniem cechy uwzględniającej potencjał cofnięcia (po 45 partii na wariant) pełny model wygrał **46,7%**, a wariant bez niej **42,2%**. Różnica **+4,4 p.p.** jest zbyt mało precyzyjna, by uznać ją za pewną przewagę. Praktycznie: wracaj do lewej strony, gdy czekają tam *konkretne* możliwe do skończenia okna, nie tylko po to, by poprawić pozycję pionka.

### 5. Premia koloru rundy nie może przesłaniać zamknięcia okna

Tafle w aktualnym premiowanym kolorze dodają punkty **dopiero w chwili zakończenia kwatery**. Kolor rundy powinien zatem wpływać na wybór między zbliżonymi ruchami, ale nie automatycznie usprawiedliwiać złego pobrania i stłuczeń.

## Eksperymenty ablacyjne — interpretuj ostrożnie

Na 45 nowych partiach dwuosobowych na wariant wyłączono pojedynczy składnik oceny:

| Składnik | Pełny model | Bez składnika | Różnica pełnego |
| --- | ---: | ---: | ---: |
| Koszt toru stłuczeń | 46,7% | 48,9% | −2,2 p.p. |
| Potencjał okien po lewej | 46,7% | 62,2% | −15,6 p.p. |
| Premie pałacu | 46,7% | 51,1% | −4,4 p.p. |
| Liczba ułożonych tafli | 46,7% | 51,1% | −4,4 p.p. |
| Kolor rundy | 46,7% | 47,8% | −1,1 p.p. |
| Potencjał cofnięcia | 46,7% | 42,2% | +4,4 p.p. |

Uwaga: to niewielkie próby, a cechy współdziałają. **Ujemna różnica nie oznacza, że dana zasada gry jest nieistotna.** Oznacza, że nasza konkretna implementacja premii za nią mogła być źle skalibrowana.

## Co dalej poprawić w AI?

Najbardziej obiecujący kolejny eksperyment to 2–3-ruchowe wyszukiwanie w drzewie ruchów połączone z dopasowaną funkcją oceny; osobne modele dla 2 i 4 graczy; większa liczba niezależnych losowań, przeciwnicy z różnych poziomów i testy przeciwko obecnemu „Ekspertowi”. Obecny wynik w żadnym razie **nie potwierdza przewagi nad „Ekspertem”**.

## Reprodukcja i ograniczenia

Uruchom `npm run train:ai`, aby wygenerować nowe `src/game/trained-weights.json` i `reports/ai-training-results.json`. `npm run train:quick` służy wyłącznie do szybkiego sprawdzenia infrastruktury i nie daje wiarygodnych wniosków. W grze przycisk **Strategia** pokazuje wyniki i proponuje ruch w aktualnej turze bez jego wykonywania.

Rozkłady liczebności kolorów kwater odpowiadają ręcznemu zestawieniu, ale kolejność konkretnych pól na fizycznych dwustronnych paskach nie jest jeszcze zweryfikowana. Wyniki odnoszą się do obecnej wersji symulatora, nie do wszystkich możliwych partii planszowych. 
