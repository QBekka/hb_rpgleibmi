---
sidebar position: 2
---
# 100.2 Printer commando's
Hier vindt je algemene commando's die te maken hebben met printer instellingen op IBM I.

## Algemeen
Printers op IBM I zijn wat anders dan je verwacht. Print opdrachten, spoolfiles, komen terecht in een output queue. Dit is de queue voor de printer met zijn opdrachten om te printen. De printer en de output queue zijn beiden **te configureren**, zoals de queue of printer op hold te zetten zodat niks geprint wordt. Ook moet de output queue **gekoppeld** zijn aan de printer, anders weet de printer niet wat het moet printen.

## werken met printers
`wrkwtr`. Dit is het commando om te werken met alle printers. Hier zie je de statussen van de printers, als ze aan het printen zijn om welk bestand het gaat.
wrkwtr staat eigenlijk voor work writer, de printers zijn eerder writers vanuit een outq.

## werken met outqueue printers
`wrkoutq`. Vaak hebben de outqueues van de printers dezelfde naam als de printers zelf, voor makkelijkheid. Je kunt ook hier komen via `wrkwtr`, optie 8 werken met uitvoerwachtrij.

## werken met configuratiestatus
`wrkcfgsts` met *dev. Work configuration status. Hiermee kun je de printers instellen, zoals IP adres, Vary on / off. Vaak krijg je een foutmelding als je iets wilt aanpassen, want dan moet de printer uit staan.
