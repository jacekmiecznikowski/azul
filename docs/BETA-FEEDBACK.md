# Sintra Glass — zgłoszenia betatesterów (po v36)

Ta lista pozostaje otwarta między kolejnymi wydaniami. Nie łączyć poprawki
renderowania z modyfikacją zasad bez testu wykazującego błąd.

- [x] v37/v38: pięć fizycznych kolorów o większej rozróżnialności, stonowanych w v38,
  fiolet #B81FFF jest kolorem WIZUALNYM pustego pola jokera (nie szóstym fizycznym szkłem).
- [x] v37: puste pola są czterema dużymi odłamkami z ciemną, diamentową luką.
  Ułożone szkło ma odrębny wygląd; dotyczy głównej planszy i podglądów.
- [x] v37: wyróżnić rzeczywistą pozycję witrażysty strzałką i obwódką.
- [?] v38: zgłoszone niedokładne rozkładanie warsztatów po skończeniu woreczka.
  Kod ma recykling wieży, konieczny test skrajnego przypadku.
- [ ] v38: większy środek, większe szkła i wygodniejsze kliknięcia; wielkość tafli
  ze środka ma być porównywalna z taflami w warsztatach.
- [ ] v38: oznaczenie aktualnie premiowanego koloru bliżej planszy gracza
  bez zastępowania sześciorundowego toru premii.
- [ ] v39: po zakończeniu partii dostęp do planszy i historii, bez nachodzącej
  nakładki końcowej oraz możliwość ponownego otwarcia podsumowania.
- [ ] v39: statystyki końcowe: liczba kar -18, stłuczenia szkła, ukończone
  kwatery, premie i szczegóły punktacji; obsłużyć zapisane starsze partie.
- [ ] v40: ekran nowej gry powinien być równie estetyczny jak finał.
- [ ] v41 (na końcu): interaktywny samouczek / pierwsza grywalna partia.

Każdy etap: sprawdzić Vite, Windows EXE i Android APK, zachować 100 tafli
(po 20 w pięciu barwach) oraz działające zapisy gry. Testy automatyczne nie
zastępują wizualnego sprawdzenia na laptopie i telefonie.

- [x] v38: po teście wizualnym v37 zredukowano jaskrawość i połysk pustych luk; oczekuje na ocenę użytkownika na docelowym ekranie.

- [x] v39 (UI): puste i ułożone pola mają wspólną ramkę i kolor; wypełnia się tylko centralny diament. Rezygnacja z dwóch konkurencyjnych stylów z v37/v38. Wymaga zatwierdzenia wizualnego.
