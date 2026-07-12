# Beslissingen & KPI-definities

Dit document legt de gemaakte keuzes vast zodat ze niet "verdwijnen" tussen
sessies. De cursief/▸ gemarkeerde punten vragen nog bevestiging door Anniek
(zie briefing §12).

## KPI-definities (zoals nu geïmplementeerd)

| KPI | Implementatie |
| --- | --- |
| **Doorlooptijd** | Aantal maanden tussen `INTAKE/START` en `EIND`. Berekend uit de datums (decimaal, /30,4375 dagen); voor 2026 wordt de bronkolom gebruikt indien aanwezig. Lopende trajecten (zonder einddatum) tellen niet mee in het gemiddelde/mediaan. |
| **Kosten per cliënt** | `sum(inkoopBEH + inkoopRB) / aantal unieke relatienummers` binnen de selectie. Eigen regie telt niet als inkoop. |
| **Duurzame uitstroom** | Aandeel afgesloten trajecten waarbij dezelfde cliënt (relatienummer) binnen **12 maanden** na de einddatum geen nieuw traject start. Alleen trajecten waarvan dit venster van 12 mnd al verstreken is (eind ≤ vandaag − 12 mnd) tellen mee, om vertekening door recente afsluitingen te voorkomen. |
| **Budgetrealisatie** | `gerealiseerde omzet / afgesproken plafond` per gemeente/regio. Toont realisatie zonder norm zolang `budget_plafond` leeg is. |
| **Marge** | `omzet − inkoopBEH − inkoopRB − 20% overhead`. |

### Nog te bevestigen (briefing §12)

- ▸ Termijn duurzame uitstroom: 6 / 12 / 24 maanden (nu **12**).
- ▸ Telt de 20% overhead mee in "kosten per cliënt"? (nu: **nee** — alleen inkoop).
- ▸ Verschil tussen `BEDRAG sp` en `BEDRAG`. Nu opgeteld tot `omzet`.
- ▸ Lopende trajecten meenemen in doorlooptijd? (nu: **nee**).
- ▸ Budgetplafonds/plekkenafspraken per gemeente aanleveren.

## Regio-indeling (briefing §5.3)

- **Noord-Limburg**: Venlo, Venray, Horst aan de Maas, Peel en Maas, Beesel,
  Bergen, Gennep, Mook en Middelaar.
- **Midden-Limburg**: Roermond, Roerdalen, Leudal, Maasgouw, Echt-Susteren,
  Nederweert, Weert.
- **Overig**: o.a. Cranendonck, Helmond, België, Duitsland,
  Leidschendam-Voorburg (buiten het kernwerkgebied).
- ▸ Weert/Nederweert/Cranendonck op de grens — graag bevestigen.

Centraal aanpasbaar in `src/lib/normalize.ts`.

## Datakwaliteit (afgevangen in de ingest)

- **Gestapelde subtabellen** per jaartabblad (herhaalde `VLGNR`-kopregels) →
  het script splitst hierop en negeert herhaalde koppen.
- **Gemeentenamen** opgeschoond: `venlo`/`Venlo?` → Venlo, `Horst` → Horst aan
  de Maas, etc.
- **Maanden** in wisselende schrijfwijze genormaliseerd.
- **Placeholder-datums** (`00:00:00`, jaar < 2000) uitgesloten van
  doorlooptijdberekening.
- **PII** (BSN/voornaam/achternaam/geboortedatum) wordt nooit ingelezen.

### Ingest-resultaat (referentie, run 2026-06-04)

- 3.487 trajecten over 2019–2026; 1.841 unieke cliënten.
- Regio: Noord-Limburg 2.010 · Midden-Limburg 1.448 · Overig 29.
- Signalen: code ontbreekt 406×, ongeldige einddatum 85×, ongeldige
  intakedatum 21×.

## Verificatie van de berekeningen (2026-06-04)

Alle KPI's zijn onafhankelijk hercontroleerd door de cijfers rechtstreeks uit
het Excel te herberekenen (Python, los van de ingest-code) en te vergelijken met
Neon én het dashboard.

| Cijfer | Resultaat |
| --- | --- |
| Totale omzet/budget | € 7.282.237,22 — **exacte match** Excel ↔ Neon |
| Totale inkoopkosten | € 2.100.238,16 — **exacte match** |
| Kosten per cliënt | € 1.140,81 (= inkoop / 1.841 unieke cliënten) ✓ |
| Doorlooptijd gemiddeld / mediaan | 7,78 / 7,92 mnd ✓ |
| Duurzame uitstroom | 78,1% (1.721 / 2.204) ✓ |

### Gevonden en opgelost

- **Vervuiling in maandrealisatie (2019)**: in enkele 2019-blokken lekten
  9-cijferige getallen (BSN-/beschikkingsnummers) in de maandkolommen, met
  absurde `realisatie_totaal` tot gevolg. Opgelost met een plausibiliteitsgrens
  van € 50.000 per maand per traject (`MAX_MAAND_BEDRAG` in `scripts/ingest.ts`).
  94 waarden geweerd. KPI's (die op `BEDRAG`/inkoop draaien) waren hierdoor niet
  beïnvloed; de trajectdetails en `realisatie_totaal` nu wél schoon.
- **Datumtypfout in bron**: één cliënt heeft einddatum 31-07-**3024** (moet 2024
  zijn). De ingest weert jaartallen > 2100, dus dit traject krijgt geen
  doorlooptijd (correct) i.p.v. een uitschieter van ~12.000 maanden.

### Let op bij interpretatie — `BEDRAG` is niet consistent over de jaren

De kolom `BEDRAG` (onze "omzet/budget") is vóór 2023 veel beperkter ingevuld dan
daarna. De maandrealisatie vertelt een ander, vlakker verhaal:

| Jaar | omzet (BEDRAG) | maandrealisatie |
| ---- | -------------- | --------------- |
| 2019 | € 180k | € 372k |
| 2022 | € 653k | € 842k |
| 2024 | € 2.24M | € 1.22M |

▸ **Vraag aan Anniek**: welke kolom is de echte "omzet" — het beschikte `BEDRAG`
of de som van de maandfacturatie? De sprong in de omzet-trend (2019 → 2024) is
deels een registratie-wijziging, geen pure groei. De KPI's kloppen met de bron;
de *interpretatie* van omzet-over-jaren vraagt deze bevestiging.

## Controle-ronde 2 (bug fix) — belangrijke bevinding: dubbeltelling over jaren

Bij een tweede controle bleek dat **meerjarige trajecten in elk jaartabblad
opnieuw voorkomen** (zelfde `rel_nr` + `intake`). 1.239 van de 3.487 rijen zijn
zulke vervolgrijen. Gevolgen:

- De maandrealisatie per rij is wél per jaar (geen overlap) → som = correct.
- De kolom `BEDRAG` (de beschikking) wordt in elke jaarrij **herhaald**. Per rij
  optellen telt diezelfde beschikking dus meerdere keren mee.

Impact op de getallen:

| Maat | Per rij (huidig) | Ontdubbeld (rel+intake) |
| --- | --- | --- |
| Aantal trajecten | 3.487 | ~2.228 |
| Omzet/budget (BEDRAG) | € 7,28M | € 4,42M (beschikking 1× geteld) |
| Realisatie (maandfacturatie) | — | € 6,15M (per jaar, geen dubbeltelling) |

(284 groepen hebben afwijkende `BEDRAG` tussen jaarrijen — dus niet altijd een
exacte kopie; "1× per traject" is een redelijke benadering.)

**Beslissing (doorgevoerd): optie 1 — ontdubbelen + beide tonen.**
- Bron-of-waarheid is de SQL-view `traject_lijst`: één rij per traject **per
  Excel-lijst** (`bron_jaar` = tabblad). Beschikking (`omzet`) en `inkoop`
  worden 1× geteld per lijst, `realisatie`/`overhead`/`betaald` worden
  gesommeerd binnen die lijst. De jaarkiezer filtert op **lijstjaar**
  (`bron_jaar`), niet op intakejaar — elke jaarlijst wordt apart gedupliceerd.
- Alle KPI-, kosten-, behandelaar- en trajectenqueries draaien op `traject_lijst`.
- Legacy-view `traject_uniek` (ontdubbeld over alle jaren) blijft bestaan maar
  wordt niet meer gebruikt in het dashboard.

### Verder opgelost in deze ronde
- **Export kapte af op 500 rijen** (serverlimiet). Export pagineert nu en levert
  alle rijen.
- **Custom periode-selector** toegevoegd: naast jaar/maand kan een eigen
  datumrange (van–tot) gekozen worden; filtert op intakedatum. Blijft — net als
  jaar/maand — leeg na een browser-refresh.

## Bewuste UX-keuze: datum leeg na refresh

De globale periodekiezer (jaar/maand) en regio staan in vluchtige React-state
(`src/components/filters/filter-context.tsx`) — niet in URL of storage. Daardoor
start het dashboard na een browser-refresh weer met een **lege datum**, conform
de wens van de opdrachtgever. Dimensiefilters op de Trajecten-pagina zijn
pagina-lokaal.
