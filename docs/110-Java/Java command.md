---
sidebar_position: 1
---
# 110.1 Java op IBM
Java is een groot onderdeel van IBM. ACS draait hierop onder andere. Vaak is ook java geïnstalleerd op de server, wat betekent dat je ook java can compileren en draaien in je programma's. Dit is verdraait handig, omdat RPG of CL niet altijd alles kan. Met java (of python bijvoorbeeld), is er opeens veel meer mogelijk. Dit betekent wel dat je je java programma's moet compileren en oproepen, en zeker het oproepen gaat net iets anders dan normaal.

Voor je standaard programmeren met java, zie <a href="https://www.w3schools.com/java/">W3Schools Java</a>.

## QShell
Op command line `qsh`. Hiermee open je een interactieve qsh voor command entry, een beetje hetzelfde als `cmd` in windows. Hier kun je je java programma's compileren en starten. Voor het compileren en runnen van je java programma's is het belangrijk om je path in te stellen. Vaak heb je je programma's ergens staan, en je moet je path wel instellen naar deze plek.

### Compile Java
Om je java class te compileren, gebruik je het commando `javac path/to/.java/*.java`. `*.java` is je java class die je wilt compileren, zoals `Car.java`.

### Run Java class
Voor het draaien van je java class, gebruik het commando `java -cp path/to/java/class class`. Hier zul je ook alle `System.out.println` statements zien.

## Running Java in CL
Je kunt ook java runnen vanuit een CL programma. Gebruik hiervoor het cl commando: `qsh cmd(....)` met op de puntjes je commando, bijvoorbeeld je `java` of `javac` commando. 

LET OP!

Met dit commando start je wel een shell op, wat dus betekent interactie. Je kunt je interacties en output redirecten: `</dev/null >/location/of/file.out 2>&1`. Hiermee wordt stdout en stderr geredirect naar je file. Daar zal alle informatie wat je normaal krijgt in opgeslagen worden. 
