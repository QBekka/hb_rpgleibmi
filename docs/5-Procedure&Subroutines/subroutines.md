---
sidebar_position: 2
---

# 5.2 subroutines

Zoals eerder gezegd, subroutines zijn uitstekend om code te hergebruiken, en om code op te schonen en leesbaarder te maken. Het voordeel van subroutines is dat de "scope" hetzelfde is als de waar de code staat. Dit betekent dat in de subroute variables gebruikt kunnen worden die gedeclareert worden buiten de subroutine, en dat waardes toegekent kunnen worden aan variabelen. Subroutines zijn voornamelijk handig voor kleine stukjes code die vaak herhaalt worden in hetzelfde programmablok.

Wanneer je in een Main programma subroutines gebruikt, geeft visual studio code aan dat dit wordt afgeraden. Dit heeft te maken met programmeer filosofie, je wilt eerder procedures gebruiken want die zijn beter te hergebruiken over meerdere, andere programma's. Het kan nog steeds, en je zult zien dat in oudere code dit gedaan wordt, maar procedures wordt eerder aangeraden.

## aanmaken subroutine

Een subroutine gebruik je zo:
'''
//code hierboven
exsr NaamSr;
//andere code

begsr NaamSr;
  // do iets
endsr;
'''

