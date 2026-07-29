# Native I/O Operaties in RPGLE — Cheat Sheet

*Cheatsheet voor I/O operaties en %BIF. Gemaakt door Claude ai door Reinald Jansen.*

---

## 0. Cheatsheet — alle operaties

| Operatie | Doel | Free-format keyword | KEYED nodig? | Alleen lezen? |
|---|---|---|---|---|
| Random access op key | Eén record ophalen via key | `CHAIN` | Ja | Nee |
| Random access op RRN | Eén record ophalen via relative record number | `CHAIN` | Nee | Nee |
| Positioneren op key | Cursor zetten, niets lezen | `SETLL` | Ja | Nee |
| Positioneren na key | Cursor net ná een key zetten | `SETGT` | Ja | Nee |
| Sequentieel lezen (voorwaarts) | Volgende record lezen | `READ` | Nee | Nee |
| Sequentieel lezen op RRN (voorwaarts) | Volgende record lezen via RRN-positie | `READ` | Nee | Nee |
| Lezen zolang key gelijk blijft | Alle records met dezelfde key (duplicaten) | `READE` | Ja | Nee |
| Sequentieel lezen (achterwaarts) | Vorige record lezen | `READP` | Nee | Nee |
| Lezen achterwaarts zolang key gelijk blijft | Duplicaten achterwaarts | `READPE` | Ja | Nee |
| Nieuw record toevoegen | Record wegschrijven | `WRITE` | Nee | Nee |
| Bestaand record wijzigen | Laatst gelezen record bijwerken | `UPDATE` | Nee | Nee |
| Record verwijderen | Laatst gelezen record (of via key) wissen | `DELETE` | Nee (key optioneel) | Nee |
| Bestand openen | Expliciet openen (i.p.v. automatisch) | `OPEN` | Nee | Nee |
| Bestand sluiten | Expliciet sluiten | `CLOSE` | Nee | Nee |
| Lock vrijgeven | Record-lock lossen zonder UPDATE/DELETE | `UNLOCK` | Nee | Nee |
| Buffer forceren | Uitvoerbuffer legen naar schijf | `FEOD` | Nee | Nee |
| Transactie afsluiten | Wijzigingen definitief maken (commitment control) | `COMMIT` | N.v.t. | Nee |
| Transactie terugdraaien | Wijzigingen ongedaan maken (commitment control) | `ROLLBACK` | N.v.t. | Nee |

**Extenders:**

| Extender | Van toepassing op | Effect |
|---|---|---|
| `(N)` | `CHAIN`, `READ`, `READE`, `READP`, `READPE` | Geen record lock plaatsen. |
| `(E)` | Vrijwel elke operatie | Vangt harde I/O-fouten op (geen "niet gevonden"). |
| `(EN)` | Combinatie | Beide effecten tegelijk. |

**Regel #1:** gebruik `CHAIN` voor één record via een unieke key, `SETLL` + `READE` voor duplicaten, en RRN-toegang alleen wanneer je de fysieke recordpositie al kent.

---

## 1. BIF's (Built-In Functions) — statuschecks na I/O

| BIF | Wat het checkt | Relevant na | Retourtype | Voorbeeld |
|---|---|---|---|---|
| `%FOUND(file)` | Is er een record gevonden/verwijderd/gepositioneerd op een exacte key? | `CHAIN`, `DELETE`, `SETLL`, `SETGT` | Indicator (`*On`/`*Off`) | `If %Found(CustomerL2);` |
| `%EOF(file)` | Einde van bestand bereikt, of geen matches meer binnen een `READE`/`READPE`-groep? | `READ`, `READE`, `READP`, `READPE` | Indicator | `Dow Not %Eof(OrderLF);` |
| `%EQUAL(file)` | Staat de cursor exact op de opgegeven key (i.p.v. ervoor/erna)? | `SETLL`, `SETGT` | Indicator | `If %Equal(CustomerL2);` |
| `%STATUS(file \| *PSSR)` | Laatste I/O-statuscode (bijv. 1211 = key mismatch, 1218 = record locked) | Elke operatie, i.c.m. `(E)`-extender | Numeriek (integer) | `If %Status(CustomerL2) = 1218;` |
| `%LOCKED(file)` | Is het record momenteel gelockt door een andere job? | Na `CHAIN`, vóór een `UPDATE`/`DELETE`-poging | Indicator | `If %Locked(CustomerL2);` |
| `%ERROR` | Is er een fout opgetreden bij de laatste operatie met een `(E)`-extender? | Elke operatie met `(E)` | Indicator | `Chain(e) custKey CustomerL2; If %Error;` |
| `%RRN(file)` | De relative record number van het laatst gelezen record | Na `CHAIN`, `READ`, `READE`, `READP`, `READPE` | Numeriek | `savedRrn = %Rrn(CustomerPF);` |
| `%OPEN(file)` | Is het bestand momenteel open? | Overal, vaak vóór een expliciete `OPEN`/`CLOSE` | Indicator | `If Not %Open(CustomerL2);` |
| `%TLOOKUP` / `%LOOKUP` | *(geen I/O-BIF, geen tabel-lookup — niet verwarren met bestandstoegang)* | — | — | — |

**Vuistregels:**
- `%Found` en `%Eof` door elkaar halen is de meest voorkomende bug — `%Found` hoort bij random access (`CHAIN`/`SETLL`/`SETGT`/`DELETE`), `%Eof` hoort bij sequentieel lezen (`READ`-familie).
- `%Error` vangt alleen iets op als je de `(E)`-extender gebruikt op die operatie — zonder die extender crasht de job gewoon bij een harde fout, in plaats van dat `%Error` waar wordt.
- `%Status` geeft je het concrete waarom; gebruik dit ná `%Error` is waar, niet als vervanging ervoor.
- `%Rrn` is vooral nuttig om een positie te bewaren en er later exact naar terug te keren via `CHAIN` op RRN.
