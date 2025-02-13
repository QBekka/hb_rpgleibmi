---
sidebar_position: 1
---

# 5.1 Procedures & Subroutines: Overview
## Wat zijn Ze?

In een programma worden vaak bepaalde acties herhaalt, op meerdere plekken. Dit kan natuurlijk gecodeerd worden, maar dat wil je liever niet: je wilt code hergebruiken. Hiervoor kun je subroutines en procedures gebruiken. Met beide opties kun je blokken code hergebruiken, zoals een klein rekenmachientje. Hier beneden staan 2 voorbeelden: 1 in subroutine en de andere in a procedure. Beiden zijn van Chatgpt. Beiden worden uitgelegd in de volgende pagina's.

## Voorbeeld subroutine
'''
**FREE
Dcl-S Num1 Int(10);
Dcl-S Num2 Int(10);
Dcl-S Sum  Int(10);

Num1 = 10;
Num2 = 20;

Exsr CalculateSum; // Call the subroutine

Dsply Sum;  // Display the result

*INLR = *ON; // End the program
Return;

 // Subroutine Definition
Begsr CalculateSum;
   Sum = Num1 + Num2; // Perform addition
Endsr;
'''
De snippet begint, zoals gewoonlijk, met '**free' en het declareren van variabelen en constantes. Daarna wordt de subroutine gestart met 'exsr CalculateSum' waarbij CalculateSum de naam is van de subroutine. Op het moment dat de subroutine wordt uitgevoerd, wordt er een "uitstapje" gemaakt naar de codeblock van de subroutine. De subroutine start met 'begsr CalculateSum' met Calculate sum de naam van de subroutine. Nu wordt de code tussen 'begsr' en 'endsr' uitgevoerd, wat in dit geval is een kleine som. Daarna gaat het programma weer verder zoals gewoonlijk en het eindigt met 'Return';

## voorbeeld prodecure
'''
**FREE
Dcl-S Num1 Int(10);
Dcl-S Num2 Int(10);
Dcl-S Sum  Int(10);

Dcl-Pr CalculateSum Int(10); // Prototype (declares the procedure)
   Num1 Int(10) Value;
   Num2 Int(10) Value;
End-Pr;

Num1 = 10;
Num2 = 20;

Sum = CalculateSum(Num1: Num2); // Call the procedure

Dsply Sum;  // Display the result

*INLR = *ON;
Return;

 // Procedure Definition (must be after the main logic)
Dcl-Proc CalculateSum;
   Dcl-Pi Int(10);
      Num1 Int(10) Value;
      Num2 Int(10) Value;
   End-Pi;

   Return Num1 + Num2;
End-Proc;
'''
Opniew, we starten met '**free' en het inladen van variabelen. Daarna zie je een prototype met 'dcl-pr CalculateSum int(10)'. Dit kun je zien als de interface van de procedure, waarbij de input en output gedefineerd is. Bij 'Sum = CalculateSum(Num1: Num2)' wordt de procedure gecalled. De output van de procedure wordt aan 'Sum' toegekent. In 'dcl-proc CalculateSum' wordt de procedure gedefineert. Hierin komt als eerste 'dcl-pi' wat de procedure-interface is. Dit moet hetzelfde zijn als de procedure. Daarna wordt de code verder uitgevoerd en de som returned.

