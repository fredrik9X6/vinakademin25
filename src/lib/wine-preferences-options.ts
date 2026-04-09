/** Shared labels/values for wine preferences (aligned with Payload Users collection). */

export const WINE_STYLE_OPTIONS = [
  { value: 'light_red', label: 'Lätta röda viner' },
  { value: 'medium_red', label: 'Medeltunga röda viner' },
  { value: 'full_red', label: 'Fylliga röda viner' },
  { value: 'light_white', label: 'Lätta vita viner' },
  { value: 'full_white', label: 'Fylliga vita viner' },
  { value: 'sparkling', label: 'Mousserande viner' },
  { value: 'rose', label: 'Rosévin' },
  { value: 'sweet', label: 'Sött vin' },
  { value: 'fortified', label: 'Starkvin' },
  { value: 'natural', label: 'Naturvin' },
] as const

export const TASTING_EXPERIENCE_OPTIONS = [
  {
    value: 'Nybörjare',
    label: 'Nybörjare',
    description:
      'Vin är gott, men du känner ingen stor skillnad mellan viner — än.',
  },
  {
    value: 'Medel',
    label: 'Medel',
    description:
      'Du märker om det är lätt eller fylligt, och börjar hitta favoritdruvor.',
  },
  {
    value: 'Avancerad',
    label: 'Avancerad',
    description: 'Du pratar gärna om terroir, syra och fat — och menar det.',
  },
  {
    value: 'Expert',
    label: 'Expert',
    description:
      'Blindprovning är nästan sport, och du vet varför det smakar som det gör.',
  },
] as const

export const DISCOVERY_PREFERENCE_OPTIONS = [
  { value: 'new_grapes', label: 'Upptäck nya druvor' },
  { value: 'new_regions', label: 'Utforska nya regioner' },
  { value: 'price_ranges', label: 'Prova olika prisklasser' },
  { value: 'wine_culture', label: 'Lär dig om vinkultur' },
  { value: 'recommendations', label: 'Få personliga rekommendationer' },
  { value: 'virtual_tastings', label: 'Delta i virtuella provningar' },
] as const

export const PRICE_RANGE_OPTIONS = [
  { value: 'budget', label: 'Under 200 kr' },
  { value: 'mid', label: '200–500 kr' },
  { value: 'premium', label: '500–1000 kr' },
  { value: 'luxury', label: 'Över 1000 kr' },
] as const
