# Treningsglede

Min personlige treningsapp – bare med øvelsene jeg liker. Ren HTML/CSS/JavaScript uten avhengigheter
eller byggesteg. Alt lagres lokalt i nettleseren, og appen kan legges til på hjemskjermen og brukes offline.

## Faner

- **Programmer** – programmene fra tidligere PT-er (gruppert per PT) og mine egne. Start en økt, før kg/reps
  per sett (forhåndsutfylt fra forrige gang), huk av ✓ og gi øvelsen en score (1–5). En påbegynt økt lagres
  underveis, så den overlever at telefonen låses eller siden lastes på nytt.
  «Importer fra PT» lager både program og øvelser fra innlimt tekst.
- **Øvelser** – øvelsesbanken. Hver øvelse har en skjematisk tegning (start → slutt), valgfritt eget bilde,
  min score, beskrivelse og notater, pluss stats: beste vekt, estimert 1RM, graf over tyngste sett og historikk.
- **Vekt** – graf over vekt med hendelser (f.eks. oppstart/slutt på medisin) som loddrette linjer.
  Med sluttdato blir perioden skravert.
- **Mål** – hofte, midje, lår og overarm, med én graf per mål og samme hendelser lagt over.
- **Admin** – sikkerhetskopi (JSON) og import (slå sammen / erstatt), CSV-eksport av vekt og mål, sletting.

## Importformat for PT-programmer

Én øvelse per linje. Overskrifter (`Dag 1:`, `# Overkropp`, `Økt B`) deler opp i flere programmer.

```
Dag 1 – Bein:
Knebøy 3x10 40kg
Rumensk markløft 3 x 8-12 @ 30 kg, pause 90 sek
Hip thrust 4 sett 12 reps 60 kg (fokus på topp)
Planke 3 x 30 sek
```

Før lagring vises en forhåndsvisning der navn, tall og tegning kan rettes. Øvelser med samme navn som en
som allerede finnes i banken, blir gjenbrukt.

## Kjøre lokalt

```
python3 -m http.server 8000
```

og åpne http://localhost:8000. (Å åpne `index.html` direkte fungerer også, men uten offline-støtte.)

## Publisere med GitHub Pages

Settings → Pages → «Deploy from a branch» → velg grenen og mappen `/ (root)`. Åpne adressen på mobilen og
velg «Legg til på Hjem-skjerm».

## Sikkerhetskopi

Dataene ligger bare i nettleseren på enheten du bruker. Ta jevnlig eksport under **Admin** – appen minner deg
på det når det er over 14 dager siden sist. Filen kan importeres på en annen enhet.

## Tester

```
node tests/parser.test.js
```
