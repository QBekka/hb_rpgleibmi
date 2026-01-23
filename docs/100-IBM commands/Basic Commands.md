---
sidebar_position: 1
---
# 100.1 IBM I Commands Basics

IBM I commands zijn commands die je op de command line kan invullen. Hiermee kun je allerlei commando's uitvoeren, zoals libraries inzien, physical files, code pages aanmaken zoals rpgle, members aanmaken, etc. Hier zul je een algemeen standaard overzicht zien van de basale commando's. Verder is het goed om te realiseren dat bij een commando bijna altijd F4 gebruikt kan worden. Dat geeft je extra mogelijkheden naast de standaard waardes.

## Zoek Commando
Als je op de commandline een commando uitvoerd met * erachter, dan krijg je alle mogelijke commando's die starten met het opgegeven stuk. `str*` als voorbeeld: Dit geeft dan alle commando's weer die starten met STR, wat staat voor start. Dit is handig als je het even niet meer weet wat het commando is.
![Resultaat van commando `STR*`](./img/sc1.png)

## Start commando
Op de commandline: `str*`. Dit geeft alle start commando's. Vaak bepaalde programma's die dan opgestart worden.

### Start Programming Development Manager
Op de commandline: `strpdm`. Hiermee start je het programming development manager. Je kunt dan:

- Werken met libraries (ofwel `wrklibpdm`)
- Werken met objects (ofwel `wrkobjpdm`). Voor het werken met een specifiek object: `wrkobj`.
- Werken met members (ofwel `wrkmbrpdm`)

### start debugger
Op de commandline `strdbg` + `pgm`. Hiermee start je de debugger van het genoemde programma. Daarin kun je service points, breaks, variabelen monitoren, etc. Om het programma werkelijk te debuggen, start daarna het programma zoals normaal op via `call pgm`. Dan gaat de debugger door je programma heen.

De debugger beëindig je met `enddbg`. Dit is belangrijk als je een aanpassing hebt gedaan aan je programma! De aanpassen en compile zullen pas bij beëindigen van debug echt zichtbaar zijn, aangenomen dat je alles weer compiled hebt.

## Work commando
Op de commandline: `wrk*`. Dit geeft alle werk commando's. Vaak als je ergens mee wilt werken, dan is `wrk` onderdeel van het commando, hetzelfde als met zoeken en `str`. zoals de commando's hierboven van `strpdm`. Daarmee werk je met objecten, libraries of members.

### Work user profiles
Op de command line `wrkusrprf`. Dit geeft alle user profiles, en je kunt gelijk ze bewerken met optie 2, kopiëren met optie 3 of verwijderen met optie 4. Ook kun je bij de desbetreffende user zijn/haar account disablen of enablen: inactief maken of actief. Als iemand te vaak verkeerd zijn wachtwoord invoert, dan zal het account ook automatisch disabled zijn en moet iemand anders het weer op enabled zetten.

### Werken met systeem status
Op de command line `wrksyssts`. Dit laat de 'gezondheid' van het systeem zien, zoals hoeveel geheugen gebruikt wordt, hoeveel taken er zijn, etc.
![Resultaat van `wrksyssts`](./img/sc2.png)

### Werken met IFS
Op de command line `wrklnk`, F4. Hier kun je je path invullen waar je naar wilt kijken, anders pakt het de path van jouw user account. In je IFS kun je allerlei bestanden bekijken, editen, kopiëren, etc.

## Display commando
Op de command line: `dsp*`. Dit geeft alle display of laat zien commando's weer. Het lijkt veel op het `wrk` commando, maar nu kun je niks aanpassen: het is alleen weergeven. Bijvoorbeeld `wrklib` en `dsplib`.
![`dsp*` resultaat](./img/dsp_vb.png)

### display spoolfile
Op de command line: `dspsplf`. Hiermee kun je naar spoolfiles, maar je moet dan specifieke informatie van een spoolfile opgeven. Het is gemakkelijker om te zoeken naar een bepaalde spoolfile met `wrksplf`.

## Create commando
Op de commandline: `crt*`. Dit geeft alle create commando's weer. Dit soort commando's zijn voornamelijk belangrijk voor het opzetten van een nieuw user account met eigen bibliotheek, en het aanmaken van code pages zoals rpgle, cl, etc. 

De create commando's voor code pages zul je in het algemeen niet doen via de terminal, maar via VSC. Wees wel hierop bedacht dat je ook zo files kan aanmaken.
