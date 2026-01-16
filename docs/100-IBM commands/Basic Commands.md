---
sidebar_position: 1
---
# 100.1 IBM I Commands Basics

IBM I commands zijn commands die je op de command line kan invullen. Hiermee kun je allerlei commando's uitvoeren, zoals libraries inzien, physical files, code pages aanmaken zoals rpgle, members aanmaken, etc. Hier zul je een algemeen standaard overzicht zien van de basale commando's.

## Zoek Commando
Op de commandline: `str*` als voorbeeld: Dit geeft dan alle commando's weer die starten met STR, wat staat voor start. Dit is handig als je het even niet meer weet wat het commando is.
![Resultaat van commando `STR*`](./img/sc1.png)

## Start Programming Development Manager
Op de commandline: `strpdm`. Hiermee start je het programming development manager. Je kunt dan:

- Werken met libraries (ofwel `wrklibpdm`)
- Werken met objects (ofwel `wrkobjpdm`). Voor het werken met een specifiek object: `wrkobj`.
- Werken met members (ofwel `wrkmbrpdm`)

## Work commando
Op de commandline: `wrk*`. Dit geeft alle werk commando's. Vaak als je ergens mee wilt werken, dan is `wrk` onderdeel van het commando, hetzelfde als met zoeken en `str`. zoals de commando's hierboven van `strpdm`. Daarmee werk je met objecten, libraries of members.

### Work user profiles
Op de command line `wrkusrprf`. Dit geeft alle user profiles, en je kunt gelijk ze bewerken met optie 2, kopiëren met optie 3 of verwijderen met optie 4. Ook kun je bij de desbetreffende user zijn/haar account disablen of enablen: inactief maken of actief. Als iemand te vaak verkeerd zijn wachtwoord invoert, dan zal het account ook automatisch disabled zijn en moet iemand anders het weer op enabled zetten.

### Werken met systeem status
Op de command line `wrksyssts`. Dit laat de 'gezondheid' van het systeem zien, zoals hoeveel geheugen gebruikt wordt, hoeveel taken er zijn, etc.

## Display commando
Op de command line: `dsp*`. Dit geeft alle display of laat zien commando's weer. Het lijkt veel op het `wrk` commando, maar nu kun je niks aanpassen: het is alleen weergeven. Bijvoorbeeld `wrklib` en `dsplib`.

### display spoolfile
Op de command line: `dspsplf`. Hiermee kun je naar spoolfiles, maar je moet dan specifieke informatie van een spoolfile opgeven. Het is gemakkelijker om te zoeken naar een bepaalde spoolfile met `wrksplf`.
