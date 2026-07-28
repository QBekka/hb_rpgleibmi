# RPGLE File Specifications (F-Specs) — Een Praktische Gids

*Geschreven voor junior RPGLE-developers. Gemaakt via Claude, door Reinald*

---

## 0. Cheatsheet (snel opzoeken)

**File type (fixed kolom 17 / free `USAGE`)**

| Fixed | Free (`USAGE`) | Betekenis |
|---|---|---|
| `I` | `*INPUT` | Alleen lezen |
| `O` | `*OUTPUT` | Alleen schrijven |
| `U` | `*UPDATE` | Lezen, wijzigen, verwijderen |
| `C` | `*INPUT:*OUTPUT` | Combined — lezen én schrijven op hetzelfde file |

**File designation (fixed kolom 18) — legacy cycle**

| Designation | Betekenis |
|---|---|
| `P` | Primary file — stuurt de oude RPG cycle aan |
| `S` | Secondary file — ook cycle-gedreven |
| `R` | Record address file |
| blank | **Full procedural** — jij regelt zelf de I/O met opcodes |

Free-format ondersteunt de cycle helemaal niet — daar is elk file altijd full procedural.

**Device — belangrijkste keyword per type**

| Device | Fixed keyword | Free keyword |
|---|---|---|
| Database (externally described) | `DISK` | `Disk(*Ext)` |
| Database (program described) | `DISK` + recordlengte | `Disk(n)` |
| Printer | `PRINTER` | `Printer(*Ext)` |
| Display file / subfile | `WORKSTN` | `Workstn` |
| Special (eigen I/O-handler) | `SPECIAL` | `Special` |

**Meest gebruikte keywords (alle file types)**

| Keyword | Doel |
|---|---|
| `KEYED` / `K` | Toegang via key i.p.v. relative record number |
| `EXTFILE(naam)` | Override het werkelijke file-object |
| `EXTMBR(naam)` | Override de member |
| `PREFIX(pfx:)` | Prefix voor alle fields — voorkomt naamconflicten tussen files |
| `RENAME(oud:nieuw)` | Record format hernoemen |
| `IGNORE(fmt)` / `INCLUDE(fmt)` | Bepaalde record formats uitsluiten/insluiten bij een multi-format logical |
| `INFDS(ds)` | Data structure met file-status en foutinfo |
| `INFSR(subr)` | Automatische error-handling subroutine |
| `INDDS(ds)` | Genoemde indicators i.p.v. kale `*IN41` etc. |
| `SFILE(fmt:rrn)` | Koppelt een subfile record format aan een RRN-field |
| `OFLIND(*INOF)` | Overflow-indicator voor printer files |
| `FORMLEN(n)` | Paginalengte override voor printer files |
| `USROPN` | Zelf OPEN/CLOSE regelen i.p.v. automatisch |
| `COMMIT` | File meedoen in commitment control |
| `BLOCK(*YES/*NO)` | Record blocking aan/uit voor performance |

**Regel #1 voor nieuwe code:** altijd `**FREE`, altijd externally described, nooit de cycle (`P`/`S`).

---

## 1. Wat een F-spec doet

Een F-spec (File specification) vertelt de compiler: *"hier is een file, zo ga ik hem gebruiken, en dit is het device/access method erachter."* Meer is het niet — alle keywords daaromheen zijn fine-tuning van dat gedrag.

In fixed-format zijn F-specs regels die beginnen met `F` in kolom 6. In free-format zijn het `Dcl-F` statements. Zelfde functie, ander jasje.

---

## 2. Fixed-format anatomie (de klassieke layout)

Fixed-format F-specs bestaan uit velden op vaste posities. Van links naar rechts, ruwweg:

| Veld | Wat het regelt |
|---|---|
| Form type | Letterlijk `F` — markeert dit als een file spec |
| File name | Max 10 tekens, moet matchen met de DDS file name (of je `EXTFILE`-override) |
| File type | `I` (input), `O` (output), `U` (update), `C` (combined) |
| File designation | `P` (primary), `S` (secondary), `R` (record address), blank (full procedural) |
| End of file | `E` — bij cycle-gedreven primary/secondary files |
| Additional files | `A` — bij cycle-gedreven programma's |
| Sequence | `A`/`D` — ascending/descending key processing |
| File format | `E` (externally described — DDS/SQL bepaalt de fields) of `F` (program described — jij definieert de fields zelf) |
| Record length | Alleen nodig bij program described files |
| Keyed indicator | `K`-vlag — vertelt de compiler dat dit file via key wordt benaderd, niet alleen via relative record number |
| Device | `DISK`, `PRINTER`, `WORKSTN`, `SPECIAL`, `SEQ` |
| Keywords | Continuation-gebied — `KEYWORD(value)`-paren, kunnen doorlopen op continuation lines |

Die keyed-vlag en het device staan verderop op de regel, en keywords vullen de rest van de ruimte tot kolom 80 (met continuation lines als het niet past). Hieronder concrete voorbeelden in plaats van een kolom-liniaal — in de praktijk telt niemand meer kolommen, dat doet RDi's LPEX editor (of SEU's F4-prompt) voor je.

---

## 3. Free-format anatomie: `Dcl-F`

```rpgle
Dcl-F filename [device] [keyword(value) keyword(value) ...] ;
```

Dat is de hele vorm. Geen kolommen om rekening mee te houden — vrije tekst, afgesloten met een puntkomma, en je mag het uitspreiden over meerdere regels voor leesbaarheid.

```rpgle
Dcl-F CustMast Usage(*Update) Keyed;
```

`USAGE` vervangt de fixed-format file-type letter (zie cheatsheet). `KEYED` vervangt de fixed-format `K`-vlag.

---

## 4. DISK files — externally described (de 95%-situatie)

Dit is je dagelijkse kost: physical files en logical files, beschreven via DDS of SQL (in beide gevallen "externally described" — de field layout leeft in het database-object, niet hardcoded in je programma).

### Fixed-format

```rpgle
     FCustMast  IF   E           K           DISK
     FOrderHdr  UF A E           K           DISK
     FAuditLog  O    E             DISK
```

- `CustMast`: input, externally described, keyed, disk — een simpel lookup-file.
- `OrderHdr`: update, keyed, disk — je doet `CHAIN`, `UPDATE` en `DELETE` op dit file.
- `AuditLog`: alleen output, arrival sequence (geen `K`) — je schrijft alleen nieuwe rows.

### Free-format

```rpgle
**FREE
Dcl-F CustMast Disk(*Ext) Keyed Usage(*Input) Prefix('CM_')
             Infds(custMastInfo) Infsr(custMastErr);

Dcl-F OrderHdr Disk(*Ext) Keyed Usage(*Update);

Dcl-F AuditLog Disk(*Ext) Usage(*Output);
```

Opmerking: `Disk(*Ext)` is de moderne schrijfwijze voor "device = DISK, externally described." In ouder free-format code zie je ook gewoon `Disk` zonder parameter — beide werken, `*Ext` is puur expliciet over de description source.

---

## 5. DISK files — program described (geen DDS/SQL field-definities)

Zeldzaam vandaag de dag, maar je komt het tegen bij het onderhouden van oude code, of bij flat/legacy files waarvan de layout nooit extern beschreven is.

### Fixed-format

```rpgle
     FOldFile   IF   F  200        DISK
```

- `F` op de format-positie (in plaats van `E`) betekent "program described" — jij definieert de record layout zelf, historisch via een **I-spec**, of in modern fixed-format RPG IV via een `D`-spec-gebaseerde data structure over de record heen.
- `200` is de recordlengte — verplicht bij program described files, want er is geen externe bron om die uit af te leiden.

### Free-format

```rpgle
**FREE
Dcl-F OldFile Disk(200) Usage(*Input);

Dcl-Ds OldFileRec Len(200);
  CustNo    Zoned(6:0) Pos(1);
  CustName  Char(30)   Pos(7);
End-Ds;
```

Je legt vervolgens zelf een data structure over de record buffer. Dit is aantoonbaar meer werk dan externally described files — precies waarom bijna niemand nieuwe files nog zo ontwerpt. Begin je opnieuw, definieer je file dan via DDS of SQL DDL en laat de compiler de field-definities voor je bouwen.

---

## 6. PRINTER files

Voor spooled output — rapporten, facturen, alles wat richting een printer of output queue gaat.

### Fixed-format

```rpgle
     FQSYSPRT   O    E             PRINTER OFLIND(*INOF)
```

- `O`, externally described (print format gedefinieerd in DDS), device `PRINTER`.
- `OFLIND(*INOF)` — de klassieke "overflow indicator." Zodra de pagina de overflow-regel bereikt (ingesteld in DDS), gaat deze indicator aan, zodat je weet dat je headings op een nieuwe pagina moet printen. `*INOF` gebruikt de ingebouwde overflow-indicator in plaats van dat je een los indicator-nummer moet noemen zoals `*IN99` (nog steeds ondersteund voor backward compatibility, maar `*INOF` is schoner).

Andere veelgebruikte printer-keywords:

| Keyword | Doel |
|---|---|
| `FORMLEN(n)` | Override paginalengte (regels per pagina) |
| `FORMOF(n)` | Regelnummer waarop overflow triggert |
| `PRTCTL(ds)` | Print control data structure voor dynamische spacing/skipping |
| `USRRNM` | Runtime hernoeming |

### Free-format

```rpgle
**FREE
Dcl-F QSYSPRT Printer(*Ext) Oflind(*inof) Usage(*Output);
```

---

## 7. WORKSTN files (display files & subfiles)

Interactieve 5250-schermen. Hier kom je ook **subfiles** tegen — scrollbare lijsten op het scherm — die de `SFILE`-keyword nodig hebben.

### Fixed-format

```rpgle
     FCustDsp   CF   E             WORKSTN
     F                                       SFILE(SFL01:RRN01)
     F                                       INDDS(dspInd)
```

- `C` (combined) — display files zijn vrijwel altijd combined, want je schrijft het scherm weg en leest de reactie van de operator weer terug.
- `SFILE(SFL01:RRN01)` — declareert `SFL01` als subfile record format, met `RRN01` als het relative record number field dat bepaalt welke subfile-rij je leest/schrijft.
- `INDDS` — een indicator data structure, die named booleans koppelt aan de DDS-indicatorposities, zodat je niet hoeft te onthouden dat `*IN41` "record locked" betekent.

### Free-format

```rpgle
**FREE
Dcl-F CustDsp Workstn Sfile(Sfl01:Rrn01) Indds(dspInd);
```

Praktische tip voor junioren: koppel elk subfile/display file aan een `INDDS` met named indicators (`Dcl-Ds dspInd Qualified;` met fields zoals `SflDspCtl`, `SflClr`, etc.) in plaats van kale `*IN41`-achtige indicatornummers. Toekomstige-jij (en wie ook jouw code erft) is je dankbaar.

---

## 8. SPECIAL files

`SPECIAL` device files geven de I/O uit handen aan een programma dat jij schrijft, in plaats van dat het OS een database of device rechtstreeks beheert. Dit gebruik je wanneer je met iets non-standaards praat dat niet als een normaal IBM i file-object gemodelleerd is.

```rpgle
     FCustomIo  IP   F  256        SPECIAL
```

```rpgle
**FREE
Dcl-F CustomIo Special Usage(*Input);
```

Eerlijk gezegd — dit is in moderne shops zeldzaam genoeg (de meeste "praat met iets vreemds"-problemen worden nu opgelost met APIs, IFS stream files, sockets, of SQL) dat je bij daadwerkelijk gebruik beter de exacte handler-koppeling in IBM's *RPG Language Reference* kunt opzoeken. Hier vermeld voor de volledigheid, niet om uit het hoofd te leren.

---

## 9. Legacy/historische file types (weet dat ze bestaan, ontwerp er geen nieuwe)

### TABLE files
RPG II/III-constructie voor het laden van arrays uit een file bij programmastart (organization `T` in fixed-format). Allang obsolete — het moderne equivalent is gewoon een array declareren (`Dcl-S myArray Char(10) Dim(50)`) en die vullen via SQL, `%LOOKUP`, of een compile-time array, wat het beste past.

### SEQ (sequential) device files
Historisch gebruikt voor tape- en diskette-I/O, vooral in shops met een System/36-verleden. Op een moderne IBM i die databasewerk doet, zie je dit vrijwel nooit meer — `DISK` met sequential (non-keyed) access dekt die behoefte vandaag de dag.

Beide vermeld ik vooral zodat je, als je ze tegenkomt in een programma uit 1998 waar niemand meer aan zit, herkent waar je naar kijkt in plaats van in paniek te raken.

---

## 10. Zij-aan-zij: een klein echt programma

Fixed-format:

```rpgle
     FCustMast  IF   E           K           DISK
     FOrderHdr  IF   E           K           DISK
     FQSYSPRT   O    E             PRINTER OFLIND(*INOF)

     C                   READ      CustMast
     C                   DOW       NOT %EOF(CustMast)
     C                   CHAIN     CustNo        OrderHdr
     C                   IF        %FOUND(OrderHdr)
     C                   EXCEPT    DetailLine
     C                   ENDIF
     C                   READ      CustMast
     C                   ENDDO
     C                   EVAL      *INLR = *ON
```

Free-format equivalent:

```rpgle
**FREE
Dcl-F CustMast Disk(*Ext) Keyed Usage(*Input);
Dcl-F OrderHdr Disk(*Ext) Keyed Usage(*Input);
Dcl-F QSYSPRT  Printer(*Ext) Oflind(*inof) Usage(*Output);

Read CustMast;
DoW Not %Eof(CustMast);
  Chain CustNo OrderHdr;
  If %Found(OrderHdr);
    Write DetailLine;
  EndIf;
  Read CustMast;
EndDo;

*InLr = *On;
Return;
```

Zelfde logica, zelfde keywords, aanzienlijk leesbaarder.

---

## 11. Praktisch advies voor junioren

- **Schrijf nieuwe code altijd in `**FREE`.** Er is vandaag geen functionele reden meer om fixed-format F-specs met de hand te schrijven, behalve wanneer je een bestaand fixed-format programma bewerkt (en zelfs dan is het overwegen waard om de hele source member te converteren).
- **Externally described, altijd, tenzij je een specifieke legacy-reden hebt om dat niet te doen.** Program described files leggen het onderhoud van de field-layout bij elk programma dat het file aanraakt — een onderhoudsval.
- **Vermijd de cycle (P/S designation) volledig.** Full procedural, expliciete I/O, altijd.
- **Gebruik `INFDS`/`INFSR` op files die kunnen falen** (lock conflicts, I/O errors) in plaats van het programma te laten crashen op een onafgehandelde file exception.
- **Gebruik `INDDS` op display files** in plaats van kale genummerde indicators.
- Houd `PREFIX` of `RENAME` achter de hand voor de dag dat twee files die je tegelijk open moet hebben toevallig field names delen — dat gebeurt.

---
