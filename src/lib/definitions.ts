/** Eenduidige KPI-definities (getoond in tooltips). Ter bevestiging door Anniek. */
export const DEFINITIES = {
  doorlooptijd:
    "Gemiddeld aantal maanden tussen intake/start en einddatum van een traject. Lopende trajecten (zonder einddatum) tellen niet mee.",
  kostenPerClient:
    "Totale inkoopkosten van de zorg (inkoop behandelaar + inkoop regiebehandelaar), gedeeld door het aantal unieke cliënten in de selectie. Eigen regie telt niet als inkoop.",
  duurzameUitstroom:
    "Aandeel afgesloten trajecten waarbij de cliënt binnen 12 maanden na de einddatum geen nieuw traject start (geen heraanmelding). Alleen trajecten waarvan dit venster van 12 maanden al is verstreken tellen mee.",
  budgetrealisatie:
    "Gerealiseerde omzet (som maanddeclaraties) afgezet tegen het afgesproken plafond. Bij een gemeente-filter telt alleen het plafond van die gemeente(n). Jaar is verplicht.",
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
