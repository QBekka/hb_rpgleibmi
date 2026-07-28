# Service Programs, Binding Directories & Activation Groups — Een Praktische Gids

*Geschreven voor junior RPGLE-developers. Vervolg op de gidsen over F-specs en procedures — dit stuk gaat over wat er gebeurt ná het schrijven van je `Export`-procedure: hoe je hem daadwerkelijk deelt tussen programma's. Gemaakt door Claude ai, door Reinald Jansen*

---

## 0. Cheatsheet (snel opzoeken)

**De object-types**

| Object | Type | Wat het is |
|---|---|---|
| Module | `*MODULE` | Het resultaat van het compileren van RPG-source. Geen los draaibaar object — puur een bouwsteen. |
| Service program | `*SRVPGM` | Eén of meer modules gebonden tot een herbruikbare, aanroepbare eenheid met een publieke interface (exported procedures). |
| Programma | `*PGM` | Het daadwerkelijk aanroepbare object — gebonden uit modules en/of service programs. |
| Binding directory | `*BNDDIR` | Een naslaglijst van modules/service programs, zodat je ze niet steeds los hoeft op te noemen bij het binden. |

**Belangrijkste commando's**

| Commando | Doel |
|---|---|
| `CRTRPGMOD` | Compileert source naar een `*MODULE` |
| `CRTSRVPGM` | Bindt module(s) + binder source tot een `*SRVPGM` |
| `CRTPGM` | Bindt module(s)/service program(s) tot een `*PGM` |
| `CRTBNDRPG` | Compileert én bindt in één stap tot een `*PGM` (handig voor kleinere programma's) |
| `CRTBNDDIR` | Maakt een lege binding directory aan |
| `ADDBNDDIRE` | Voegt een entry (module of service program) toe aan een binding directory |
| `WRKBNDDIRE` | Toont/bewerkt de entries in een binding directory |
| `DSPSRVPGM` | Toont info over een service program: exports, signature, activation group |
| `DSPPGM` | Toont info over een programma: gebonden modules, service programs, activation group |

**Activation group-opties**

| Optie | Gedrag |
|---|---|
| `*NEW` | Elke keer dat het programma geactiveerd wordt, krijgt het een eigen, geïsoleerde activation group. |
| Named (`ORDERAPP`, etc.) | Alle programma's die dezelfde naam opgeven, delen één activation group binnen de job. |
| `*CALLER` | Het programma activeert in de activation group van wie het aanroept — geen eigen group. Default voor service programs. |
| `*DFTACTGRP` | De default activation group van de job — legacy-gedrag, vergelijkbaar met OPM. Vermijd dit voor nieuwe ILE-code, tenzij je een specifieke compatibiliteitsreden hebt. |

**Regel #1:** service programs draaien meestal in `*CALLER` (geen eigen activation group nodig), toepassingsprogramma's krijgen een eigen named activation group, en `*DFTACTGRP` is voor legacy-compatibiliteit — niet voor nieuw werk.

---

## 1. De bouwstenen: van source naar aanroepbaar object

Op IBM i ga je in stappen van broncode naar iets aanroepbaars:

```
RPG-source  →  *MODULE  →  *SRVPGM  →  *PGM
              (compileren)  (binden +      (binden)
                            binder source)
```

- **`*MODULE`**: het resultaat van `CRTRPGMOD` (of impliciet, als onderdeel van `CRTBNDRPG`). Dit object bevat gecompileerde code, maar is zelf niet aanroepbaar vanaf een command line of `CALL` — het is een bouwsteen.
- **`*SRVPGM`**: één of meer modules gebonden tot een herbruikbare eenheid, mét een gedefinieerde publieke interface (welke procedures mag de buitenwereld aanroepen). Dit is waar `Export` (zie de procedures-gids) daadwerkelijk relevant wordt.
- **`*PGM`**: het uiteindelijke, aanroepbare object. Gebonden uit een of meer modules, en optioneel uit een of meer service programs.

Voor kleine, op zichzelf staande programma's compileer je vaak direct met `CRTBNDRPG` — dat compileert en bindt in één stap, zonder dat je zelf met losse modules hoeft te schuiven. Zodra je herbruikbare logica tussen meerdere programma's wilt delen, kom je bij service programs terecht.

---

## 2. Service programs: gedeelde logica, één plek

Stel: je hebt een `GetCustName`- en een `UpdateBalance`-procedure die je vanuit tien verschillende programma's wilt aanroepen. Zonder service programs zou je die logica in elk programma moeten dupliceren (of in elk programma opnieuw binden vanuit dezelfde modules — wat op zich kan, maar élk programma moet dan opnieuw gecompileerd worden zodra de logica wijzigt).

Een service program lost dat op: je bindt de modules één keer tot een `*SRVPGM`, en andere programma's roepen de geëxporteerde procedures aan zonder dat de broncode ooit gedupliceerd wordt. Wijzig je de logica binnen de service program, dan hoeft geen enkele caller opnieuw gecompileerd te worden (zolang de interface — de signature — niet verandert, zie hieronder).

```
CRTRPGMOD MODULE(MYLIB/CUSTUTIL) SRCFILE(MYLIB/QRPGLESRC) SRCMBR(CUSTUTIL)

CRTSRVPGM SRVPGM(MYLIB/CUSTUTIL) MODULE(MYLIB/CUSTUTIL)
          SRCFILE(MYLIB/QSRVSRC) SRCMBR(CUSTUTIL)
```

Bij `CRTSRVPGM` geef je (naast de modules) ook binder source op — dat is de volgende stap.

---

## 3. Binder language source: wat is publiek, en welke versie

De binder source (meestal een member in `QSRVSRC`) bepaalt welke procedures daadwerkelijk deel uitmaken van de publieke interface van de service program. Zonder `Export` op de procedure zelf (zie de procedures-gids) kán een procedure sowieso niet geëxporteerd worden — maar de binder source is waar je expliciet vastlegt wélke geëxporteerde procedures publiek worden, en in welke volgorde.

```
STRPGMEXP PGMLVL(*CURRENT) SIGNATURE('CUSTUTIL_1')
  EXPORT SYMBOL('GETCUSTNAME')
  EXPORT SYMBOL('UPDATEBALANCE')
ENDPGMEXP
```

- `SIGNATURE` identificeert deze specifieke versie van de interface.
- Elke `EXPORT SYMBOL`-regel maakt één procedure (of exported data-item) onderdeel van de publieke interface.
- **De volgorde ligt vast.** Zodra callers tegen deze signature gebonden zijn, mag je de volgorde van bestaande exports niet meer wijzigen — dat zou bestaande callers breken.

### Nieuwe procedures toevoegen zonder bestaande callers te breken

Voeg je later een procedure toe, dan maak je een nieuw blok met `PGMLVL(*PREV)` voor de oude staat, en een nieuw `PGMLVL(*CURRENT)`-blok met een nieuwe signature waarin de nieuwe procedure is toegevoegd — **achteraan**, na de bestaande exports:

```
STRPGMEXP PGMLVL(*PREV) SIGNATURE('CUSTUTIL_1')
  EXPORT SYMBOL('GETCUSTNAME')
  EXPORT SYMBOL('UPDATEBALANCE')
ENDPGMEXP

STRPGMEXP PGMLVL(*CURRENT) SIGNATURE('CUSTUTIL_2')
  EXPORT SYMBOL('GETCUSTNAME')
  EXPORT SYMBOL('UPDATEBALANCE')
  EXPORT SYMBOL('DELETECUSTOMER')
ENDPGMEXP
```

Bestaande callers, gebonden tegen `CUSTUTIL_1`, blijven werken — hun aanroepen zoeken de procedures op dezelfde posities als voorheen. Nieuwe callers die opnieuw compileren, krijgen `CUSTUTIL_2` en kunnen ook `DeleteCustomer` gebruiken.

**Vuistregel:** verwijder of herschik nooit bestaande `EXPORT SYMBOL`-regels in een bestaand `PGMLVL`-blok. Voeg alleen toe, in een nieuw niveau.

---

## 4. Binding directories: niet steeds alles los opnoemen

Zonder binding directory moet je bij elke `CRTPGM`/`CRTBNDRPG` expliciet elk service program en elke module opnoemen waar je programma van afhangt. Bij een handvol service programs wordt dat al snel onhandig — en foutgevoelig, want vergeet je er één, dan breekt de bind.

Een binding directory is een naslaglijst: je zet er entries in, en bij het binden verwijs je alleen naar de directory. De compiler zoekt zelf op wat hij nodig heeft.

```
CRTBNDDIR BNDDIR(MYLIB/CUSTBNDDIR)

ADDBNDDIRE BNDDIR(MYLIB/CUSTBNDDIR) OBJ((MYLIB/CUSTUTIL *SRVPGM))
ADDBNDDIRE BNDDIR(MYLIB/CUSTBNDDIR) OBJ((MYLIB/ORDERUTIL *SRVPGM))
```

En dan, bij het compileren van een aanroepend programma:

```
CRTBNDRPG PGM(MYLIB/ORDERAPP) SRCFILE(MYLIB/QRPGLESRC) SRCMBR(ORDERAPP)
          BNDDIR(CUSTBNDDIR)
```

Voeg je later een nieuw service program toe aan je applicatie? Eén `ADDBNDDIRE`, en elk programma dat al naar die binding directory verwijst, kan het nieuwe service program meteen gebruiken bij de volgende compile — zonder dat je elk `CRTPGM`/`CRTBNDRPG`-commando hoeft aan te passen.

**Praktisch advies:** één binding directory per applicatie (of per logisch domein) is een gangbare aanpak — niet per programma, en niet één gigantische directory voor de hele IBM i.

---

## 5. Activation groups: waar draait het eigenlijk

Een activation group is een runtime-concept: een geïsoleerd stukje van een job waarin een programma zijn static storage, open files, overrides, en cleanup-gedrag heeft. Elke keer dat een programma voor het eerst wordt aangeroepen in een job, wordt het "geactiveerd" in een activation group — en dat bepaalt wanneer zijn resources weer vrijkomen.

### De opties

**`*NEW`** — het programma krijgt zijn eigen, nieuwe activation group bij elke activatie. Volledig geïsoleerd, maar als je dit overal gebruikt zonder na te denken, krijg je al snel tientallen activation groups in één job — met bijbehorende overhead.

**Named activation group** (bijv. `ORDERAPP`) — elk programma dat dezelfde naam opgeeft, deelt één activation group binnen de job. Dit is de gangbare aanpak voor een applicatie: alle programma's van "Order Entry" delen bijvoorbeeld de activation group `ORDERAPP`, terwijl "Facturatie" zijn eigen `INVOICING`-group heeft. Voordeel: gerelateerde programma's kunnen static storage en resources delen waar dat zinvol is, en je kunt de hele group in één keer opruimen (`RCLACTGRP`) zonder de rest van de job te raken.

**`*CALLER`** — het programma activeert in de activation group van wie het aanroept, in plaats van zijn eigen group te claimen. Dit is de **default voor service programs**, en met goede reden: een service program dat puur herbruikbare logica levert, hoeft geen eigen levensduur te hebben los van de programma's die het gebruiken. Het "leeft" mee met de caller, en ruimt netjes op zodra de caller's activation group wordt opgeruimd.

**`*DFTACTGRP`** — de default activation group van de job zelf, waar OPM-programma's (en niet-ILE-achtig geschreven code) van oudsher in draaien. Dit is er puur voor backward compatibility. Gebruik dit niet voor nieuwe ILE-ontwikkeling, tenzij je een specifieke reden hebt om te mengen met legacy-gedrag — statische storage in de default activation group wordt namelijk niet op dezelfde voorspelbare manier opgeruimd, en dat kan tot subtiele bugs leiden bij hergebruik binnen dezelfde job.

### Waarom dit ertoe doet

Activation groups bepalen onder andere:
- **Wanneer static storage (en `STATIC`-variabelen uit de procedures-gids) opnieuw geïnitialiseerd wordt** — bij het opnieuw activeren van de group, niet per se bij elke `CALL`.
- **Wanneer open files daadwerkelijk sluiten** — gekoppeld aan de activation group's levensduur, niet aan het individuele programma.
- **Isolatie tussen applicaties binnen dezelfde job** — een crash of resource-lek in de ene named activation group hoeft de andere niet te raken.

---

## 6. Hoe het samen past: een volledig voorbeeld

Doel: een herbruikbare `CustUtil`-service program, gedeeld via een binding directory, aangeroepen vanuit een toepassingsprogramma met zijn eigen named activation group.

```
// 1. Module compileren
CRTRPGMOD MODULE(MYLIB/CUSTUTIL) SRCFILE(MYLIB/QRPGLESRC) SRCMBR(CUSTUTIL)

// 2. Service program binden, met binder source en ACTGRP(*CALLER)
CRTSRVPGM SRVPGM(MYLIB/CUSTUTIL) MODULE(MYLIB/CUSTUTIL)
          SRCFILE(MYLIB/QSRVSRC) SRCMBR(CUSTUTIL)
          ACTGRP(*CALLER)

// 3. Binding directory aanmaken en het service program toevoegen
CRTBNDDIR BNDDIR(MYLIB/CUSTBNDDIR)
ADDBNDDIRE BNDDIR(MYLIB/CUSTBNDDIR) OBJ((MYLIB/CUSTUTIL *SRVPGM))

// 4. Toepassingsprogramma compileren, met een eigen named activation group
CRTBNDRPG PGM(MYLIB/ORDERAPP) SRCFILE(MYLIB/QRPGLESRC) SRCMBR(ORDERAPP)
          BNDDIR(CUSTBNDDIR) ACTGRP(ORDERAPP)
```

Wat hier gebeurt:
- `ORDERAPP` draait in zijn eigen named activation group `ORDERAPP`.
- `CUSTUTIL` (het service program) draait via `ACTGRP(*CALLER)` mee in diezelfde activation group — het claimt geen eigen levensduur.
- Bij de volgende compile van `ORDERAPP` hoeft niemand te onthouden welke service programs precies nodig zijn — dat lost `BNDDIR(CUSTBNDDIR)` op.
- Voegt iemand later een tweede service program toe aan `CUSTBNDDIR`? `ORDERAPP` kan het meteen gebruiken bij de volgende recompile, zonder wijziging aan het `CRTBNDRPG`-commando zelf.

---

## 7. Praktisch advies voor junioren

- **Eén binding directory per applicatie/domein**, niet per programma en niet één voor de hele IBM i.
- **Service programs op `ACTGRP(*CALLER)`, tenzij je een expliciete reden hebt om dat niet te doen.** Ze horen geen eigen levensduur te claimen los van hun callers.
- **Toepassingsprogramma's op een named activation group**, niet op `*DFTACTGRP`. Geef gerelateerde programma's dezelfde naam, zodat ze in dezelfde group vallen en samen opgeruimd kunnen worden.
- **Verander nooit de volgorde van bestaande `EXPORT SYMBOL`-regels** in een bestaand `PGMLVL`-blok van je binder source — voeg alleen nieuwe procedures toe in een nieuw niveau, met een nieuwe signature.
- **`DSPSRVPGM` en `DSPPGM` zijn je vrienden** als je wilt zien wat er daadwerkelijk gebonden is, welke signature een service program heeft, en in welke activation group iets draait — vooral bij het debuggen van "waarom ziet dit programma die nieuwe procedure niet."

---
