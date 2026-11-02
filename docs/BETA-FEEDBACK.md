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
- [x] v41 (UI): większy, proporcjonalny środek oraz dwukolumnowy wybór do 5 kolorów; jednolity szlif tafli we wszystkich położeniach. Obszary dotykowe nie zostały zwężone, ale wymagają dalszej praktycznej oceny mobilnej.
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

- [x] v40: zgłoszenie wizualne — ciemniejszy niebieski, słomkowy żółty, rombowe szkło na warsztatach i środku. Dopieszczona oprawa okien bez zmiany układu; wymaga oceny na docelowym ekranie.

- [x] v41: poprawiono rozbieżność wyglądu luźnej i ułożonej tafli poprzez współdzielony `CutGlassDiamond`; przeorganizowano wnętrze warsztatów dla maksymalnie pięciu barw.

- [ ] **Priorytet: po regresji v42.** Wycofano eksperymentalną przebudowę UI. Nie wdrażać ponownie bez wizualnego testu na docelowych rozdzielczościach, także z 5 kolorami na środku; zgodność szkieł pustych i ułożonych musi zostać oceniona na prawdziwym obrazie, nie tylko w DOM.
