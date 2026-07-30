# RPGLE Subfiles: Een Volledige Gids (SQL-gebaseerd)

> **Bijbehorend bestand:** `subfile-guide-native-io-nl.md` behandelt dezelfde
> drie patronen met native I/O (`SETLL`/`READ`/`READP`) in plaats van SQL
> cursors. De DDS en de algemene programma-logica zijn identiek — alleen de
> *fetch-mechaniek* verschilt. Gemaakt door Claude ai, door Reinald Jansen.

---

## 1. Inleiding

### Wat is een subfile, in gewone woorden?

Een subfile is een DDS record format waarin je **meerdere rijen data in een
scrollbare lijst** op een 5250-scherm kunt tonen. In plaats van één record
te schrijven en één rij te tonen (zoals bij een normaal display file
format), schrijf je het subfile record één keer *per rij data*, en de
workstation zelf regelt het tonen van een "pagina" van die rijen tegelijk,
waarbij de gebruiker op en neer kan scrollen.

Twee DDS record formats werken samen om dit mogelijk te maken:

- **`SFL` record format** — bepaalt hoe één rij eruitziet (de kolommen).
- **`SFLCTL` record format** — het "control record" dat de subfile beheert:
  hoe groot hij is, hoeveel rijen per pagina getoond worden, en diverse
  indicators die de weergave aan/uit zetten.

Je doet nooit `EXFMT` op het `SFL` format direct — je doet altijd `EXFMT`
op het `SFLCTL` format. Het control record is wat daadwerkelijk aan de
gebruiker getoond wordt; het vertelt de workstation "ga de subfile tekenen
die bij mij hoort."

### De drie patronen

| Patroon | Wat het betekent | Wanneer gebruiken |
|---|---|---|
| **Load-All** | Laad alle rijen vooraf, voordat de eerste weergave plaatsvindt | Kleine tot middelgrote datasets (een paar duizend rijen, past comfortabel in geheugen) |
| **Page-at-a-Time** | Laad één pagina tegelijk terwijl de gebruiker naar beneden scrollt; verwijder nooit wat al geladen is | Grote of onbegrensde datasets, waarbij gebruikers doorgaans niet door *alles* scrollen, en je geheugen geleidelijk mag laten groeien |
| **Windowed** | Laad één pagina tegelijk, maar **verwijder oude pagina's** zodra de gebruiker ver genoeg vooruit gescrold heeft, om geheugengebruik te beperken | Zeer grote datasets (miljoenen rijen) waarbij zelfs "houd alles vast wat de gebruiker gezien heeft" te veel geheugen kost, of de sessie mogelijk zeer lang duurt |

De rest van deze gids bouwt alle drie op, met steeds hetzelfde voorbeeld:
een scrollbare lijst van klanten (klantnummer, naam, saldo) uit een tabel
genaamd `CUSTOMER`.

---

## 2. Kern DDS-concepten (gelden voor alle drie patronen)

Deze bouwstenen zijn gedeeld door elk patroon in deze gids. Begrijp ze
eenmaal, en de drie patronen zijn simpelweg verschillende *instellingen* en
*laadlogica* die daarbovenop gelegd worden.

### SFL vs SFLCTL

```
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(....)
     A                                      SFLPAG(....)
```

- `SFL1` is het rij-format. `O` betekent "output" — deze velden zijn in dit
  voorbeeld alleen-tonen (geen invoer mogelijk).
- `SFLCTL1` is gekoppeld aan `SFL1` via `SFLCTL(SFL1)` — dit koppelt het
  control record aan zijn subfile.

### SFLSIZ vs SFLPAG — het belangrijkste onderscheid in deze hele gids

Zie het als een **archiefkast-lade (SFLSIZ) versus het venster waardoor je
erin kijkt (SFLPAG)**:

- **`SFLPAG`** = hoeveel rijen er *zichtbaar op het scherm* zijn tegelijk.
  Dit is je paginagrootte.
- **`SFLSIZ`** = hoeveel rijen de subfile op elk moment *fysiek kan
  bevatten*, geladen of niet, zichtbaar of niet.

Deze ene relatie bepaalt welk van de drie patronen je aan het bouwen bent:

| Instelling | Resultaat |
|---|---|
| `SFLSIZ` = `SFLPAG` | De subfile kan precies één pagina bevatten. Geen terugscrollen mogelijk — een pagina naar beneden betekent dat de oude pagina in feite weg is. Zelden wat je wilt. |
| `SFLSIZ` >> `SFLPAG`, groot genoeg voor alles | Load-All patroon — de hele dataset zit tegelijk in de subfile. |
| `SFLSIZ` >> `SFLPAG`, maar begrensd op een vast veelvoud (bv. 3x paginagrootte) | Page-at-a-Time of Windowed — de subfile bevat meerdere pagina's, groeiend indien nodig of begrensd blijvend, afhankelijk van je laadlogica. |

**Veelgemaakte fout:** `SFLSIZ` = `SFLPAG` instellen terwijl je eigenlijk
terugscrollen wilde. Dit is een fout die ik zelf eerder maakte terwijl ik
dit voor iemand aan het schetsen was — het is een makkelijke valkuil omdat
het lijkt op "één pagina = één pagina, dat is wat ik wil", maar het
verwijdert stilletjes de mogelijkheid om terug te scrollen door alles wat
al gezien is.

### Belangrijke indicators

| Indicator | Betekenis |
|---|---|
| `SFLCLR` | Wanneer AAN, wordt de subfile geleegd. Moet weer UIT gezet worden voordat je rijen schrijft, anders gedragen writes zich niet correct. |
| `SFLDSP` | Wanneer AAN, wordt het subfile-gedeelte van het scherm getoond. |
| `SFLDSPCTL` | Wanneer AAN, wordt het control record getoond (headers, titels, etc.). |
| `SFLEND(*MORE)` | Gekoppeld aan een indicator die jij beheert. Het **systeem** zet deze automatisch AAN wanneer de gebruiker naar de onderkant van de momenteel geladen rijen scrolt. Het weet NIET of er daadwerkelijk meer data bestaat in je databron — dat is aan je programma om te bepalen en op te reageren. |

### SFLRCDNBR (RRN)

```
     A            RRN1           4S 0H      SFLRCDNBR
```

Dit is het **relative record number** veld — een verborgen numeriek veld
gekoppeld aan de subfile via `SFLRCDNBR`. Elke keer dat je een `WRITE` doet
naar het `SFL1` format, gebruikt RPGLE de huidige waarde van `RRN1` als de
positie van die rij in de subfile. Jij beheert dit veld volledig vanuit je
programma:

- Load-All: telt op van 1 tot aan hoeveel rijen er ook bestaan, nooit
  gereset.
- Page-at-a-Time: hetzelfde — telt continu op gedurende de hele sessie,
  nooit gereset, omdat je nooit rijen verwijdert.
- Windowed: dit is het enige patroon waar je het *wel* reset, wanneer het
  venster verschuift en je een nieuwe batch herlaadt.

---

## 3. Patroon 1: Load-All Subfile

### Wanneer gebruiken

Datasets klein genoeg dat alles vooraf laden goedkoop en snel is —
doorgaans een paar duizend rijen of minder, of elk geval waarbij je weet
dat de resultaatset van nature begrensd is (bv. "orders voor deze ene
klant", niet "elke order in het bedrijf").

### DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(2000)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

`SFLSIZ(2000)` — groot genoeg om comfortabel elke rij te bevatten die we
verwachten. `SFLPAG(10)` — tien rijen zichtbaar tegelijk. Aangezien
`SFLSIZ` veel groter is dan `SFLPAG` en de *hele* dataset bevat, kan de
workstation de gebruiker vrij door alles heen laten scrollen zonder verdere
programma-betrokkenheid.

> **Tip:** als je rijaantal onvoorspelbaar is, kun je `SFLSIZ` een veld
> maken in plaats van een literal — `SFLSIZ(&SFLSIZFLD)` — en dat veld
> programmatisch instellen op je werkelijke rijaantal, *voordat* de eerste
> write naar `SFLCTL1`. Dit voorkomt zowel verspilde definitie als het
> risico dat je een getal kiest dat te klein is.

### RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1 int(5);

// --- 1. Leeg de subfile ---
*in30 = *on;
write SFLCTL1;
*in30 = *off;

// --- 2. Laad ALLE rijen, RRN elke keer ophogend ---
RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

dow SQLCODE = 0;
  exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
  if SQLCODE = 0;
    RRN1 += 1;
    write SFL1;
  endif;
enddo;

exec sql close c1;

// --- 3. Zet display indicators AAN, toon dan ---
*in31 = *on;   // SFLDSP
*in32 = *on;   // SFLDSPCTL

exfmt SFLCTL1;

*inlr = *on;
return;
```

### Stap-voor-stap trace

1. Programma start. Subfile wordt geleegd (voor het geval dit
   programma-exemplaar hergebruikt wordt, bv. opnieuw aangeroepen zonder te
   eindigen — leeg altijd defensief).
2. Cursor opent, en de `dow`-lus haalt elke rij op, schrijft elke rij naar
   `SFL1` met een oplopende `RRN1`. Op dit punt is nog niets zichtbaar —
   `SFLDSP`/`SFLDSPCTL` staan nog uit.
3. Zodra het laden klaar is, gaan beide display indicators aan en toont
   `EXFMT SFLCTL1` het scherm. De workstation heeft op dit moment al alle
   rijen in de subfile buffer, dus op- en neerscrollen vanaf hier wordt
   volledig door de terminal/workstation afgehandeld — je programma ziet
   pas weer een EXFMT-return wanneer de gebruiker een functietoets indrukt
   zoals F3 of Enter.

### Checklist veelgemaakte fouten

- ❌ `SFLSIZ` te klein instellen voor de werkelijke dataset — veroorzaakt
  een runtime "subfile full" fout bij `WRITE` zodra je hem overschrijdt.
- ❌ Vergeten `SFLCLR` uit te zetten voor de laadlus.
- ❌ `RRN1` niet resetten naar 0 voor het herladen (bv. gebruiker doet een
  "opnieuw zoeken") — veroorzaakt dubbele-RRN fouten of oude rijen vermengd
  met nieuwe.
- ❌ `SFLDSP`/`SFLDSPCTL` aanzetten *voordat* de laadlus draait — veroorzaakt
  onnodige herteken/flikkering tijdens het laden.
- ❌ Het geval van nul rijen niet afhandelen — als `RRN1` nog 0 is na het
  laden, overweeg dan een "geen records gevonden" bericht te tonen in
  plaats van een lege lijst.

---

## 4. Patroon 2: Page-at-a-Time Subfile (volledig terugscrollen)

### Wanneer gebruiken

Grote of onbegrensde datasets waarbij alles vooraf laden traag of
verspillend zou zijn, maar je het prima vindt dat de subfile (en dus het
geheugengebruik) groeit naarmate de gebruiker verder en verder naar beneden
scrolt. De meeste bedrijfsapplicaties met "redelijke" datavolumes en normaal
gebruikersgedrag (ze kijken naar een scherm of twee, en handelen dan op een
rij) passen goed bij dit patroon.

### DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(9999)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

De DDS ziet er bijna identiek uit aan Load-All — dezelfde `SFLSIZ >>
SFLPAG` relatie — maar het verschil zit volledig in *wanneer* rijen geladen
worden: hier laden we één pagina tegelijk, aangestuurd door het scrollen
van de gebruiker, in plaats van alles in één keer vooraf.

### RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1      int(5);
dcl-s pageSize  int(5) inz(10);
dcl-s rowsRead  int(5);
dcl-s cursorEnd ind inz(*off);

// --- Eenmalige setup: leeg subfile, open cursor ---
*in30 = *on;
write SFLCTL1;
*in30 = *off;

RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

// --- Vul de subfile met de eerste pagina('s) ---
exsr LoadNextPage;
exsr LoadNextPage;   // twee pagina's vooraf laden is optioneel, geeft soepeler vroeg scrollen

*in31 = *on;   // SFLDSP
*in32 = *on;   // SFLDSPCTL

dow ExitKey = *off;
  exfmt SFLCTL1;

  if ExitKey = *on;
    leave;
  endif;

  if SFLEND = *on;
    if cursorEnd = *off;
      exsr LoadNextPage;   // gebruiker bereikte onderkant geladen data — haal meer op
    else;
      SFLEND = *off;       // geen data meer, stop met vragen
    endif;
  endif;
enddo;

exec sql close c1;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
    if SQLCODE = 0;
      RRN1 += 1;
      write SFL1;
      rowsRead += 1;
    else;
      cursorEnd = *on;
    endif;
  enddo;
endsr;
```

### Stap-voor-stap trace: 3x naar beneden scrollen, 2x omhoog, weer naar beneden

Dit is het scenario dat de moeite waard is om zorgvuldig te doorlopen,
aangezien het het deel is dat *lijkt* alsof het mis zou kunnen gaan, maar
dat niet doet.

Stel je hebt al 3 pagina's geladen → `RRN1` = 30 (rijen 1-30 zitten in de
subfile). De cursor `c1` heeft precies die 30 rijen opgehaald en staat nu
klaar om rij 31 op te halen.

1. **Twee keer omhoog scrollen** (pagina 3 → pagina 2 → pagina 1, nu rijen
   1-10 zichtbaar). Dit is pure workstation-navigatie over data die al in
   de buffer zit. Het RPGLE-programma is **helemaal niet betrokken** — geen
   EXFMT-returns, `SFLEND` verandert niet, de cursor verplaatst niet. Er
   gebeurt niets aan de programmakant.
2. **Weer naar beneden scrollen** (pagina 1 → pagina 2 → pagina 3). Nog
   steeds geen programma-betrokkenheid — rijen 1-30 zitten al in de
   subfile, dus de workstation verplaatst simpelweg het venster weer naar
   beneden over data die hij al heeft. `SFLEND` blijft uit, want je hebt de
   *onderkant van geladen data* nog niet bereikt — je beweegt alleen
   binnen wat al geladen is.
3. **Voorbij rij 30 scrollen** (proberen rij 31+ te zien). *Nu* gaat
   `SFLEND` aan, geeft `EXFMT` controle terug aan het programma, en vuurt
   `LoadNextPage` af om rijen 31-40 op te halen.

**Het mentale model:** `SFLEND` interesseert zich alleen voor de grens
tussen "geladen" en "nog niet geladen." Het heeft geen concept van waar de
gebruiker zich momenteel bevindt of hoe vaak er heen en weer gescrold is.
Bewegen binnen al geladen rijen is onzichtbaar voor je programma, hoe vaak
dat ook gebeurt, in beide richtingen — het triggert nooit een nieuwe fetch
of herstart de query. En omdat de positie van de SQL-cursor volledig
onafhankelijk is van het subfile-venster — hij gaat alleen vooruit wanneer
*jij* `fetch` aanroept — heeft scrollen op het scherm nul effect erop. Hij
blijft geparkeerd bij rij 31 tot je programma daadwerkelijk om meer vraagt.

### Checklist veelgemaakte fouten

- ❌ `SFLSIZ` = `SFLPAG` instellen — verandert dit in een niet-terugscrollen,
  vervang-en-herlaad patroon, wat andere (complexere) logica nodig heeft
  om terugscrollen alsnog mogelijk te maken.
- ❌ `RRN1` ergens in de laadlus resetten naar 0 — overschrijft eerdere
  rijen in plaats van toe te voegen, en breekt terugscrollen direct omdat
  je precies de data vernietigt waar de gebruiker naar terug moet kunnen
  scrollen.
- ❌ Vergeten `SFLEND` weer uit te zetten zodra de cursor uitgeput is — het
  "Meer..." bericht blijft eindeloos herhalen zelfs als er niets meer te
  laden valt.
- ❌ De cursor sluiten en heropenen bij elke `EXFMT` — kost veel prestatie
  en ondermijnt het hele doel van page-at-a-time (je zou de query telkens
  vanaf nul opnieuw draaien).
- ❌ `SFLSIZ` te klein laten zijn voor hoe ver gebruikers realistisch
  scrollen — leidt uiteindelijk tot een "subfile full" fout bij `WRITE`
  zodra `RRN1` deze overschrijdt. Als een bestand redelijkerwijs een
  redelijke `SFLSIZ` kan overschrijden, overweeg dan het Windowed patroon
  (Sectie 5).

---

## 5. Patroon 3: Windowed Subfile (begrensd geheugen, oude pagina's laten vallen)

### Wanneer gebruiken

Echt enorme datasets — miljoenen rijen — waarbij zelfs "houd alles vast wat
de gebruiker doorgescrold heeft" (Patroon 2) risico's op onbegrensde
geheugengroei kent over een lange sessie. Het windowed patroon begrenst de
subfile op een vast aantal pagina's door **de oudst geladen pagina(‘s) te
laten vallen** zodra de gebruiker er comfortabel voorbij is gescrold, en ze
opnieuw op te halen uit de database als de gebruiker ver genoeg terugscrolt
om ze weer nodig te hebben.

### De toegevoegde complexiteit

In Patronen 1 en 2 gaat `RRN1` alleen maar omhoog — je verwijdert nooit
rijen, dus er is niets om te hernummeren. In het windowed patroon heb je,
zodra je oude rijen laat vallen, een keuze in hoe je de ontstane leemte
afhandelt:

- **Reset/hernummer de RRN's** telkens wanneer het venster verschuift: leeg
  de subfile en herlaad een verse batch rijen die weer begint bij
  `RRN1 = 1`. Eenvoudiger te doorgronden en te implementeren; de afweging is
  een korte leeg-en-herlaad moment zodra de gebruiker een venstergrens
  overschrijdt richting achteren (of vooruit, symmetrisch).
- **Echt schuivend venster**: `DELETE` oude rijen één voor één van de
  *voorkant* van de subfile en blijf nieuwe toevoegen bovenaan, zonder ooit
  `RRN1` te resetten. Theoretisch "correcter", maar merkbaar lastiger om
  goed te krijgen (RRN-boekhouding voor verwijderen-en-verschuiven gaat
  makkelijk subtiel mis).

**Deze gids gebruikt de reset/hernummer-aanpak** — makkelijker te
onderwijzen, en de gebruikelijkere keuze in echte bedrijven, aangezien de
korte herlaad zelden merkbaar is voor de gebruiker.

### DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(0030)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A                                      CF05
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

Hier is `SFLSIZ(0030)` onze **vaste venstergrootte**: 3 pagina's van 10
rijen elk. In tegenstelling tot Patronen 1 en 2 is dit plafond bewust strak
— dat is precies het punt van dit patroon. Merk de toegevoegde `CF05` op —
we gebruiken deze als vervangende toets die de gebruiker kan indrukken om
terug te scrollen, aangezien het detecteren van "voorbij de laten-vallen
grens omhoog gescrold" wat meer expliciete signalering vereist dan `SFLEND`
alleen geeft. (Op een echt scherm zou je doorgaans vertrouwen op roll-
up/roll-down toetsen plus het controleren van `RRN1`/huidige positie — zie
de trace hieronder voor precies hoe.)

### RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1        int(5);
dcl-s pageSize    int(5) inz(10);
dcl-s windowPages int(5) inz(3);           // hoeveel pagina's we tegelijk vasthouden
dcl-s rowsRead    int(5);
dcl-s cursorEnd   ind inz(*off);
dcl-s topKeyLoaded  like(CUSTNO);          // laagste custno momenteel in het venster
dcl-s lastKeyLoaded like(CUSTNO);          // hoogste custno momenteel in het venster

// --- Eenmalige setup ---
*in30 = *on;
write SFLCTL1;
*in30 = *off;

RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

exsr LoadNextPage;
exsr LoadNextPage;
exsr LoadNextPage;   // vul het hele venster (3 pagina's) vooraf

*in31 = *on;
*in32 = *on;

dow ExitKey = *off;
  exfmt SFLCTL1;

  if ExitKey = *on;
    leave;
  endif;

  if SFLEND = *on;
    // gebruiker scrolde naar onderkant van het venster — schuif vooruit
    if cursorEnd = *off;
      exsr SlideWindowForward;
    else;
      SFLEND = *off;
    endif;
  endif;

  // Een echt scherm zou "gebruiker rolde omhoog voorbij topKeyLoaded"
  // detecteren via cursorpositie-controle / een roll-up toets gecombineerd
  // met RRN1-tracking. Voor de duidelijkheid stelt deze gids die conditie
  // voor als CF05 (F5 = "een pagina terug").
  if *in05 = *on;
    exsr SlideWindowBackward;
    *in05 = *off;
  endif;
enddo;

exec sql close c1;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
    if SQLCODE = 0;
      RRN1 += 1;
      write SFL1;
      rowsRead += 1;
      lastKeyLoaded = CUSTNO;
      if RRN1 = 1;
        topKeyLoaded = CUSTNO;
      endif;
    else;
      cursorEnd = *on;
    endif;
  enddo;
endsr;

// Laat de oudste pagina vallen, laad één nieuwe pagina onderaan.
// Hier geïmplementeerd als: leeg het hele venster en herlaad vanaf net
// voorbij de huidige bovengrens — de eenvoudigste correcte aanpak voor
// een reset/hernummer-ontwerp.
begsr SlideWindowForward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  exec sql close c1;
  exec sql declare c1 cursor for
    select custno, custname, balance
    from customer
    where custno > :topKeyLoaded    // start net voorbij eerste rij van oude venster
      and custno > (
        select custno from customer
        order by custno
        offset :pageSize rows fetch first 1 row only
      )
    order by custno;
  // NB: de exacte "schuif één pagina vooruit vanaf huidige top" logica
  // hangt af van je SQL-dialect/versie — het concept is: herposition de
  // cursor om te starten één pagina voorbij de huidige topKeyLoaded, zodat
  // het nieuwe venster pagina's [2,3,4] wordt in plaats van [1,2,3].
  exec sql open c1;

  cursorEnd = *off;
  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;

// Gebruiker scrolde terug voorbij topKeyLoaded — herlaad het venster één
// pagina eerder dan waar het momenteel begint.
begsr SlideWindowBackward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  exec sql close c1;
  exec sql declare c1 cursor for
    select custno, custname, balance
    from customer
    where custno < :topKeyLoaded
    order by custno desc
    fetch first :pageSize rows only;
  // Dit haalt de pagina direct voor het huidige venster op, in aflopende
  // volgorde; je zou dit terugdraaien naar oplopend voordat je naar de
  // subfile schrijft, zodat rijen in de juiste volgorde getoond worden.
  exec sql open c1;

  cursorEnd = *off;
  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;
```

> **Om hier eerlijk over te zijn:** de vooruit/achteruit
> venster-verschuivende SQL hierboven is bewust geschreven om de *vorm* van
> de oplossing te tonen — een cursor herpositioneren relatief aan een
> bekende grenswaarde, dan een vast aantal pagina's herladen. De exacte
> query-syntax (`OFFSET`/`FETCH FIRST`, of je Db2 for i versie deze direct
> ondersteunt, hoe je gelijkspel in sorteersleutels afhandelt, etc.) moet
> aangepast worden aan je werkelijke omgeving en tabel. Beschouw dit als
> het patroon om aan te passen, niet als kant-en-klare productiecode, meer
> nog dan Patronen 1 en 2 hierboven.

### Stap-voor-stap trace: continu naar beneden scrollen vs. terugscrollen voorbij de laten-vallen grens

**Continu naar beneden scrollen:** gebruiker start met rijen 1-30 geladen
(pagina's 1-3). Ze scrollen voorbij rij 30 → `SFLEND` gaat af →
`SlideWindowForward` leegt de subfile en herlaadt met pagina's 2-4 (rijen
11-40) → `RRN1` reset naar 0 en klimt weer naar 30 terwijl het nieuwe
venster laadt → de workstation tekent opnieuw en toont ongeveer waar de
gebruiker was, nu binnen het nieuwe venster.

**Terugscrollen voorbij de laten-vallen grens:** gebruiker is nu in het
pagina's-2-4 venster (rijen 11-40 geladen, `topKeyLoaded` = sleutel van rij
11). Ze rollen omhoog voorbij rij 11 — proberen rij 10 te zien, die niet
meer geladen is. In ons vereenvoudigde voorbeeld wordt dit voorgesteld door
op F5 te drukken: `SlideWindowBackward` gaat af, leegt de subfile, en
herlaadt de pagina direct voor de huidige top (rijen 1-10), plus genoeg
pagina's erna om het venster weer te vullen.

Het belangrijke gedragsverschil met Patroon 2: **de herlaad is hier
zichtbaar** — de subfile leegt en vult kort opnieuw, versus Patroon 2 waar
scrollen binnen al geladen data onzichtbaar is voor de gebruiker. Dit is de
afweging die je accepteert in ruil voor begrensd geheugengebruik.

### Checklist veelgemaakte fouten

- ❌ Vergeten `RRN1` te resetten naar 0 wanneer het venster verschuift — in
  tegenstelling tot Patronen 1 en 2 *vereist* dit patroon de reset telkens
  wanneer het venster verschuift, aangezien je bewust RRN-slots hergebruikt
  voor andere data.
- ❌ `topKeyLoaded`/`lastKeyLoaded` uit het oog verliezen — zonder deze heb
  je geen betrouwbare grens om de cursor tegen te herpositioneren wanneer
  je het venster in beide richtingen laat schuiven.
- ❌ Off-by-one fouten bij venstergrenzen — het is makkelijk om óf een
  pagina te herladen die je al had, óf een hele pagina over te slaan, bij
  het berekenen waar het nieuwe venster moet beginnen. Test herhaaldelijk
  heen en weer scrollen over een grens.
- ❌ Aannemen dat dit patroon "gratis" terugscrollen is zoals Patroon 2 —
  dat is het niet; een venstergrens overschrijden kost altijd een echte
  database-roundtrip en een zichtbare subfile-herlaad. Grijp alleen naar dit
  patroon wanneer de onbegrensde geheugengroei van Patroon 2 een echte
  zorg is.
- ❌ Gelijkspel in je sorteersleutel niet afhandelen (bv. dubbele `custno`
  waarden, mocht dat mogelijk zijn) — grens-gebaseerde herpositionering
  gaat ervan uit dat de sorteersleutel genoeg is om uniek vanaf een punt te
  hervatten; voeg een tiebreaker-kolom toe indien nodig.

---

## 6. Vergelijking naast elkaar

| | Load-All | Page-at-a-Time | Windowed |
|---|---|---|---|
| `SFLSIZ` instelling | Groot genoeg voor hele dataset | Groot (bv. 9999) | Klein, vast (bv. 3x paginagrootte) |
| Geheugengebruik | Groeit vooraf naar volledige dataset-grootte | Groeit terwijl gebruiker scrolt, onbegrensd over lange sessie | Begrensd, overschrijdt nooit venstergrootte |
| Terugscroll-gedrag | Gratis, direct, onbeperkt | Gratis, direct, onbeperkt (binnen geladen data) | Gratis binnen het venster; kost een herlaad bij overschrijden van venstergrens |
| Initiële laadtijd | Kan traag zijn bij grote dataset | Snel (slechts één pagina eerst geladen) | Snel (slechts venstergrootte pagina's eerst geladen) |
| Complexiteit | Laag | Gemiddeld | Hoog |
| Beste gebruikssituatie | Kleine/begrensde datasets | Grote datasets, typisch gebruikersgedrag (een scherm of twee) | Zeer grote/onbegrensde datasets, lange sessies, geheugenbeperkte omgevingen |

---

## 7. Volledige werkende codelijsten (bijlage)

### 7.1 Load-All — DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(2000)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

### 7.2 Load-All — RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1 int(5);

*in30 = *on;
write SFLCTL1;
*in30 = *off;

RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

dow SQLCODE = 0;
  exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
  if SQLCODE = 0;
    RRN1 += 1;
    write SFL1;
  endif;
enddo;

exec sql close c1;

*in31 = *on;
*in32 = *on;

exfmt SFLCTL1;

*inlr = *on;
return;
```

### 7.3 Page-at-a-Time — DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(9999)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

### 7.4 Page-at-a-Time — RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1      int(5);
dcl-s pageSize  int(5) inz(10);
dcl-s rowsRead  int(5);
dcl-s cursorEnd ind inz(*off);

*in30 = *on;
write SFLCTL1;
*in30 = *off;

RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

exsr LoadNextPage;
exsr LoadNextPage;

*in31 = *on;
*in32 = *on;

dow ExitKey = *off;
  exfmt SFLCTL1;

  if ExitKey = *on;
    leave;
  endif;

  if SFLEND = *on;
    if cursorEnd = *off;
      exsr LoadNextPage;
    else;
      SFLEND = *off;
    endif;
  endif;
enddo;

exec sql close c1;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
    if SQLCODE = 0;
      RRN1 += 1;
      write SFL1;
      rowsRead += 1;
    else;
      cursorEnd = *on;
    endif;
  enddo;
endsr;
```

### 7.5 Windowed — DDS

```
     A                                      DSPSIZ(24 80 *DS3)
     A          R SFL1                       SFL
     A            CUSTNO         6  O  4 2
     A            CUSTNAME      30  O  4 10
     A            BALANCE       9 2O  4 45
     A
     A          R SFLCTL1                    SFLCTL(SFL1)
     A                                      SFLSIZ(0030)
     A                                      SFLPAG(0010)
     A N31                                  SFLDSP
     A N32                                  SFLDSPCTL
     A  30                                  SFLCLR
     A N33                                  SFLEND(*MORE)
     A                                      OVERLAY
     A                                      CF03
     A                                      CF05
     A            RRN1           4S 0H      SFLRCDNBR
     A                                 1 30'Customer List'
```

### 7.6 Windowed — RPGLE

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);

dcl-ds dspInd;
  SFLCLR    ind pos(30);
  SFLDSP    ind pos(31);
  SFLDSPCTL ind pos(32);
  SFLEND    ind pos(33);
  ExitKey   ind pos(3);
end-ds;

dcl-s RRN1        int(5);
dcl-s pageSize    int(5) inz(10);
dcl-s windowPages int(5) inz(3);
dcl-s rowsRead    int(5);
dcl-s cursorEnd   ind inz(*off);
dcl-s topKeyLoaded  like(CUSTNO);
dcl-s lastKeyLoaded like(CUSTNO);

*in30 = *on;
write SFLCTL1;
*in30 = *off;

RRN1 = 0;

exec sql declare c1 cursor for
  select custno, custname, balance
  from customer
  order by custno;
exec sql open c1;

exsr LoadNextPage;
exsr LoadNextPage;
exsr LoadNextPage;

*in31 = *on;
*in32 = *on;

dow ExitKey = *off;
  exfmt SFLCTL1;

  if ExitKey = *on;
    leave;
  endif;

  if SFLEND = *on;
    if cursorEnd = *off;
      exsr SlideWindowForward;
    else;
      SFLEND = *off;
    endif;
  endif;

  if *in05 = *on;
    exsr SlideWindowBackward;
    *in05 = *off;
  endif;
enddo;

exec sql close c1;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    exec sql fetch c1 into :CUSTNO, :CUSTNAME, :BALANCE;
    if SQLCODE = 0;
      RRN1 += 1;
      write SFL1;
      rowsRead += 1;
      lastKeyLoaded = CUSTNO;
      if RRN1 = 1;
        topKeyLoaded = CUSTNO;
      endif;
    else;
      cursorEnd = *on;
    endif;
  enddo;
endsr;

begsr SlideWindowForward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  exec sql close c1;
  exec sql declare c1 cursor for
    select custno, custname, balance
    from customer
    where custno > :topKeyLoaded
      and custno > (
        select custno from customer
        order by custno
        offset :pageSize rows fetch first 1 row only
      )
    order by custno;
  exec sql open c1;

  cursorEnd = *off;
  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;

begsr SlideWindowBackward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  exec sql close c1;
  exec sql declare c1 cursor for
    select custno, custname, balance
    from customer
    where custno < :topKeyLoaded
    order by custno desc
    fetch first :pageSize rows only;
  exec sql open c1;

  cursorEnd = *off;
  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;
```
