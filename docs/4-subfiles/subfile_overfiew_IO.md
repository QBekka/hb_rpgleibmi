---
position sidebar: 3
---

# 4.3 RPGLE Subfiles: Native I/O Variant

> **Bijbehorend bestand:** dit bestand gaat ervan uit dat je eerst
> `subfile-guide-nl.md` gelezen hebt. De DDS (SFL/SFLCTL, SFLSIZ/SFLPAG,
> indicators, RRN) is in elk patroon **identiek** — daar verandert niets.
> Het enige verschil is *hoe je rijen ophaalt uit de databron*: native
> I/O-operaties (`SETLL`, `READ`, `READE`, `READP`) in plaats van een SQL
> cursor (`DECLARE CURSOR` / `FETCH`). Dit bestand richt zich alleen op dat
> verschil en toont de RPGLE voor elk patroon opnieuw met native I/O erin
> vervangen. Gemaakt door Claude ai, door Reinald Jansen.

---

## 4.3.1. Hoe dit bestand zich verhoudt tot de hoofdgids

Alles in Secties 1–2 en 6 van `subfile-guide-nl.md` (wat een subfile is,
SFL vs SFLCTL, SFLSIZ vs SFLPAG, de indicators, RRN, en de
vergelijkingstabel) geldt hier ongewijzigd. Lees dat eerst als je dat nog
niet gedaan hebt.

Wat verschilt: in plaats van een cursor te openen en herhaaldelijk `FETCH`
aan te roepen, werkt native I/O direct tegen een physical of logical file
via **sleutelgebaseerde positionering** (`SETLL`/`SETGT`) gevolgd door
**sequentiële reads** (`READ`/`READE` voorwaarts, `READP` achterwaarts).

---

## 4.3.2. Native I/O fetch-mechaniek

### Positioneren: SETLL en SETGT

Voordat je sequentieel door een bestand kunt lezen in native I/O, moet je
positioneren naar een startpunt:

- **`SETLL`** ("set lower limit") — positioneert bij het eerste record
  waarvan de sleutel **groter dan of gelijk aan** de opgegeven sleutel is.
  Als er een record met precies die sleutel bestaat, land je er direct op.
- **`SETGT`** ("set greater than") — positioneert bij het eerste record
  waarvan de sleutel **strikt groter dan** de opgegeven sleutel is. Handig
  voor "ga door na deze sleutel"-logica, aangezien het de exacte match
  overslaat.

```rpgle
setll custKey CUSTFILE;   // positioneer op/na custKey
setgt custKey CUSTFILE;   // positioneer strikt na custKey
```

### Voorwaarts lezen: READ en READE

- **`READ`** — leest het volgende record in het huidige access path van het
  bestand, ongeacht sleutel.
- **`READE`** — leest het volgende record alleen als het nog matcht met een
  gegeven sleutel (handig bij het lezen van alle records die een
  gedeeltelijke sleutel delen, minder relevant voor eenvoudig
  top-tot-onder subfile laden, maar goed om te weten).

```rpgle
read CUSTFILE;
dow not %eof(CUSTFILE);
  // verwerk record
  read CUSTFILE;
enddo;
```

### Achterwaarts lezen: READP

- **`READP`** — leest het *vorige* record relatief aan de huidige positie.
  Dit is wat het achterwaarts herophalen in het Windowed patroon mogelijk
  maakt bij native I/O — er is geen cursor-object om te herpositioneren,
  dus je doet `SETLL`/`SETGT` naar een grenssleutel en loopt dan
  achterwaarts met `READP`.

```rpgle
readp CUSTFILE;
dow not %eof(CUSTFILE);
  // verwerk record
  readp CUSTFILE;
enddo;
```

### Geen fouten aan begin/eind van data — %EOF en %FOUND

Dit is de moeite waard om expliciet te noemen, aangezien het makkelijk is
hier een exception te verwachten terwijl die er niet is:

- **Voorbij een van beide uiteinden van het bestand lopen tijdens een
  `READ`/`READE`/`READP`** is geen foutconditie — het is een normale,
  verwachte uitkomst. Controleer **`%EOF(bestandsnaam)`**, die `*aan` wordt
  wanneer een read geen volgend/vorig record kan vinden. De velden van de
  recordbuffer worden simpelweg *niet bijgewerkt* bij die mislukte read,
  en precies daarom controleer je `%EOF` voordat je de velden vertrouwt, in
  plaats van de read in een `monitor`-blok te wrappen.

- **`SETLL`/`SETGT` die geen matchende positie vindt** (bv. positioneren
  voorbij het laatste record, of voor het eerste) wordt aangegeven door
  **`%FOUND(bestandsnaam)`** die `*uit` terugkomt. Ook hier geen exception —
  gewoon "kon daar niet exact positioneren."

```rpgle
setll custKey CUSTFILE;
if %found(CUSTFILE);
  read CUSTFILE;
else;
  // geen record op/na die sleutel
endif;
```

**Wat wél echt een fout/exception is in native I/O:** het bestand dat niet
open is, een record-format mismatch, een vergrendeld record bij een
update, of een hardware-/communicatiefout. Dat is anders dan "geen data
meer" en zou doorgaans verschijnen als een echte RPG-exception, afgehandeld
met `monitor`/`on-error` — niet iets wat je tegenkomt tijdens het normale
doorbladeren van een subfile.

---

## 4.3.3. Patroon 1: Load-All — native I/O versie

Zelfde DDS als `subfile-guide-nl.md` Sectie 7.1 — daar verandert niets.
Alleen de RPGLE-laadlus verschilt: in plaats van een cursor openen we het
bestand en lezen we er recht doorheen, van boven naar beneden.

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);
dcl-f CUSTFILE if keyed usropn;

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

open CUSTFILE;

read CUSTFILE;
dow not %eof(CUSTFILE);
  RRN1 += 1;
  write SFL1;
  read CUSTFILE;
enddo;

close CUSTFILE;

*in31 = *on;
*in32 = *on;

exfmt SFLCTL1;

*inlr = *on;
return;
```

Merk `usropn` op bij de bestandsdeclaratie — dit laat ons precies bepalen
wanneer het bestand opent/sluit, wat de expliciete open/close-timing
weerspiegelt die we hadden met `exec sql open`/`close` in de hoofdgids. De
laadlus zelf is het klassieke native I/O-idioom: één `READ` vóór de lus, dan
nog een `READ` onderaan de lus, met `%EOF` als lusvoorwaarde.

---

## 4.3.4. Patroon 2: Page-at-a-Time — native I/O versie

Zelfde DDS als `subfile-guide-nl.md` Sectie 7.3. Het verschil zit volledig
in `LoadNextPage`: in plaats van te fetchen uit een open cursor, houden we
het bestand open gedurende het hele programma en roepen we simpelweg
steeds `READ` aan — de eigen leespositie van het bestand blijft op
natuurlijke wijze behouden tussen aanroepen, op dezelfde manier als de
positie van een cursor dat doet.

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);
dcl-f CUSTFILE if keyed usropn;

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

open CUSTFILE;
setll *loval CUSTFILE;   // positioneer helemaal aan het begin van het bestand

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

close CUSTFILE;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    read CUSTFILE;
    if not %eof(CUSTFILE);
      RRN1 += 1;
      write SFL1;
      rowsRead += 1;
    else;
      cursorEnd = *on;
    endif;
  enddo;
endsr;
```

**Waarom dit op dezelfde manier werkt als de SQL-cursor:** de leespositie
van het bestand — net als die van de cursor — staat los van wat er op dat
moment op het scherm zichtbaar is. Zodra je eenmaal `SETLL *loval` doet aan
het begin, pakt elke volgende `READ` precies op waar de vorige gebleven
was, ongeacht hoeveel de gebruiker op het scherm heen en weer gescrold
heeft tussen aanroepen van `LoadNextPage`. De trace uit de hoofdgids (3x
naar beneden scrollen, 2x omhoog, weer naar beneden — geen herlaad tot
werkelijk voorbij de geladen data) geldt hier identiek.

---

## 4.3.5. Patroon 3: Windowed — native I/O versie

Zelfde DDS als `subfile-guide-nl.md` Sectie 7.5. Hier komt de `READP` van
native I/O echt van pas — de achterwaartse herophaal bij het terugschuiven
van het venster heeft geen tweede cursor of `DESC`-sortering nodig; je
herpositioneert simpelweg met `SETLL`/`SETGT` en loopt achterwaarts met
`READP`.

```rpgle
dcl-f DSPFILE workstn indds(dspInd) sfile(SFL1:RRN1);
dcl-f CUSTFILE if keyed usropn;

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

open CUSTFILE;
setll *loval CUSTFILE;

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

close CUSTFILE;
*inlr = *on;
return;

begsr LoadNextPage;
  rowsRead = 0;
  dow rowsRead < pageSize and cursorEnd = *off;
    read CUSTFILE;
    if not %eof(CUSTFILE);
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

// Schuif vooruit: laat de oudste pagina vallen, herlaad startend één
// pagina voorbij de huidige bovengrens.
begsr SlideWindowForward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  // Herpositioneer net na de huidige topsleutel, spring dan één pagina
  // vooruit om bij het nieuwe vensterbegin te landen.
  setgt topKeyLoaded CUSTFILE;
  for-each in range(1:pageSize);
    read CUSTFILE;
    if %eof(CUSTFILE);
      leave;
    endif;
  endfor;
  // Op dit punt staat het bestand gepositioneerd één pagina voorbij de
  // oude top; de volgende READ in LoadNextPage pakt hier op.

  cursorEnd = *off;
  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;

// Schuif achteruit: herpositioneer net vóór de huidige topsleutel, loop
// dan één pagina achteruit met READP, verzamel de rijen in omgekeerde
// volgorde, en schrijf ze daarna in de juiste oplopende volgorde naar de
// subfile.
begsr SlideWindowBackward;
  *in30 = *on;
  write SFLCTL1;
  *in30 = *off;

  RRN1 = 0;

  setll topKeyLoaded CUSTFILE;
  readp CUSTFILE;             // één record vóór de huidige top

  cursorEnd = *off;
  rowsRead = 0;
  dow rowsRead < pageSize and not %eof(CUSTFILE);
    // NB: rijen komen binnen in aflopende volgorde via READP. In een
    // echte implementatie verzamel je ze hier in een array/datastructuur,
    // en schrijf je ze na de lus in omgekeerde (oplopende) volgorde naar
    // SFL1, zodat de subfile correct van boven naar beneden weergeeft.
    readp CUSTFILE;
    rowsRead += 1;
  enddo;

  // Herpositioneer weer voorwaarts en herlaad het volledige venster in
  // normale oplopende volgorde voor de daadwerkelijke subfile-writes.
  setll topKeyLoaded CUSTFILE;
  // (loop pageSize records terug via SETLL/READP-boekhouding, doe dan
  //  SETGT net voor dat punt en lees weer voorwaarts als normaal)

  exsr LoadNextPage;
  exsr LoadNextPage;
  exsr LoadNextPage;
endsr;
```

> **Om hier eerlijk over te zijn, net als in de hoofdgids:** de
> achterwaarts-schuivende logica hier is het lastigste onderdeel van de
> hele gids, in beide I/O-stijlen. `READP` van native I/O geeft je het
> *mechanisme* om achterwaarts te lopen, maar het omzetten van een reeks
> `READP`-resultaten (van nature aflopend) naar de correcte oplopende
> volgorde voor subfile-weergave vereist óf het bufferen van rijen in een
> array voordat je ze schrijft, óf twee passes (één om de juiste
> startsleutel te vinden, een tweede om vanaf daar voorwaarts te lezen) —
> de pseudocode hierboven schetst de tweede aanpak. Beschouw dit als de
> vorm van de oplossing om aan te passen aan je exacte bestand/sleutels,
> in plaats van productieklare code, meer nog dan enige andere sectie in
> beide bestanden.

### Waarom %EOF/%FOUND controles hier meer uitmaken dan in Patronen 1–2

In het windowed patroon specifiek onderzoek je bewust beide randen van de
data (begin van het bestand bij ver genoeg terugschuiven, einde van het
bestand bij vooruit schuiven aan het eind van de dataset). Dit is precies
het scenario dat Sectie 2 hierboven beschrijft — er worden geen exceptions
gegooid, maar je moet `%FOUND` controleren na elke `SETLL`/`SETGT` en
`%EOF` na elke `READ`/`READP` voordat je de buffer vertrouwt, anders
verwerk je stilzwijgend verouderde/overgebleven veldwaarden van de vorige
succesvolle read.

---

## 4.3.6. Volledige werkende codelijsten (bijlage)

De drie RPGLE-listings in Secties 3, 4 en 5 hierboven zijn de complete,
zelfstandige versies voor elk patroon — kopieer direct daarvandaan. De DDS
voor alle drie is ongewijzigd ten opzichte van `subfile-guide-nl.md`
(respectievelijk Secties 7.1, 7.3 en 7.5); niets in het display file
verschilt tussen de SQL- en native I/O-versies.
