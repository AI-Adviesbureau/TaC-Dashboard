/** Eenduidige KPI-definities (getoond in tooltips). Ter bevestiging door Anniek. */
export const DEFINITIES = {
  doorlooptijd:
    "Gemiddeld aantal maanden tussen intake/start en einddatum van een traject. Lopende trajecten (zonder einddatum) tellen niet mee.",
  kostenPerClient:
    "Totale inkoopkosten van de zorg (inkoop behandelaar + inkoop regiebehandelaar), gedeeld door het aantal unieke cliënten in de selectie. Eigen regie telt niet als inkoop.",
  duurzameUitstroom:
    "Aandeel afgesloten trajecten waarbij de cliënt binnen 12 maanden na de einddatum geen nieuw traject start (geen heraanmelding). Alleen trajecten waarvan dit venster van 12 maanden al is verstreken tellen mee.",
  budgetrealisatie:
    "Gerealiseerde omzet afgezet tegen het afgesproken budgetplafond per gemeente/regio. Toon zodra de plafonds zijn aangeleverd.",
  trajecten:
    "Aantal trajecten in de selectie. Tussen haakjes het aantal lopende trajecten (zonder einddatum).",
  marge:
    "Omzet/budget minus inkoopkosten en 20% overhead, voor de huidige selectie.",
} as const;
