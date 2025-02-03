---
sidebar_position: 3
---
# 2.3 Display Files Ontwerpen

*Tip: gebruik de naviatie aan de rechterzijde om makkelijk tussen onderdelen te springen*

## Basisregels in de Screen Design Aid
- Je navigeert over het scherm met de pijltjes op je toetsenbord.
- De toevoegingen die je maakt worden pas definitief als je op enter drukt.

## Tekst toevoegen
Om tekst op het scherm toe te voegen, typ je je woorden en/of hele zinnen tussen enkele aanhalingstekens.
![tekst in displayfile](./img/sc9.png)

Bij druk op de entertoets verdwijnen de aanhalingstekens:

![tekst in displayfile](./img/sc10.png)

Dit is statische tekst. Je kan dit niet via je RPGLE code aanpassen, het is geen variabele.


## Input- en outputvelden

### Input
Als je de gebruiker tekst wilt laten invoeren, typ je bijvoorbeeld `+i(20)`
Hier betekent +i dat je een inputveld op deze locatie wilt toevoegen, en met (20) zeg je dat het veld uit maar maximaal 20 karakters kan bestaan.

### Output
Je kan ook output tonen. Zo kun je aan de hand van gebruikersacties feedback tonen. Dit werkt bijna hetzelfde als de input, namelijk `+o(20)`

![input/output in displayfile](./img/sc11.png)

Als je nu op enter drukt, krijg je:

![tekst in displayfile](./img/sc12.png)

### Both
Je kan een veld ook zowel een input als output maken. In de praktijk zou je dit kunnen gebruiken om bijvoorbeeld je zoekopdracht in het veld te laten staan wanneer je op enter drukt. Als namelijk bij een inputveld op enter drukt, wordt het veld weer helemaal leeggemaakt. Of wanneer je door pagina's wilt navigeren door een paginanummer in te voeren, dan is het wel fijn dat je na enter nog kan zien op welke pagina je bevindt.

Dit schrijf je als `+b(2)`

### Naamgeving
De input/output velden wil je uiteraard in je RPGLE code gebruiken. Om dat te doen kan je de namen van elk inputveld aanpassen. Dit doe je door vóór een veld een vraagteken te zetten.

![naamgeving in displayfile](./img/sc13.png)

Druk dan op enter. Linksonder verschijnt nu een tekstveld met een automatisch gegenereerde naam. Verander dit met je eigen naam (max 10 karakters).


![naamgeving in displayfile](./img/sc14.png)

![naamgeving in displayfile](./img/sc15.png)

Druk dan op enter, nu heeft dit inputveld de naam INHUISDIER die je kan gebruiken in de RPGLE code.

Dit werkt hetzelfde als bij de 'output' en 'both' veld. Wel aan te raden om in je naamgeving te zeggen wat voor veld het is, dus begin met bijvoorbeeld in/out/both.


## Tekst aanpassen

Het is ook mogelijk om tekst en velden te verplaatsen, verwijderen en op te maken.

### Verplaatsen

#### Opzij verplaatsen

Dit doe je door pijltjes links of rechts van je tekst te zetten. Elk pijltje is 1 kolom opzij.

![verplaatsen in displayfile](./img/sc16.png)

Na enter:

![verplaatsen in displayfile](./img/sc17.png)


#### Tussen regels verplaatsen

Dit doe je door je tekst tussen '-' streepjes te zetten. En waar je vervolgens de '=' teken plaatst wordt de nieuwe locatie.

![verplaatsen in displayfile](./img/sc18.png)

Na enter:

![verplaatsen in displayfile](./img/sc19.png)


#### Centreren

Om tekst te centreren op je scherm, plaats je simpelweg de 'a' vóór de tekst, en 'c' over de eerste letter van de tekst. `verplaats deze tekst` wordt dan `acerplaats deze tekst`. Druk dan op enter.


### Verwijderen

Om tekst te verwijderen, zet je een 'd' voor de tekst dat je wilt verwijderen. Bij druk op de enter zal het weggehaald worden.

### Kleuren

Je kan tekst en velden ook kleuren geven zodat het gebruiksvriendelijker wordt. Zo kun je bijvoorbeeld alle verschillende soorten velden een aparte kleur geven.

Om dit te doen, typ '*' voor de tekst dat je wilt aanpassen en dan op enter.

Hier vindt je nog allemaal andere instellingen die later van nut kunnen zijn, maar voor nu wil je Colors selecteren door daar 'Y' te typen.

![verkleuren in displayfile](./img/sc20.png)

Nu kun je kiezen uit 7 verschillende kleuren. Typ '1' achter de kleur die je wilt, en dan op enter en nog een keer op enter zodat je weer terug bent op je scherm.

Zo kun je je scherm er dan uit laten zien:

![verkleuren in displayfile](./img/sc21.png)
