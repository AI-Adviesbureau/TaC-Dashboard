/** Eenduidige KPI-definities (getoond in tooltips). Ter bevestiging door Anniek. */
export const DEFINITIES = {
  doorlooptijd:
    "Gemiddeld aantal maanden tussen intake/start en einddatum van een traject. Lopende trajecten (zonder einddatum) tellen niet mee.",
  kostenPerClient:
    "Gedeclareerd bedrag (som van de maandkolommen, t/m de gekozen maand) gedeeld door het aantal actieve cliënten (unieke cliënten met minstens één declaratie). Dit is dezelfde definitie als in het gemeentedashboard (Jeugdmonitor).",
  inkoopPerClient:
    "Interne maat: inkoopkosten van de zorg (inkoop behandelaar + inkoop regiebehandelaar) gedeeld door het aantal unieke cliënten op de lijst. Eigen regie telt niet als inkoop.",
  actieveClienten:
    "Unieke cliënten met minstens één declaratie in de periode (t/m de gekozen maand). Komt overeen met 'actieve cliënten [gedeclareerd]' in het gemeentedashboard.",
  realisatieTm:
    "Gedeclareerd bedrag t/m de gekozen maand: som van de maandkolommen jan t/m die maand op de Excel-lijst van dat jaar. Zonder maandkeuze: de hele lijst.",
  budgetverbruik:
    "Gedeclareerd t/m de gekozen maand gedeeld door het budget van de selectie. Met de schakelaar 'Budgetbasis' kies je de noemer: toegekend incl. speling, of het basisbudget zoals de gemeente rekent.",
  budgetBasis:
    "Twee manieren om het budgetverbruik te berekenen — zelfde realisatie, andere noemer.\n\n• Toegekend incl. speling: het budget zoals het aan Talenti a Casa is toegekend inclusief de toegestane afwijking (bijv. 2026 Noord-Limburg: € 793.000 in totaal, per gemeente ingevuld in Beheer).\n\n• Basisbudget (gemeente): het budget zónder speling, waartegen het gemeentedashboard (Jeugdmonitor) het verbruik afzet (2026 Noord-Limburg: € 483.960; de speling van € 300.000 komt daar bovenop). Kies deze basis om het percentage van de gemeente te herkennen.\n\nHet basisbudget per gemeente vul je in bij Beheer → Budgetplafonds; ontbreekt het, dan wordt een totaalrij voor de regio gebruikt.",
  monitorPrognose:
    "Verwachte realisatie aan het eind van het jaar: gedeclareerd t/m de gekozen maand plus het gemiddelde maandbedrag (over de verstreken maanden) maal de resterende maanden. Zelfde lineaire benadering als de gemeente.",
  toegewezenClienten:
    "Unieke cliënten met een lopend traject in die maand (intake vóór het einde van de maand en nog geen einddatum, of einddatum in/na die maand).",
  duurzameUitstroom:
    "Aandeel afgesloten trajecten waarbij de cliënt binnen 12 maanden na de einddatum geen nieuw traject start (geen heraanmelding). Alleen trajecten waarvan dit venster van 12 maanden al is verstreken tellen mee.",
  budgetrealisatie:
    "Gerealiseerde omzet (som maanddeclaraties, t/m de gekozen maand) afgezet tegen het budget. Bij een gemeente-filter telt alleen het budget van die gemeente(n). Jaar is verplicht. De noemer (toegekend incl. speling of basisbudget) kies je met de schakelaar 'Budgetbasis'.",
  trajecten:
    "Aantal trajecten op de gekozen Excel-lijst (tabblad). Tussen haakjes het aantal lopende trajecten (zonder einddatum).",
  marge:
    "Omzet/budget minus inkoopkosten en 20% overhead, voor de huidige selectie.",
  aangevraagdBudget:
    "Som van BEDRAG sp + BEDRAG (kolommen K en L) per traject — het bij de gemeente aangevraagde budget. Niet altijd ingevuld in de bron.",
  gedeclareerdBudget:
    "Som van de maandkolommen (jan–dec) — werkelijk gedeclareerde bedragen per traject.",
  budgetPrognose:
    "Verwacht eindbedrag als lopende trajecten doorlopen tegen het huidige maandtempo. Afgesloten trajecten: gedeclareerd tot nu toe. Lopende: gedeclareerd + (resterende maanden × gemiddeld per maand), maximaal het aangevraagde budget per traject. Percentage = prognose ÷ aangevraagd; “nog” = aangevraagd − prognose (negatief = verwachte overschrijding).",
  budgetResterend:
    "Aangevraagd minus gedeclareerd op dit moment. Negatief betekent dat er al meer is gedeclareerd dan in K+L staat — kan komen doordat declaraties over meerdere jaren lopen terwijl K+L soms beperkt of leeg is.",
} as const;
