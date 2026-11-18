---
sidebar_position: 0
---

# Native I/O Operaties in RPGLE — Cheat Sheet

*Cheatsheet voor I/O operaties, %BIF's en berichten. Gemaakt door Claude ai door Reinald Jansen.*

> **Free vs. fixed vs. ILE** — drie dingen die vaak door elkaar worden gehaald:
> - **ILE** is het *programmamodel* (modules, service programs, activation groups).
> - **RPG IV / RPGLE** is de *taal*; die kent zowel **fixed-format** (kolommen) als **free-format**.
> - Een **opcode** (`CHAIN`, `READ`, …) blijft een opcode in beide notaties. Een **BIF** (`%FOUND`, `%EOF`, …) is een *functie* die een waarde teruggeeft; BIF's werken in fixed-format alleen in *extended factor 2* (`IF`, `EVAL`, `DOW`, …).
>
> **Er bestaat dus géén `%CHAIN`.** `CHAIN` is in free én fixed gewoon `CHAIN`. Wat in modern RPG verandert, is dat je het resultaat niet meer via een indicator (kolom 71-76) uitleest, maar via een BIF (`%FOUND`, `%EOF`, `%ERROR`).

---

## 0.1.0. Cheatsheet — alle operaties

| Operatie | Doel | Opcode (free = fixed) | Key nodig? | Fixed-indicatoren (71-72 / 73-74 / 75-76) | BIF om te testen |
|---|---|---|---|---|---|
| Random access op key | Eén record ophalen via key | `CHAIN` | Ja (keyed file) | NR / ER / – | `%FOUND` |
| Random access op RRN | Eén record ophalen via relative record number | `CHAIN` | Nee (niet-keyed) | NR / ER / – | `%FOUND` |
| Positioneren op key | Cursor vóór eerste key ≥ zoekwaarde | `SETLL` | Ja (of RRN) | NR / ER / EQ | `%FOUND`, `%EQUAL` |
| Positioneren na key | Cursor ná laatste key = zoekwaarde | `SETGT` | Ja (of RRN) | NR / ER / – | `%FOUND` |
| Sequentieel lezen (voorwaarts) | Volgende record (keyed: keyvolgorde, niet-keyed: RRN-volgorde) | `READ` | Nee | – / ER / EOF | `%EOF` |
| Lezen zolang key gelijk blijft | Alle records met dezelfde (deel)key | `READE` | Ja | – / ER / EOF | `%EOF` |
| Sequentieel lezen (achterwaarts) | Vorige record | `READP` | Nee | – / ER / BOF | `%EOF` |
| Achterwaarts zolang key gelijk | Duplicaten achterwaarts | `READPE` | Ja | – / ER / BOF | `%EOF` |
| Nieuw record toevoegen | Record wegschrijven | `WRITE` | Nee | – / ER / EOF¹ | `%ERROR`, `%EOF`¹ |
| Bestaand record wijzigen | Laatst gelezen record bijwerken | `UPDATE` | Nee | – / ER / – | `%ERROR` |
| Record verwijderen | Via key, of laatst gelezen record | `DELETE` | Optioneel | NR / ER / – | `%FOUND` |
| Bestand openen | Expliciet openen (vereist `USROPN`) | `OPEN` | Nee | – / ER / – | `%OPEN`, `%ERROR` |
| Bestand sluiten | Expliciet sluiten | `CLOSE` | Nee | – / ER / – | `%ERROR` |
| Lock vrijgeven | Record-lock lossen zonder UPDATE/DELETE | `UNLOCK` | Nee | – / ER / – | `%ERROR` |
| Buffer forceren | Uitvoerbuffer naar schijf / einde-van-data | `FEOD` | Nee | – / ER / – | `%ERROR` |
| Transactie bevestigen | Commitment control | `COMMIT` | N.v.t. | – / ER / – | `%ERROR` |
| Transactie terugdraaien | Commitment control | **`ROLBK`** (niet `ROLLBACK`) | N.v.t. | – / ER / – | `%ERROR` |
| Scherm tonen + lezen | Write + read van een display-format | `EXFMT` | N.v.t. | – / ER / – | `%ERROR` |
| Gewijzigde subfile-regels lezen | Volgende gewijzigde subfile-record | `READC` | N.v.t. | – / ER / EOF | `%EOF` |

¹ `%EOF` na `WRITE` alleen bij een subfile: subfile is vol.
NR = no record found, ER = error, EQ = exacte key-match, EOF/BOF = einde/begin bestand.

**Extenders:**

| Extender | Van toepassing op | Effect |
|---|---|---|
| `(N)` | `CHAIN`, `READ`, `READE`, `READP`, `READPE` | Geen record lock (alleen zinvol bij update-bestanden; input-bestanden locken nooit). |
| `(E)` | Vrijwel elke I/O-operatie, ook `SND-MSG` | Vangt fouten op (status > 1000) → `%ERROR` en `%STATUS`. *Niet* voor "niet gevonden". |
| `(EN)` | Combinatie | Beide effecten tegelijk. |
| `(H M R)` | `CHAIN`, `SETLL`, … met key-**lijst** of `%KDS` (alleen free) | Afronding/precisie bij conversie van de zoekwaarden naar het key-type. |

**Regel #1:** `CHAIN` voor één record via een unieke key, `SETLL` + `READE` voor duplicaten, RRN-toegang alleen als je de fysieke positie al kent.

---

## 0.1.1. Bestanden declareren

**Free-format**

```rpgle
dcl-f CUSTL2 usage(*update : *output) keyed;   // record format CUSTR
dcl-f ORDL1  keyed usropn;                      // default usage(*input)
dcl-f CUSTPF usage(*update) infds(CustDs);      // niet-keyed → RRN-toegang

dcl-ds CustDs qualified;
  Rrn uns(10) pos(397);                         // RRN van laatst gelezen record
end-ds;
```

**Fixed-format**

```rpgle
     FCUSTL2    UF A E           K DISK
     FORDL1     IF   E           K DISK    USROPN
     FCUSTPF    UF   E             DISK    InfDs(CustDs)
     DCustDs          DS                  Qualified
     D Rrn                   397    400U 0
```

| Fixed (F-spec kolom) | Free (`DCL-F`) |
|---|---|
| 17 = `I` | `usage(*input)` (default voor DISK) |
| 17 = `U` | `usage(*update)` (impliceert ook `*delete` + `*input`) |
| 17 = `O` of 20 = `A` | `usage(*output)` |
| 34 = `K` | `keyed` |
| `USROPN` | `usropn` |

---

## 0.1.2. Per operatie: free vs. fixed

### CHAIN op key

**Free-format**

```rpgle
chain CustNr CUSTL2;
if %found(CUSTL2);
  Naam = KLNAAM;
endif;
```

**Fixed-format**

```rpgle
     C     CustNr        CHAIN     CUSTL2
     C                   IF        %FOUND(CUSTL2)
     C                   EVAL      Naam = KLNAAM
     C                   ENDIF
      * Oude RPG III-stijl: indicator 90 in pos. 71-72 = niet gevonden
     C     CustNr        CHAIN     CUSTL2                             90
```

### CHAIN met samengestelde key

In fixed-format gebruik je een `KLIST`/`KFLD`. In free-format bestaat `KLIST` niet meer; gebruik een **key-lijst** of **`%KDS`**.

**Free-format**

```rpgle
chain (KlantNr : OrdDatum) ORDL1;          // key-lijst

dcl-ds OrdKey likerec(ORDR : *key);        // key-DS op basis van recordformaat
OrdKey.KlantNr  = 1001;
OrdKey.OrdDatum = %date();
chain %kds(OrdKey) ORDL1;                  // %KDS
chain %kds(OrdKey : 1) ORDL1;              // alleen eerste keyveld (partial key)
```

**Fixed-format**

```rpgle
     C     OrdKey        KLIST
     C                   KFLD                    KlantNr
     C                   KFLD                    OrdDatum
      *
     C     OrdKey        CHAIN     ORDL1
```

### CHAIN op RRN

Werkt op een **niet-keyed** bestand; de zoekwaarde is een getal zonder decimalen.

**Free-format**

```rpgle
chain RrnNr CUSTPF;
if %found(CUSTPF);
endif;
```

**Fixed-format**

```rpgle
     C     RrnNr         CHAIN     CUSTPF
     C                   IF        %FOUND(CUSTPF)
     C                   ENDIF
```

### CHAIN zonder lock / met foutafvanging

**Free-format**

```rpgle
chain(n) CustNr CUSTL2;                    // alleen lezen, geen lock

chain(e) CustNr CUSTL2;
if %error and %status(CUSTL2) = 1218;
  // record is gelockt door een andere job
endif;
```

**Fixed-format**

```rpgle
     C     CustNr        CHAIN(N)  CUSTL2
     C     CustNr        CHAIN(E)  CUSTL2
     C                   IF        %ERROR AND %STATUS(CUSTL2) = 1218
      * record is gelockt door een andere job
     C                   ENDIF
```

### CHAIN/READ direct in een data structure (geen globale velden)

```rpgle
dcl-ds Klant likerec(CUSTR : *all);

chain CustNr CUSTL2 Klant;
if %found(CUSTL2);
  Klant.KLNAAM = 'Nieuwe naam';
  update CUSTR Klant;
endif;
```

Fixed: hetzelfde kan via het *result*-veld (kolom 50-63): `C     CustNr        CHAIN     CUSTL2        Klant`, met `D Klant  DS  LikeRec(CUSTR:*ALL)`.

### SETLL + READE (alle records met dezelfde key)

**Free-format**

```rpgle
setll KlantNr ORDL1;
if %equal(ORDL1);
  reade KlantNr ORDL1;
  dow not %eof(ORDL1);
    // ... verwerk order ...
    reade KlantNr ORDL1;
  enddo;
endif;
```

**Fixed-format**

```rpgle
     C     KlantNr       SETLL     ORDL1
     C                   IF        %EQUAL(ORDL1)
     C     KlantNr       READE     ORDL1
     C                   DOW       NOT %EOF(ORDL1)
      * ... verwerk order ...
     C     KlantNr       READE     ORDL1
     C                   ENDDO
     C                   ENDIF
```

> Tip: `SETLL` leest **niets** en zet geen lock — ideaal voor een snelle "bestaat deze key?"-check via `%EQUAL`.

### SETGT + READP / READPE (achterwaarts)

**Free-format**

```rpgle
setgt KlantNr ORDL1;
readpe KlantNr ORDL1;
if not %eof(ORDL1);
  // laatste order van deze klant
endif;

setgt *hival ORDL1;        // naar einde bestand
readp ORDL1;               // laatste record
```

**Fixed-format**

```rpgle
     C     KlantNr       SETGT     ORDL1
     C     KlantNr       READPE    ORDL1
     C                   IF        NOT %EOF(ORDL1)
      * laatste order van deze klant
     C                   ENDIF
      *
     C     *HIVAL        SETGT     ORDL1
     C                   READP     ORDL1
```

### READ (sequentieel)

**Free-format**

```rpgle
read ORDL1;
dow not %eof(ORDL1);
  // ... verwerk record ...
  read ORDL1;
enddo;
```

**Fixed-format**

```rpgle
     C                   READ      ORDL1
     C                   DOW       NOT %EOF(ORDL1)
      * ... verwerk record ...
     C                   READ      ORDL1
     C                   ENDDO
```

### WRITE

**Free-format**

```rpgle
KLNR   = 1001;
KLNAAM = 'Jansen BV';
write(e) CUSTR;
if %error and %status(CUSTL2) = 1021;
  // duplicate key
endif;

write CUSTR Klant;          // of: vanuit een DS (likerec(CUSTR:*output) of *all)
```

**Fixed-format**

```rpgle
     C                   EVAL      KLNR   = 1001
     C                   EVAL      KLNAAM = 'Jansen BV'
     C                   WRITE(E)  CUSTR
     C                   IF        %ERROR AND %STATUS(CUSTL2) = 1021
      * duplicate key
     C                   ENDIF
```

> Bij een extern beschreven bestand moet `WRITE`/`UPDATE` het **recordformaat** krijgen (`CUSTR`), niet de bestandsnaam.

### UPDATE

**Free-format**

```rpgle
chain CustNr CUSTL2;
if %found(CUSTL2);
  KLNAAM = 'Nieuwe naam';
  update CUSTR;
  // of alleen specifieke velden (alleen free-format):
  update CUSTR %fields(KLNAAM : KLPLAATS);
endif;
```

**Fixed-format**

```rpgle
     C     CustNr        CHAIN     CUSTL2
     C                   IF        %FOUND(CUSTL2)
     C                   EVAL      KLNAAM = 'Nieuwe naam'
     C                   UPDATE    CUSTR
     C                   ENDIF
```

### DELETE

**Free-format**

```rpgle
delete CustNr CUSTR;       // a) via key
if not %found(CUSTL2);
endif;

delete CUSTR;              // b) laatst gelezen record
```

**Fixed-format**

```rpgle
      * a) via key (geen voorafgaande read nodig)
     C     CustNr        DELETE    CUSTR
     C                   IF        NOT %FOUND(CUSTL2)
     C                   ENDIF
      * b) laatst gelezen record
     C                   DELETE    CUSTR
```

### OPEN / CLOSE

**Free-format**

```rpgle
if not %open(ORDL1);
  open ORDL1;
endif;
// ...
close ORDL1;
close *all;
```

**Fixed-format**

```rpgle
     C                   IF        NOT %OPEN(ORDL1)
     C                   OPEN      ORDL1
     C                   ENDIF
      * ...
     C                   CLOSE     ORDL1
     C                   CLOSE     *ALL
```

### UNLOCK, FEOD, COMMIT, ROLBK

**Free-format**

```rpgle
unlock CUSTL2;
feod LOGPF;
commit;
rolbk;
```

**Fixed-format**

```rpgle
     C                   UNLOCK    CUSTL2
     C                   FEOD      LOGPF
     C                   COMMIT
     C                   ROLBK
```

### Werkstation: EXFMT en READC (subfile)

**Free-format**

```rpgle
exfmt SCHERM1;

readc SFL01;
dow not %eof(DSPF);
  // ... verwerk gewijzigde subfile-regel ...
  readc SFL01;
enddo;
```

**Fixed-format**

```rpgle
     C                   EXFMT     SCHERM1
      *
     C                   READC     SFL01
     C                   DOW       NOT %EOF(DSPF)
      * ... verwerk gewijzigde subfile-regel ...
     C                   READC     SFL01
     C                   ENDDO
```

---

## 0.1.3. BIF's — statuschecks na I/O

| BIF | Wat het checkt | Gezet door | Retourtype | Free | Fixed (extended factor 2) |
|---|---|---|---|---|---|
| `%FOUND{(file)}` | Record gevonden? (`SETLL`: bestaat er een key ≥; `SETGT`: bestaat er een key >) | `CHAIN`, `DELETE`, `SETLL`, `SETGT` (+ string-ops `CHECK`, `CHECKR`, `SCAN`, `LOOKUP`) | Indicator | `if %found(CUSTL2);` | `C   IF   %FOUND(CUSTL2)` |
| `%EOF{(file)}` | Einde (of begin) bestand / geen key-match meer | `READ`, `READC`, `READE`, `READP`, `READPE`, `WRITE` (subfile vol) | Indicator | `dow not %eof(ORDL1);` | `C   DOW  NOT %EOF(ORDL1)` |
| `%EQUAL{(file)}` | Exacte key-match na positioneren | **Alleen `SETLL`** (+ `LOOKUP`) — **niet** `SETGT` | Indicator | `if %equal(ORDL1);` | `C   IF   %EQUAL(ORDL1)` |
| `%ERROR` | Fout bij laatste operatie mét `(E)` | Elke operatie met `(E)` | Indicator | `if %error;` | `C   IF   %ERROR` |
| `%STATUS{(file)}` | Statuscode (zie 0.1.4) | Elke operatie; vooral i.c.m. `(E)` | Numeriek | `if %status(CUSTL2) = 1218;` | `C   IF   %STATUS(CUSTL2) = 1218` |
| `%OPEN(file)` | Is het bestand open? | — (altijd opvraagbaar) | Indicator | `if not %open(ORDL1);` | `C   IF   NOT %OPEN(ORDL1)` |
| `%KDS(ds {: n})` | Zoekwaarden uit een DS (evt. eerste *n* keyvelden) | Gebruik als search-arg | — | `chain %kds(k) ORDL1;` | **n.v.t.** → gebruik `KLIST` |
| `%FIELDS(v1 : …)` | Alleen deze velden updaten | Gebruik bij `UPDATE` | — | `update CUSTR %fields(KLNAAM);` | **n.v.t.** |

**Zonder parameter** slaan `%FOUND`, `%EOF`, `%EQUAL` en `%STATUS` op de *laatste* operatie (van welk bestand dan ook). Geef bij meerdere bestanden altijd de bestandsnaam mee.

**Correcties t.o.v. de vorige versie van deze cheatsheet:**

| Stond er | Klopt niet, want | Gebruik in plaats daarvan |
|---|---|---|
| `%LOCKED(file)` | Deze BIF **bestaat niet** in RPG. | `chain(e)` + `%status(file) = 1218`, of `MONITOR` + `ON-ERROR 1218`. |
| `%RRN(file)` | Deze BIF **bestaat niet** in RPG (wel `RRN()` in SQL). | RRN uit de **INFDS** (pos. 397-400), of het `RECNO`-keyword. Zie 0.1.1. |
| `%TLOOKUP` "geen tabel-lookup" | `%TLOOKUPxx` **is** juist de tabel-lookup (TAB-tabellen); `%LOOKUPxx` zoekt in een array. Beide zijn geen I/O. | — |
| `%EQUAL` na `SETGT` | `SETGT` zet alleen `%FOUND`. | `%EQUAL` alleen na `SETLL`. |
| `%ERROR(file)` / file-specifiek | `%ERROR` heeft **geen** parameter. | `%error` + `%status(file)`. |
| `ROLLBACK` | De opcode heet `ROLBK`. | `rolbk;` |
| "Sequentieel lezen op RRN" als aparte operatie | Dat is gewoon `READ` op een niet-keyed bestand (arrival sequence). | `READ` |

**Vuistregels:**
- `%FOUND` hoort bij random access (`CHAIN`/`SETLL`/`SETGT`/`DELETE`), `%EOF` bij sequentieel lezen (`READ`-familie). Door elkaar halen = meest voorkomende bug.
- `%ERROR` wordt alleen gezet met de `(E)`-extender. Zonder `(E)` (en zonder `MONITOR`-blok eromheen) stopt het programma met een inquiry-bericht (RNQxxxx).
- `%STATUS` vertelt *waarom*; gebruik het ná `%ERROR`, niet ervoor in de plaats.

---

## 0.1.4. Belangrijkste file-statuscodes (`%STATUS`)

| Code | Betekenis |
|---|---|
| 00000 | Geen fout |
| 00011 | End of file bij een read |
| 00012 | Geen record gevonden bij `CHAIN`/`SETLL`/`SETGT` |
| 00013 | Subfile vol bij `WRITE` |
| 01021 | Duplicate key / bestaand record bij `WRITE` |
| 01022 | Referential constraint-fout |
| 01023 | Fout in trigger-programma (vóór de operatie) |
| 01211 | I/O op een gesloten bestand |
| 01215 | `OPEN` op een bestand dat al open is |
| 01218 | Record al gelockt |
| 01221 | `UPDATE` zonder voorafgaande read |
| 01222 | Record kan niet gealloceerd worden (referential constraint) |
| 01299 | Overige I/O-fout |

---

## 0.1.5. Foutafhandeling: `(E)`, `MONITOR`/`ON-ERROR` en (nieuw) `ON-EXCP`

**Optie A — `(E)` + `%ERROR`/`%STATUS`** (lokaal, per operatie)

**Free-format**

```rpgle
chain(e) CustNr CUSTL2;
select;
  when %error;
    Fout = %status(CUSTL2);
  when not %found(CUSTL2);
    // niet gevonden
endsl;
```

**Fixed-format**

```rpgle
     C     CustNr        CHAIN(E)  CUSTL2
     C                   SELECT
     C                   WHEN      %ERROR
     C                   EVAL      Fout = %STATUS(CUSTL2)
     C                   WHEN      NOT %FOUND(CUSTL2)
      * niet gevonden
     C                   ENDSL
```

**Optie B — `MONITOR` met `ON-EXCP` (bericht-ID) en `ON-ERROR` (statuscode)**

`ON-EXCP` is nieuw sinds **IBM i 7.5 en 7.4 TR6**. Het vangt een fout op basis van het **bericht-ID** (zoals `MONMSG` in CL). Regels: `ON-EXCP`-blokken moeten vóór de `ON-ERROR`-blokken staan, en bereiken zoals `RNX1200` (zoals bij `MONMSG`) worden niet ondersteund. Extender `(C)` = alleen fouten uit de huidige procedure afvangen.

**Free-format**

```rpgle
monitor;
  chain CustNr CUSTL2;
  update CUSTR;
on-excp 'RNX1218';         // record locked (bericht-ID)
on-excp(c) 'RNX1211';      // alleen als de fout in déze procedure ontstond
on-error 1218;             // record locked (statuscode)
on-error;                  // al het andere
endmon;
```

**Fixed-format**

```rpgle
     C                   MONITOR
     C     CustNr        CHAIN     CUSTL2
     C                   UPDATE    CUSTR
     C                   ON-EXCP   'RNX1218'
      * record locked (bericht-ID)
     C                   ON-ERROR  1218
      * record locked (statuscode)
     C                   ON-ERROR
      * al het andere
     C                   ENDMON
```

> `ON-EXCP` staat in IBM's tabel met fixed-format opcodes (message-ID's in extended factor 2) — het werkt dus in beide notaties.

---

## 0.1.6. Berichten versturen: `SND-MSG`, `%MSG`, `%TARGET` (nieuw)

`SND-MSG` stuurt een bericht naar de joblog/call stack zonder dat je zelf de API `QMHSNDPM` hoeft aan te roepen. Beschikbaar sinds **IBM i 7.5 en 7.4 TR6**.

**Let op: `SND-MSG` is alleen free-format.** Hij staat niet in IBM's tabel met fixed-format opcodes. In fixed-format gebruik je de API `QMHSNDPM` via `CALLP` (zie onder).

**Syntax**

```rpgle
SND-MSG{(E)} { *INFO | *ESCAPE | *COMP | *DIAG | *NOTIFY | *STATUS }
             message-text | %MSG(msgid : msgf {: replacement-data})
             { %TARGET(...) };
```

| Onderdeel | Uitleg |
|---|---|
| Type | Default `*INFO`. `*ESCAPE` veroorzaakt een exception bij de ontvanger. `*COMP`, `*DIAG`, `*NOTIFY`, `*STATUS` zijn toegevoegd via PTF's in 2024. |
| Tekst | Character-expressie. Een `*ESCAPE` met platte tekst gaat als `CPF9898` uit `QCPFMSG`. |
| `%MSG(id : msgf {: data})` | Bericht uit een message file, optioneel met replacement data. Alleen bruikbaar in `SND-MSG`. |
| `%TARGET(...)` | Ontvanger op de call stack. Altijd als laatste. Default: `*SELF` voor `*INFO`, `*CALLER` voor `*ESCAPE`. |
| `%TARGET`-waarden | `*SELF`, `*CALLER`, `programma-of-procedure {: offset}`; nieuw sinds 2024: `*CTLBDY`, `*PGMBDY {: offset}`, `*EXT` (externe queue, bv. statusregel). |
| `(E)` | Vangt status **00126** af = bericht kon niet worden verstuurd (bv. message file bestaat niet). |

**Free-format voorbeelden**

```rpgle
snd-msg 'Verwerking gestart';                              // *INFO naar *SELF
snd-msg *info %msg('MSG0001' : 'MIJNMSGF' : KlantNr);      // uit message file
snd-msg *escape 'Bestand ' + Bestand + ' niet gevonden';   // naar *CALLER → exception
snd-msg *status %char(Aantal) + ' records verwerkt' %target(*ext);  // statusregel
snd-msg *comp 'Klaar' %target(*pgmbdy : 1);                // naar aanroeper van het programma

snd-msg(e) %msg('XYZ0001' : 'BESTAATNIET');
if %error;            // %status = 00126
endif;
```

> Voor de opties `*COMP`, `*DIAG`, `*NOTIFY`, `*STATUS`, `*CTLBDY`, `*PGMBDY`, `*EXT` zijn compiler-PTF's nodig (o.a. SJ01351 voor 7.5 en SJ01353 voor 7.4) plus de bijbehorende runtime-PTF.

**Fixed-format alternatief: `QMHSNDPM` via `CALLP`**

Werkt op elke release, ook vóór 7.4 TR6.

```rpgle
     DSndPgmMsg        PR                  ExtPgm('QMHSNDPM')
     D MsgId                          7A   Const
     D MsgFile                       20A   Const
     D MsgData                    32767A   Const Options(*VarSize)
     D MsgDtaLen                     10I 0 Const
     D MsgType                       10A   Const
     D CallStkEnt                    10A   Const
     D CallStkCnt                    10I 0 Const
     D MsgKey                         4A
     D ErrorCode                      8A
      *
     DApiErr           S              8A   Inz(*ALLx'00')
     DMsgKey           S              4A
     DMsgTxt           S             80A   Varying
      *
     C                   EVAL      MsgTxt = 'Verwerking klaar'
     C                   CALLP     SndPgmMsg('CPF9898' : 'QCPFMSG   *LIBL' :
     C                             MsgTxt : %LEN(MsgTxt) :
     C                             '*INFO' : '*' : 0 :
     C                             MsgKey : ApiErr)
      * *ESCAPE naar de aanroeper: MsgType = '*ESCAPE', CallStkCnt = 1
```

**Free-format variant van dezelfde API-aanroep** (voor oudere releases zonder `SND-MSG`):

```rpgle
dcl-pr SndPgmMsg extpgm('QMHSNDPM');
  MsgId      char(7)     const;
  MsgFile    char(20)    const;
  MsgData    char(32767) const options(*varsize);
  MsgDtaLen  int(10)     const;
  MsgType    char(10)    const;
  CallStkEnt char(10)    const;
  CallStkCnt int(10)     const;
  MsgKey     char(4);
  ErrorCode  char(8);
end-pr;

dcl-s ApiErr char(8) inz(*allx'00');   // bytes provided = 0 → fouten worden exceptions
dcl-s MsgKey char(4);
dcl-s MsgTxt varchar(80) inz('Verwerking klaar');

SndPgmMsg('CPF9898' : 'QCPFMSG   *LIBL' : MsgTxt : %len(MsgTxt)
         : '*INFO' : '*' : 0 : MsgKey : ApiErr);
```

**Welke optie kiezen?**

| Optie | Voordeel | Nadeel |
|---|---|---|
| `SND-MSG` | Kort, leesbaar, geen prototype nodig | Alleen free-format; vanaf 7.4 TR6 / 7.5 (+ PTF's voor de extra opties) |
| `QMHSNDPM` via `CALLP` | Werkt overal, ook fixed-format en oude releases; alle API-opties | Veel code; prototype en error-DS zelf beheren |
| `DSPLY` | Supersimpel voor debuggen | Geen echte berichtafhandeling (geen berichttype of ontvanger kiezen) |

---

## 0.1.7. Wat is "nieuw" t.o.v. oud (RPG III / fixed RPG IV)?

| Oud | Nieuw | Notatie |
|---|---|---|
| Resultaat-indicatoren (kol. 71-76) | `%FOUND`, `%EOF`, `%EQUAL`, `%ERROR` | Beide (BIF's in extended factor 2) |
| `KLIST`/`KFLD` | Key-lijst `(a : b)` of `%KDS(ds)` | Alleen free |
| Velden in globale buffer | Result-DS met `LIKEREC` (`chain k file ds;`) | Beide |
| `UPDATE` van hele record | `UPDATE rec %FIELDS(...)` | Alleen free |
| F-spec | `DCL-F` | Free |
| `*PSSR`/`INFSR`, error-indicator | `MONITOR` / `ON-ERROR` / **`ON-EXCP`** (7.4 TR6 / 7.5) | Beide |
| API `QMHSNDPM` | **`SND-MSG`** + `%MSG` + `%TARGET` (7.4 TR6 / 7.5) | Alleen free |
| Native I/O | Embedded SQL (`EXEC SQL`) — vaak de aanbevolen richting voor nieuwe set-based code | Beide |

---

## Bronnen

- IBM — [Operation Codes (7.5)](https://www.ibm.com/docs/ssw_ibm_i_75/rzasd/opcode.htm) (free- vs. fixed-tabel; SND-MSG ontbreekt in fixed, ON-EXCP staat erin)
- IBM — [Built-in Functions (7.4)](https://www.ibm.com/docs/en/ssw_ibm_i_74/rzasd/bifs.htm) (volledige BIF-lijst: geen `%LOCKED`, geen `%RRN`)
- IBM — [CHAIN (Random Retrieval from a File)](https://www.ibm.com/docs/en/ssw_ibm_i_72/rzasd/zzchain.htm)
- IBM — [%KDS (Search Arguments in Data Structure)](https://www.ibm.com/docs/en/ssw_ibm_i_74/rzasd/bbkds.htm)
- IBM — [File Status Codes](https://www.ibm.com/support/knowledgecenter/en/ssw_ibm_i_72/rzasd/stacod9.htm)
- IBM — [SND-MSG (Send a Message to the Joblog)](https://www.ibm.com/support/knowledgecenter/en/ssw_ibm_i_73/rzasd/zzsndmsg.htm)
- IBM — [%MSG](https://www.ibm.com/docs/en/ssw_ibm_i_73/rzasd/bbmsg.htm)
- IBM — [RPG Cafe Spring 2024: More options for SND-MSG](https://www.ibm.com/support/pages/rpg-cafe-spring-2024-more-options-snd-msg)
- IBM — [What's New since 7.6?](https://www.ibm.com/docs/en/ssw_ibm_i_76/rzasl/rpgrelv7r6post.htm)
- RPGPGM — [New RPG op code to send messages to job](https://rpgpgm.com/2022/06/new-rpg-op-code-to-send-messages-to-job.html)
- RPGPGM — [New way in RPG to monitor for errors (ON-EXCP)](https://www.rpgpgm.com/2022/05/new-way-in-rpg-to-monitor-for-errors.html)
- RPGPGM — [Using relative record number with data](https://www.rpgpgm.com/2015/11/using-relative-record-number-with-data.html)
- Nick Litten — [Which %BIF for Chain, Read and other native file IO](https://www.nicklitten.com/bif-chain-read-naughty-native-file-io/)
