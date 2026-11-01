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

## Laboratorium strategii (wytrenowany bot Mistrz)

Ta aktualizacja dodaje nowy poziom AI **Trenowany** i przycisk **Strategia** w nagłówku.
W każdej turze gracz może podejrzeć ruch proponowany przez model; nie wykonuje
on ruchów za gracza. Panel zawiera osobne wyniki testów dwu- i czteroosobowych,
porównanie z ręczną heurystyką wyjściową oraz eksperymenty ablacyjne.

Model nie jest siecią neuronową ani usługą online. Jest interpretowalną,
17-cechową funkcją oceny ruchów, której wagi dostraja komputerowa symulacja
całych partii (evolutionary / cross-entropy search). Silnik jest tym samym
kodem, którego używa gra. Podczas wybierania ruchu bot nie ma dostępu do
przyszłej kolejności tafli w woreczku.

### Powtórzenie eksperymentu

Wymagany Node.js i zainstalowane zależności projektu:

```bash
npm install
npm run train:ai
npm run test
npm run build
```

`npm run train:ai` kompiluje silnik do tymczasowego `.sim-dist/`, przeprowadza
strojenie wag i fazę dodatkowej selekcji, a następnie zapisuje
`src/game/trained-weights.json` i `reports/ai-training-results.json`.
Trening może potrwać kilka minut; szybki test infrastruktury:
`npm run train:quick`. Uwaga: tryb szybki nadpisuje zestaw wag testową,
mniejszą próbą; po jego użyciu uruchom pełny trening lub przywróć plik
`src/game/trained-weights.json` przez Git.

**Ograniczenia:** rezultaty są szacowane w ograniczonej liczbie partii i
zależą od poziomu przeciwnika, liczby graczy oraz naszej cyfrowej implementacji
zasad. Nie należy utożsamiać wysokiej skuteczności na danych treningowych
z poprawą na nieznanych partiach. Raport dokumentuje również nieudane próby.
Zasady i wzory kwater pozostają zgodne z aktualną adaptacją, a dokładna kolejność
pięciu kolorów na fizycznych paskach jest nadal umowna.

Zobacz [raport strategii](reports/STRATEGY.md) i
[dane eksperymentu](reports/ai-training-results.json).


## Laboratorium strategii — trening v3

Poprzednie polecenie `train:ai` uruchamiało 6 generacji, a potem jeszcze kilka
tysięcy partii walidacji i `refine.cjs`. Dlatego po `Generation 6` proces mógł
długo nie wypisywać nowych informacji. Poprzednią metodę zachowano pod nazwą
`npm run train:legacy`.

Nowe polecenie `train:ai` wywołuje trener `scripts/advanced.cjs`:
- ocenia na jednakowych nasionach (z takim samym startem i stroną pałacu)
  kandydata i bieżącego bota, przy 2/3/4 graczach;
- mierzy nie tylko zwycięstwa, ale też średnią różnicę punktów, stłuczenia,
  premie, ukończone kwatery i cofnięcia witrażysty;
- zapisuje **checkpoint po każdym kandydacie** i wypisuje postęp pracy;
- oddziela nasiona użyte podczas strojenia od finalnych rozgrywek walidacyjnych;
- wymaga znaczącej przewagi w niezależnej walidacji, zanim **automatycznie
  podmieni** `src/game/trained-weights.json`; inaczej zachowuje stare wagi;
- zapisuje dokładne wyniki i wnioski do `reports/strategy-advanced.json` oraz
  `reports/strategy-advanced.md`.

Po `git pull` dostępne są profile:

```powershell
npm.cmd run train:quick      # mała próbka, kontrola działania
npm.cmd run train:ai         # normalny trening i walidacja
npm.cmd run train:deep       # szeroki, kosztowny trening
```

Można ustawić parametry niezależnie, na przykład:

```powershell
npm.cmd run train:ai -- --generations 8 --population 12 --games 20 --holdout 120 --h2h 200 --seed 20261101
```

Obsługiwane opcje: `--preset quick|balanced|deep`, `--generations`,
`--population`, `--games` (na format i kandydata), `--holdout` (liczba gier na
format w finalnym teście), `--h2h` (bezpośrednie pojedynki z obecnym botem),
`--ablate`, `--participants 2,3,4`, `--rival hard|expert|incumbent|mixed`, `--seed`,
`--patience`, `--budget-minutes`, `--no-promote`, `--resume`.

Bezpieczne przerwanie: naciśnij **Ctrl+C raz**, poczekaj na komunikat o
checkpoincie, potem:

```powershell
npm.cmd run train:resume
```

Dla niestandardowych parametrów powtórz te same argumenty i dodaj `--resume`
(np. `npm.cmd run train:ai -- --preset deep --resume`). Wznowienie następuje
od następnego **kandydata**, nie od początku treningu. Opcja
`--budget-minutes 20` pozwala ustalić budżet czasu: po skończeniu aktualnie
liczonego kandydata zapisze checkpoint.

**Uwaga:** starego treningu już trwającego w PowerShell nie da się przekształcić
w nowy w trakcie działania. Najpierw pozwól mu zakończyć obliczenia albo
zatrzymaj go świadomie — jego aktualna wersja nie obsługuje wznowienia.
Nie uruchamiaj dwóch treningów naraz w tym samym repozytorium, bo mogłyby
nadpisać pliki wyników.

Eksperymentalne ablacje pokazują **korelacje** przy wyłączaniu cech modelu,
a nie dowód uniwersalnej strategii dla każdej partii.

### Trening w chmurze przez GitHub Actions

Nie musisz trzymać włączonego komputera podczas eksperymentów. Otwórz
`Actions → Strategia AI — trening → Run workflow`, wybierz profil, przeciwnika
i seed. Po zakończeniu w sekcji **Artifacts** znajdziesz raport
`strategy-advanced.md`, dane `strategy-advanced.json` i stan wag bota.
Jeżeli limit czasu minie, paczka zawiera checkpoint do ewentualnego wznowienia
lokalnie. Workflow **nie publikuje automatycznie** nowych wag w repozytorium.

Wariant `mixed` losuje deterministycznie przeciwników spośród Trudnego,
Eksperta i bieżącego modelu; jest wolniejszy, ale sprawdza uogólnianie na
różne style gry. W raportach wartości `±` oznaczają przybliżony przedział
ufności 95% z par powtarzalnych rozgrywek, a nie gwarantowany margines
błędu dowolnej przyszłej partii.


### Dlaczego „NOT PROMOTED” i co zrobić przy powtarzaniu treningu?

Nie jest to błąd. Trener **nie wdraża** kandydata, jeżeli przewaga nad
bieżącym botem jest niepewna lub pojawiło się ryzyko pogorszenia wyników
w innej liczbie graczy.

W starszych wersjach każde uruchomienie bez `--seed` powtarzało to samo
losowanie `20261101`. **Od tej aktualizacji każda nowa sesja automatycznie
otrzymuje inne, jawnie wypisywane ziarno losowe.** Powtarzalny eksperyment
uruchomisz przez `npm run train:ai -- --seed 123456`. Wznowienie z
`--resume` zawsze odzyskuje ziarno z checkpointu.

Po walidacji konsola pokazuje `Promotion checks:` oraz wyniki PASS/FAIL
dla każdego wymogu. Ten sam zestaw warunków jest w
`reports/strategy-advanced.md` (sekcja *Dlaczego model został zaakceptowany
lub odrzucony?*) oraz w JSON. Raport każdej zakończonej sesji zapisywany jest
również w `reports/runs/strategy-<seed>.md` i `.json`, aby łatwo porównać
kolejne próby. Miejsce przy stole i strona pałacu są rozkładane niezależnie.

Nie zmieniaj `src/game/trained-weights.json` ręcznie tylko po to, aby wymusić
promocję: trening może znaleźć słabszego bota, a to jest użyteczna informacja.
Jeżeli kilka niezależnych sesji kończy się odrzuceniem, warto w kolejnym
eksperymencie zwiększyć próbę albo zmienić przestrzeń cech i sposób planowania
ruchów zamiast jedynie powtarzać ten sam zestaw wag.


## Automatyczna nauka bota przez setki tysięcy partii (self-play)

Nowy, osobny tryb nie wymaga ręcznego ustawiania generacji, wag ani populacji. Używa
**policy-gradient reinforcement learning**: bot próbuje różnych legalnych ruchów,
otrzymuje nagrodę dopiero za wynik *pełnej partii* i aktualizuje politykę wyboru ruchów.
Rywalizuje z poprzednim zaakceptowanym mistrzem, wcześniejszym modelem i botem „Trudny”.
Uczy się z rozgrywek 2-, 3- i 4-osobowych, naprzemiennie na stronach pałacu A/B.

### Uruchamianie na Windows (Polecane)

W folderze projektu, po `git pull --ff-only`, wpisz **jedno polecenie**:

```powershell
npm.cmd run learn:background
```

To kompiluje silnik i uruchamia go **w tle**, z priorytetem CPU „Below normal”.
Możesz zamknąć terminal, a proces będzie grał dalej. Nie ma opóźnień animacyjnych
React: trening uruchamia bezpośrednio silnik w Node.js.

Żeby sprawdzić stan lub bezpiecznie zatrzymać pracę:

```powershell
npm.cmd run learn:status
npm.cmd run learn:stop
```

Zatrzymanie jest realizowane przez plik sygnałowy — proces kończy aktualny blok
partii, zapisuje checkpoint i dopiero się zamyka. Kolejne
`npm.cmd run learn:background` **automatycznie wznowi naukę**.
Nie uruchamiaj kilku kopii treningu w tym samym folderze.

Pozostałe warianty:

```powershell
npm.cmd run learn:auto       # domyślnie 100 000 gier, potem zatrzymanie
npm.cmd run learn:forever    # bez limitu, w widocznym terminalu
```

### Co dokładnie zapisuje?

- `reports/selfplay/checkpoint.json` — wszystkie dotychczasowe parametry modelu,
  stan generatora losowego, optymalizatora i ostatnie testy;
- `reports/selfplay/strategy.md` — raport po polsku z wynikiem, porównaniem
  strategii i ich niepewnością statystyczną;
- `reports/selfplay/report.json` — statystyki do dalszych analiz;
- `reports/selfplay/training.log` — log osobnego procesu Windows.

**Bezpieczeństwo:** bot używany w grze nadal korzysta z wag zapisanych w
`src/game/trained-weights.json`. Samo przeprowadzenie dużej liczby partii ich
nie zmienia. Trener automatycznie zapisze nowe wagi dopiero wtedy, gdy model
przejdzie niezależne testy porównawcze przeciwko obecnemu mistrzowi. Wynik
„trening zakończony” NIE oznacza automatycznie poprawy skuteczności.

### Ograniczenia i spodziewana wydajność

Ten trening jest faktycznym **samouczeniem przez nagrodę za wynik**, ale nadal
używa 17 cech oceny znanych z `learnedPolicy.ts`. Nie jest to duża sieć neuronowa
i nie ma gwarancji, że po milionie partii będzie lepszy. Możliwe, że sama
reprezentacja decyzji wymaga rozbudowy o długookresowe planowanie.

Milion symulacji to cel liczbowy, a nie obietnica szybkiego wykonania.
Raport podaje zmierzoną szybkość `gier/s` na Twoim komputerze.
Na zwykłym procesorze może to potrwać bardzo długo. Obniżenie priorytetu
zmniejsza zakłócenia innych programów, ale nie eliminuje zużycia CPU.

Obecny trening `train:ai` nadal istnieje jako narzędzie **porównawcze**;
do nauki w tle od teraz używaj `learn:background`.

## Efekty wizualne przy ruchach (v16)

- **Ułożenie tafli**: w konkretnym polu witrażu pojawia się krótki rozbłysk dopasowany do koloru szkła i kilka drobnych świetlistych cząstek.
- **Ukończenie strony kwatery**: złocisto-kolorowa poświata, promienie i rozbłysk nad ukończoną kwaterą.
- **Stłuczenie szkła**: odłamki szkła przy liczniku stłuczeń gracza i etykieta `−N szkła`; dotyczy też kary za żeton pierwszego gracza.
- **Zmiana punktów**: `+N pkt` / `−N pkt` nad wynikiem właściwego gracza. Przy końcowym podliczeniu uwzględnia też zmiany wyników pozostałych graczy.
- **Przełącznik „Efekty”** w nagłówku działa niezależnie od muzyki i dźwięków, a jego ustawienie jest pamiętane lokalnie.
- Efekty uruchamiają się tylko od prawdziwych ruchów (również botów), znikają po maksymalnie 1,5 sekundy, nie uruchamiają ciągłych pętli i nie wpływają na symulacje self-play.
- Użytkownicy z systemowym ustawieniem `prefers-reduced-motion: reduce` nie zobaczą animacji; przełącznik informuje o tym ograniczeniu.

Weryfikacja reguł wywoływania efektów: `src/ui/moveVisualEvents.test.ts`.

## Dopieszczony stół i ręczne jokery (v17)

- Na filcowym stole delikatnie dryfują drobinki i bardzo słabe refleksy światła. Korzystają z CSS, nie z ciągłych aktualizacji stanu React.
- **Puste jokery są nadal fioletowe, ale znacznie mniej nasycone i przygaszone**, podobnie jak pozostałe puste pola.
- Jeżeli istnieje kilka legalnych miejsc dla wybranego szkła, otwiera się **ręczne wybieranie pól**. Gracz sam klika miejsca (w tym jokery), może usunąć zaznaczenie albo wyczyścić wybór i dopiero zatwierdza ruch. Gra nigdy nie narzuca wariantu.
- Przykład: dla dwóch białych tafli i trzech wolnych pól [biały, joker, joker] można wybrać [biały, joker 1], [biały, joker 2] albo [joker 1, joker 2]. Każdy układ jest mapowany na istniejący legalny ruch silnika.
- Gdy po wyborze pól następuje ukończenie kwatery, nadal działa oddzielny etap wyboru koloru zachowywanej tafli.
- Górny pasek został uproszczony do: Muzyka, Dźwięk, Menu, Nowa gra. W **Menu** są Strategia, Zasady i przełącznik Efekty.
- Wyłączenie efektów wyłącza również animację drobinek; respektowane jest `prefers-reduced-motion`. Efekty nie wpływają na symulacje i samouczenie botów.

Test wyboru pól i jokerów: `src/ui/manualPlacement.test.ts`.


## Wizualne dopracowanie stołu i menu (v18)

- Ambient nad filcem został wzmocniony: **78 drobinek szkła**, drobne czteroramienne rozbłyski, trzy łagodne poświaty i dwa powolne refleksy pryzmatyczne. Wszystko działa w CSS i nie ma żadnych opóźnień ani pętli renderujących po stronie JS.
- Nagłówek zawiera jedynie **Menu** i **Nowa gra**. W **Menu → Dźwięk i wygląd** znajdują się osobne włączniki: **Muzyka w tle**, **Efekty dźwiękowe**, **Efekty wizualne**. Ustawienia muzyki, dźwięku i efektów są pamiętane niezależnie.
- Po ukończeniu **obu stron kwatery** nie pokazujemy już podglądu kolorów rewersu. Napis **GOTOWE** i ornament są wyśrodkowane w całej wysokości dostępnego okna; zachowane tafle i liczba punktów pozostają widoczne na dole.
- Ograniczenie animacji w systemie operacyjnym i wyłączenie efektów wizualnych nadal wyłączają również animację drobinek na stole.
- Testy regresyjne widoku: `src/components/presentation-v18.test.tsx`.

## Ambient stołu v19 — mniej drobinek, bez fal

Na podstawie uwag po v18 usunięto:
- 78 animowanych elementów HTML/CSS z rozbudowanymi cieniami;
- rozchodzące się okrągłe poświaty;
- przesuwające się promienie światła imitujące pokaz slajdów.

Zamiast tego jeden przezroczysty **Canvas 2D** rysuje **28 małych,
przygaszonych drobinek szkła** i sporadyczne drobne refleksy.
Ruch jest powolny i asynchroniczny. Nie ma żadnych dużych,
pulsujących okręgów ani fal. Warstwa leży pod planszami i panelami,
nie przechwytuje kliknięć.

Dla wydajności rysowanie ma limit 24 kl./s, skalowanie rozdzielczości
do 1,5 DPR, wstrzymanie przy ukrytej karcie lub niewidocznym stole,
a podczas wyłączania „Efektów wizualnych” Canvas jest usuwany.
Ustawienia systemowe ograniczenia ruchu są respektowane.
Nie jest potrzebna nowa biblioteka ani dodatkowe zależności:
dla tej jednej dekoracji Canvas 2D jest prostszy niż pełny silnik
WebGL/PixiJS. Efekty ruchów (układanie szkła, rozbicia, punktacja)
działają nadal tak jak wcześniej.

## Cztery połączone ornamenty nad parami kwater (v20)

Na każdej planszy osiem pasów szkła jest zgrupowanych w cztery wyraźnie
połączone pary: **01–02, 03–04, 05–06, 07–08**. Każda para ma wspólną
ozdobną ramę, subtelny łuk i rozetę SVG łączącą obie kwatery. Roślinny motyw
ma cztery niewielkie segmenty — po dwa na każdą stronę pary:

- 0/4: przygaszona, nieukończona dekoracja;
- 1–3/4: podświetlone segmenty odpowiadają zakończonym stronom;
- 4/4: ornament staje się złoty, obramowanie pary delikatnie jaśnieje.

Wynik jest zawsze oparty na rzeczywistych `strip.side` silnika. **Strona pałacu A**
nagradza 2, 3 lub 4 ukończone części odpowiednio premiami **3, 6, 10 pkt**
przy końcu gry; podpowiedź ornamentu pokazuje właściwą liczbę punktów.
Na stronie B dekoracja nadal spaja parę, ale opis nie przypisuje jej
premii A — tam finałowa punktacja zależy od dominującego koloru.

Wszystkie **osiem kwater pozostaje klikalnych** i ma swoje oryginalne indeksy;
wybór jokerów, wizualizacja dokładnego układania szkieł i animacje punktów
nadal korzystają z tych samych identyfikatorów. Żaden nowy efekt nie
wpływa na AI, reguły gry ani wydajność symulacji. Rozeta nie wykonuje
ciągłych animacji, a przejścia są usunięte przy ograniczeniu ruchu.

Testy: `src/components/ornaments-v20.test.tsx`.

## Ekran zakończenia partii (v21)

Po ostatnim ruchu nie otwiera się już automatycznie szczegółowa tabela wyników.
Zamiast tego na środku stołu pojawia się **nieduży, ozdobny ekran zakończenia**
z medalem, nazwą zwycięzcy (lub zwycięzców przy remisie) oraz wynikiem
końcowym. Wygląd zachowuje paletę morskiej zieleni i złota i jest
dostosowany do ekranów mobilnych.

- **Zobacz podliczenie** — dopiero po kliknięciu otwiera szczegółowy raport.
- **Nowa partia** — pokazuje ustawienia nowej gry, ukrywając ekran zakończenia.
- Zamknięcie podliczenia wraca do ekranu zakończenia, nie uruchamia
  samoczynnie drugiego okna.
- Wykrywanie zwycięzcy uwzględnia standardowy warunek rozstrzygania remisu.
- Efekty wejścia są wyłączone przy systemowym ograniczeniu animacji.

Testy: `src/components/FinishCelebration.test.tsx` oraz
`src/ui/finishOverlayVisibility.test.ts`.

## Fanfara końca gry (v22)

Gdy ostatni legalny ruch kończy partię, gra odtwarza **`public/game-over.wav`**
przekazany przez autora projektu. Towarzyszy pojawieniu się ekranu zwycięzcy;
zastępuje zwykły sygnał punktowania tej tury i jest odtwarzany tylko raz.

- Plik WAV ma wstępne ładowanie oraz ustawioną głośność 52%.
- Przełącznik **Menu → Efekty dźwiękowe** również steruje fanfarą.
- **Menu → Muzyka w tle** działa niezależnie.
- Wejście do szczegółowego podliczenia, jego zamknięcie i odświeżenie
  zapisanego zakończonego meczu **nie powtarzają** dźwięku.
- Działa zarówno po końcowym ruchu człowieka, jak i bota; nie ma wpływu
  na szybkie symulacje AI ani offline-owy trening.

Testy wyzwalania sygnału: `src/ui/moveAudioCue.test.ts`.
