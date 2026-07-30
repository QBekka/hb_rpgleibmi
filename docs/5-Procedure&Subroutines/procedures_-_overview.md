---
sidebar_position: 3
---

# RPGLE Procedures — Een Praktische Gids

*Geschreven voor junior RPGLE-developers.Gemaakt door Claude ai, door Reinald Jansen*

---

## 5.3.0. Cheatsheet (snel opzoeken)

**De drie bouwstenen**

| Onderdeel | Fixed-format | Free-format | Doel |
|---|---|---|---|
| Prototype | `D`-spec, type `PR` | `Dcl-Pr ... End-Pr` | Declareert de signature (naam, return type, parameters) zodat callers weten hoe ze moeten aanroepen |
| Procedure interface | `D`-spec, type `PI` | `Dcl-Pi ... End-Pi` | Definieert de parameters *binnen* de procedure-body zelf |
| Begin/end van de procedure | `P`-spec (`B`/`E`) | `Dcl-Proc ... End-Proc` | Markeert waar de procedure-code begint en eindigt |

**Intern vs extern**

| Scope | Hoe declareer je dat | Zichtbaar voor |
|---|---|---|
| **Intern** (default) | Geen `Export`-keyword | Alleen binnen dezelfde source member / module |
| **Extern** | `Export` op de `B`-regel (fixed) of `Dcl-Proc naam Export;` (free) | Andere modules die in hetzelfde programma gebonden zijn, én — als de module in een `*SRVPGM` zit — andere programma's die dat service program aanroepen |

**Parameter-keywords**

| Keyword | Doel |
|---|---|
| (geen keyword) | Pass by reference — default. Wijzigingen in de procedure komen terug bij de caller. |
| `CONST` | Pass by reference, maar read-only. Mag ook literals/expressies ontvangen. Meest gebruikte keuze voor input-parameters. |
| `VALUE` | Pass by value — een kopie. Wijzigingen komen niet terug bij de caller. Nodig voor interop met C/andere talen. |
| `OPTIONS(*NOPASS)` | Parameter is optioneel — caller mag hem weglaten. Moet de laatste(n) in de lijst zijn. |
| `OPTIONS(*OMIT)` | Caller mag `*OMIT` doorgeven i.p.v. een echte waarde. |
| `OPTIONS(*VARSIZE)` | Sta toe dat de actual parameter korter is dan gedefinieerd. |
| `OPTIONS(*STRING)` | Sta toe dat een literal/null-terminated string wordt doorgegeven waar een pointer verwacht wordt. |

**Overige veelgebruikte keywords**

| Keyword | Doel |
|---|---|
| `EXPORT` | Maakt de procedure zichtbaar buiten de huidige module — nodig voor service programs. |
| `EXTPROC(naam)` | Koppelt het prototype aan een extern (bijv. C-)symbool met een andere naam. |
| `STATIC` | Op een lokale variabele: behoudt zijn waarde tussen aanroepen (zoals `static` in C). |
| `Ctl-Opt Main(procNaam)` | Bepaalt welke procedure het entry point is, als je niet de lineaire mainline wilt gebruiken. |

**Regel #1:** elke subprocedure krijgt een prototype (`Dcl-Pr`), gebruik `CONST` als default voor input-parameters, en gebruik `VALUE` alleen als je het echt nodig hebt (interop, of als je zeker wilt zijn dat de caller niet per ongeluk iets wijzigt).

---

## 5.3.1. Wat is een procedure

Een RPGLE-programma bestaat uit één **main procedure** (de lineaire mainline-code, of expliciet aangewezen via `Ctl-Opt Main`) en optioneel één of meer **subprocedures**. Subprocedures zijn losstaande stukjes code met eigen naam, eigen parameters, eigen lokale variabelen, en een eigen return-waarde (optioneel).

Waarom subprocedures gebruiken in plaats van alles in de mainline of in oude-stijl subroutines (`EXSR`) proppen?

- **Scope**: variabelen binnen een procedure zijn standaard lokaal — geen risico dat een subroutine per ongeluk een globale variabele overschrijft die elders wordt gebruikt.
- **Herbruikbaarheid**: je kunt een procedure exporteren en vanuit meerdere programma's aanroepen (via een service program).
- **Leesbaarheid**: een prototype vertelt je in één regel wat een procedure verwacht en teruggeeft, zonder dat je de hele implementatie hoeft te lezen.

---

## 5.3.2. Fixed-format anatomie

Een subprocedure in fixed-format bestaat uit drie delen: het **prototype** (meestal bovenaan de source, of in een `/copy`-member), de **P-spec** die het begin en einde markeert, en de **procedure interface** die de parameters binnen de procedure zelf herhaalt.

```rpgle
     D GetCustName    PR            30A
     D  CustNo                       6S 0 Const

     P GetCustName    B                   Export
     D GetCustName    PI            30A
     D  CustNo                       6S 0 Const
     D  custName       S             30A

     C                   Eval      custName = 'placeholder'
     C                   Return    custName

     P GetCustName    E
```

- De `PR`-regel is het prototype: naam, return type (`30A`), en de parameterlijst met `Const`.
- De `P`-spec met `B` markeert het begin van de procedure-body, met `E` het einde.
- De `PI`-regel binnen de body herhaalt dezelfde signature — dit *is* wat de parameters daadwerkelijk beschikbaar maakt binnen de code.
- `Export` op de `B`-regel maakt de procedure zichtbaar voor andere modules (nodig als dit in een service program terechtkomt).

Belangrijk: prototype en procedure interface moeten **exact overeenkomen** in return type en parameters — dat is precies waarom compilers vaak een gedeeld `/copy`-member met alleen het prototype gebruiken, zodat je het niet twee keer hoeft te onderhouden.

---

## 5.3.3. Free-format anatomie

```rpgle
**FREE
Dcl-Pr GetCustName Char(30);
  CustNo Zoned(6:0) Const;
End-Pr;

Dcl-Proc GetCustName Export;
  Dcl-Pi GetCustName Char(30);
    CustNo Zoned(6:0) Const;
  End-Pi;

  Dcl-S custName Char(30);

  custName = 'placeholder';
  Return custName;
End-Proc;
```

Zelfde structuur, zelfde drie onderdelen, alleen leesbaarder: `Dcl-Pr`/`End-Pr` voor het prototype, `Dcl-Proc`/`End-Proc` voor de procedure-body, `Dcl-Pi`/`End-Pi` voor de interface daarbinnen.

---

## 5.3.4. Parameters doorgeven

### Pass by reference (default)

```rpgle
Dcl-Pr UpdateBalance;
  CustNo   Zoned(6:0);
  NewBal   Packed(11:2);
End-Pr;
```

Zonder keyword geeft RPG een pointer door naar de daadwerkelijke variabele van de caller. Wijzig je de parameter in de procedure, dan wijzigt de waarde ook bij de caller. Handig als je een out-parameter wilt, gevaarlijk als je dat niet bedoelde.

### CONST — de meest gebruikte keuze voor input

```rpgle
Dcl-Pr GetCustName Char(30);
  CustNo Zoned(6:0) Const;
End-Pr;
```

`CONST` geeft ook by reference door, maar de procedure mag de waarde niet wijzigen — en de caller mag een literal, expressie, of resultaat van een berekening doorgeven (dat kan niet met een kale reference-parameter, want daar moet een echte variabele achter zitten om naar te kunnen wijzen). Gebruik dit als default voor elke parameter die alleen gelezen wordt.

### VALUE — een kopie

```rpgle
Dcl-Pr Celsius2Fahrenheit Packed(5:2);
  Celsius Packed(5:2) Value;
End-Pr;
```

`VALUE` geeft een kopie door. Wijzigingen in de procedure blijven lokaal. Dit is ook wat je nodig hebt als je een procedure aanroept die in C (of een andere taal) geschreven is die value-parameters verwacht.

### OPTIONS(*NOPASS) — optionele parameters

```rpgle
Dcl-Pr WriteLog;
  Message  Char(100) Const;
  Severity Zoned(1:0) Const Options(*Nopass);
End-Pr;
```

De caller mag `Severity` weglaten:

```rpgle
WriteLog('Er ging iets mis');
WriteLog('Kritieke fout' : 9);
```

Optionele parameters moeten altijd achteraan de lijst staan. Binnen de procedure controleer je met `%Parms` of een parameter daadwerkelijk is meegegeven.

### OPTIONS(*OMIT) en OPTIONS(*VARSIZE)

- `*OMIT` — caller mag `*OMIT` doorgeven in plaats van een echte waarde (typisch voor pointer-parameters die optioneel niets hoeven aan te wijzen).
- `*VARSIZE` — sta toe dat de actual parameter korter is dan de gedefinieerde lengte, zonder dat de compiler klaagt.

---

## 5.3.5. Return-waarden

```rpgle
Dcl-Pr GetCustName Char(30);
  CustNo Zoned(6:0) Const;
End-Pr;
```

Het return type staat direct achter de procedurenaam op de `Dcl-Pr`-regel. Binnen de procedure geef je de waarde terug met `Return`:

```rpgle
Return custName;
```

Een procedure zonder return-waarde (een "subroutine-achtige" procedure) laat je gewoon leeg — geen type na de naam, en `Return;` zonder waarde (of helemaal geen `Return`, dan valt de code gewoon door het einde van `End-Proc`).

---

## 5.3.6. Scope: lokaal vs globaal, en `STATIC`

Variabelen die je declareert *binnen* een `Dcl-Proc`/`End-Proc` zijn standaard **lokaal**: ze bestaan alleen tijdens die ene aanroep en krijgen bij elke nieuwe aanroep weer hun startwaarde. Variabelen die je declareert op programmaniveau (buiten elke procedure) zijn **globaal** en overal in het programma zichtbaar — inclusief in subprocedures, tenzij je expliciet `Dcl-Proc ... Static;`... nee, dat is niet hoe het werkt: globale zichtbaarheid vanuit een procedure is standaard, tenzij je bewust lokale variabelen met dezelfde naam declareert (die dan de globale versie afschermen binnen die procedure).

**Praktisch advies:** vermijd het gebruik van globale variabelen binnen subprocedures. Geef alles expliciet mee als parameter. Dat maakt een procedure makkelijker te testen, te begrijpen, en te hergebruiken zonder verborgen afhankelijkheden.

`STATIC` op een lokale variabele:

```rpgle
Dcl-S callCount Int(5) Static;
```

Deze variabele behoudt zijn waarde tussen aanroepen van de procedure (in plaats van elke keer opnieuw te initialiseren) — handig voor tellers, caches, of "is dit de eerste aanroep"-logica. Gebruik het spaarzaam; het introduceert impliciete state, wat weer ingaat tegen het idee van een voorspelbare, herbruikbare procedure.

---

## 5.3.7. Prototypes — waarom je ze echt nodig hebt

Het prototype is wat de compiler gebruikt om een aanroep te controleren: klopt het aantal parameters, kloppen de types, klopt het return type. Zonder prototype (of met een verkeerd prototype) compileert je code misschien nog, maar krijg je runtime-ellende die je met een prototype al bij het compileren had gezien.

Voor procedures die je in meerdere programma's aanroept (via een service program), zet je het prototype in een apart `/copy`-member, zodat elke caller exact dezelfde definitie gebruikt:

```rpgle
// in CUSTPR.rpgleinc
Dcl-Pr GetCustName Char(30) ExtProc('GETCUSTNAME');
  CustNo Zoned(6:0) Const;
End-Pr;
```

```rpgle
// in het aanroepende programma
**FREE
/copy CUSTPR
...
custName = GetCustName(custNo);
```

`ExtProc` koppelt het prototype aan het daadwerkelijke exported symbol — vooral relevant als de procedurenaam in het prototype niet 1-op-1 overeenkomt met de naam in de module (of als je een C-functie aanroept met een andere naming convention).

---

## 5.3.8. Recursieve procedures

Procedures mogen zichzelf aanroepen, zolang je geen `STATIC` gebruikt voor state die per aanroep uniek moet zijn (anders delen alle recursieve niveaus dezelfde waarde, wat zelden de bedoeling is).

```rpgle
Dcl-Pr Factorial Packed(15:0);
  N Int(5) Const;
End-Pr;

Dcl-Proc Factorial;
  Dcl-Pi Factorial Packed(15:0);
    N Int(5) Const;
  End-Pi;

  If N <= 1;
    Return 1;
  EndIf;

  Return N * Factorial(N - 1);
End-Proc;
```

---

## 5.3.9. Interne vs externe procedures

Elke subprocedure heeft een scope: **intern** (default) of **extern** (`Export`). Dit bepaalt wie de procedure mag aanroepen — en dat is een bewuste ontwerpkeuze, geen technisch detail.

### Interne procedure — alleen binnen dezelfde source member

Dit is de default. Geen `Export`-keyword nodig. De procedure bestaat alleen binnen dit ene programma/deze ene module en is voor de rest van de wereld onzichtbaar — zelfs een ander module dat in hetzelfde `*PGM`-object gebonden zit, kan er niet bij.

**Fixed-format:**

```rpgle
     D FormatName     PR            30A
     D  First                       15A   Const
     D  Last                        15A   Const

     C                   Eval      fullName = FormatName(firstName : lastName)
     C                   Eval      *INLR = *ON

     P FormatName     B
     D FormatName     PI            30A
     D  First                       15A   Const
     D  Last                        15A   Const

     C                   Return    %Trim(First) + ' ' + %Trim(Last)
     P FormatName     E
```

**Free-format:**

```rpgle
**FREE
Dcl-Pr FormatName Char(30);
  First Char(15) Const;
  Last  Char(15) Const;
End-Pr;

fullName = FormatName(firstName : lastName);
*InLr = *On;
Return;

Dcl-Proc FormatName;
  Dcl-Pi FormatName Char(30);
    First Char(15) Const;
    Last  Char(15) Const;
  End-Pi;

  Return %Trim(First) + ' ' + %Trim(Last);
End-Proc;
```

Gebruik dit voor alles wat alleen een implementatiedetail is van dít programma — helper-logica die je puur gebruikt om je eigen mainline leesbaar te houden. Geen `Export`, geen `/copy`-prototype nodig elders, want niemand anders roept hem aan.

### Externe procedure — zichtbaar buiten de module

Zodra je `Export` toevoegt, wordt de procedure een **exported symbol**: zichtbaar voor andere modules die in hetzelfde programma gebonden worden, én — als je de module bindt tot een `*SRVPGM` — voor elk ander programma dat dat service program aanroept.

**Fixed-format:**

```rpgle
     D GetCustName    PR            30A
     D  CustNo                       6S 0 Const

     P GetCustName    B                   Export
     D GetCustName    PI            30A
     D  CustNo                       6S 0 Const
     D  custName       S             30A

     C                   Eval      custName = 'placeholder'
     C                   Return    custName
     P GetCustName    E
```

**Free-format:**

```rpgle
**FREE
Dcl-Pr GetCustName Char(30);
  CustNo Zoned(6:0) Const;
End-Pr;

Dcl-Proc GetCustName Export;
  Dcl-Pi GetCustName Char(30);
    CustNo Zoned(6:0) Const;
  End-Pi;

  Dcl-S custName Char(30);
  custName = 'placeholder';
  Return custName;
End-Proc;
```

Twee dingen die hierbij komen kijken, en die er niet zijn bij interne procedures:

1. **Het prototype moet elders beschikbaar zijn.** Elke caller — of dat nu een ander module in hetzelfde programma is, of een compleet ander programma dat via een service program aanroept — heeft hetzelfde `Dcl-Pr`/`PR`-prototype nodig om de aanroep te kunnen compileren. Daarom zet je het prototype van een externe procedure standaard in een gedeeld `/copy`-member, niet lokaal bovenaan je programma.
2. **Bij een service program hoort een binder language source** (`*BND`-source, meestal met `STRPGMEXP`/`ENDPGMEXP` of de moderne `Ctl-Opt`/binder-language variant) die vastlegt welke exported procedures publiek onderdeel worden van de service program-interface, en in welke volgorde (de "signature"). Dit is nodig omdat je later procedures mag *toevoegen* aan een service program zonder bestaande callers te breken, zolang je de bestaande volgorde niet wijzigt.

Dat tweede punt — binder language, signatures, activation groups — is echt een eigen onderwerp. Zeg het als je daar een aparte, diepere gids voor wilt; hier laat ik het bij: weet dat het bestaat, en dat `Export` op een procedure niet automatisch betekent dat hij al bruikbaar is vanuit een ander *programma* — daarvoor moet de module ook daadwerkelijk in een service program gebonden zijn.

### Vuistregel: wanneer kies je wat?

| Situatie | Keuze |
|---|---|
| Helper-logica die alleen dit ene programma gebruikt | Intern (geen `Export`) |
| Logica die meerdere programma's binnen dezelfde applicatie delen | Extern (`Export`), gebonden via een service program |
| Je twijfelt | Begin intern. Exporteren kan je altijd later doen; iets terug intern maken zonder callers te breken is lastiger. |

---

## 5.3.10. Zij-aan-zij: een klein echt voorbeeld

Fixed-format:

```rpgle
     D CalcDiscount   PR            9P 2
     D  Amount                      9P 2 Const
     D  CustType                    1A   Const

     C                   Eval      total = CalcDiscount(orderAmt : custType)
     C                   Eval      *INLR = *ON

     P CalcDiscount   B
     D CalcDiscount   PI            9P 2
     D  Amount                      9P 2 Const
     D  CustType                    1A   Const

     C                   If        CustType = 'P'
     C                   Return    Amount * 0.9
     C                   Endif
     C                   Return    Amount
     P CalcDiscount   E
```

Free-format equivalent:

```rpgle
**FREE
Dcl-Pr CalcDiscount Packed(9:2);
  Amount   Packed(9:2) Const;
  CustType Char(1)     Const;
End-Pr;

Dcl-S total Packed(9:2);
total = CalcDiscount(orderAmt : custType);
*InLr = *On;
Return;

Dcl-Proc CalcDiscount;
  Dcl-Pi CalcDiscount Packed(9:2);
    Amount   Packed(9:2) Const;
    CustType Char(1)     Const;
  End-Pi;

  If CustType = 'P';
    Return Amount * 0.9;
  EndIf;
  Return Amount;
End-Proc;
```

---

## 5.3.11. Praktisch advies voor junioren

- **Elke subprocedure krijgt een prototype**, ook als hij alleen lokaal in hetzelfde programma wordt gebruikt — het is gratis documentatie én compiler-controle.
- **Gebruik `CONST` als default voor input-parameters.** Alleen wijzigen als de caller echt een gewijzigde waarde terug moet krijgen.
- **Vermijd globale variabelen binnen procedures.** Geef alles expliciet mee — makkelijker te testen, makkelijker te begrijpen.
- **Eén procedure, één verantwoordelijkheid.** Als je een procedure moeilijk kunt samenvatten in één zin, doet hij waarschijnlijk te veel.
- **Gebruik `OPTIONS(*NOPASS)` spaarzaam** — het is handig, maar te veel optionele parameters maakt een signature onduidelijk. Overweeg op een gegeven moment een data structure als parameter in plaats van tien losse optionele velden.
- **`STATIC` is een uitzondering, geen gewoonte.** Elke keer dat je het gebruikt, vraag jezelf af of je niet gewoon een parameter of een globale (met opzet) had moeten meegeven.

---
