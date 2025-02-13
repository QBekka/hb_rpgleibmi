---
sidebar_position: 3
---

# 5.3 Procedures

## 5.3.1 Gebruik procedures

Procedures kunnen op 2 manieren gebruikt worden: intern en extern. Verder is het doel opnieuw dat je code kunt hergebruiken. Je kunt een procedure het beste vergelijken met een functie: je kunt variabelen meegeven om te gebruiken en je kunt variablelen terug krijgen. Daarnaast is de "scope" ook anders: variabelen gedeclareert en wat je gebruikt in de procedure, blijft in de procedure. Je kunt niet externe waardes gebruiken of waardes doorgeven zonder gebruik te maken van return.

## 5.3.2 Intern gebruik
Voor intern gebruik, in je eigen programma, heb je 2 onderdelen nodig: een prototype en de procedure zelf.

### Prototype
Prototypes zijn eigenlijk de interface van de procedure: je geeft aan welke variabelen doorgegeven moeten worden, en wat er terug gegven wordt. Dit moet hetzelfde zijn als de procedure-interface. Dadelijk meer daarover. Een procedure ziet er zo uit:
'''
dcl-pr NaamProc TerugstuurVariabel;
  Var1 keywords;
  var2 keywords;
  etc.
end-pr;
'''
'NaamProc' is de naam van de procedure. 'TerugstuurVariabel' is de variabel wat je terug wilt sturen. Dit kan vanalles zijn zoals een interger, char, varchar, datastructure, etc. 'Var1' en de rest zijn de variabelen die je wilt doorgeven aan de procedure. Deze kunnen opnieuw vanalles zijn. de procedure eindigt met 'end-pr'.

### procedure
procedures zien er ongeveer zo uit:
'''
dcl-proc NaamProc;
  dcl-pi *n TerugstuurVariabel;
    Var1 keywords;
    Var2 keywords;
    etc.
  end-pi;
// doe iets
return TerugstuurVariabelNaam;
end-proc;
'''
Met 'dcl-proc NaamProc' start je de procedure, daarna moet de procedure interface gedefineerd worden, en dit moet hetzelfde zijn als de prototype: de terugstuurvariabel moet hetzelfde zijn, net als de doorgeef variabelen. Daarna kunnen de variabelen gebruikt worden, variabelen aangemaakt worden, berekeningen, etc. Op het einde wordt via 'return' de variabele teruggegeven wat je wilt.

## 5.3.3 Extern gebruik
Procedures kunnen ook extern gebruikt worden, maar er zijn een paar veranderingen en dingen die gedaan moeten worden.
1. Bij de procedure moet er nu de keyword export bij staan: 'dcl-proc NaamProc export;'
2. Bij de prototype krijg je nu erbij 'extproc("NaamProcDocument")'. Met NaamProcDocument wordt bedoelt de naam van de service program waar de procedure in staat. Service program wordt zo verder uitgelegd. LET OP! Gebruik hoofdletters.
3. Aan het begin van de file waar de procedure staat, moet nu 'ctl-opt NoMain' komen te staan. Hiermee geef je aan dat alles wat in  het bestand staat niet een main program is, maar een subonderdeel.
4. Het bestand moet gecompileerd worden als een module, en daarna als een service program. Hierdoor wordt het mogelijk om de procedure extern op te roepen.
5. Verder moet er ook een binding directory aangemaakt worden waarin de naam van de service program komt te staan. Op de command line 'crtbnddir'. Speficeer de library waarin het komt te staan en de naam. Dan met optie 12 open je de binding directory, en met optie 9 werk je met je net nieuw gemaakte binding directory. Hierin kun je nu je service programs aangeven met optie 1, de naam van de file, type is '*srvpgm', activation '*immed' en sla het op.
6. Als laatste stap, in je hoofdprogramma moet je aangeven dat je een binding directory gebruikt. Gebruik 'ctl-opt dftactgrp(*no) bnddir("NAAMBNDDIR")'. Dftactgrp is omdat je service programs gebruikt, en bnddir geef je aan wat voor binding directory je gebruikt. LET OP! Gebruik hoofdletters omdat het hoofdletter gevoelig is, en de naam zal automatisch in hoofdletter zijn.

