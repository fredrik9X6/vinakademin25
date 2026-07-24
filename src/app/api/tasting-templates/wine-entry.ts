/**
 * Shared request-body wine-entry shape + projection for the tasting-template
 * create (POST) and update (PATCH) routes.
 *
 * The routes build `data.wines` explicitly (no body passthrough), so every
 * per-wine collection field MUST be mapped here — omissions are silently
 * dropped on save. That is exactly what happened to abv/servingTemp/
 * guestDescription/foodPairing (added to the collection 2026-06-16 but never
 * to the routes) and would have happened to the blind-answer fields.
 */

export type TemplateCustomWine = {
  name?: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
  systembolagetProductNumber?: string
  imageUrl?: string
}

export type TemplatePriceBucket =
  | '0_99'
  | '100_149'
  | '150_199'
  | '200_249'
  | '250_299'
  | '300_plus'

export type TemplateWineEntry = {
  libraryWine?: number
  customWine?: TemplateCustomWine
  pourOrder?: number
  hostNotes?: string
  abv?: number | null
  servingTemp?: string | null
  guestDescription?: string | null
  foodPairing?: string | null
  blindAnswerCountry?: string | null
  blindAnswerGrapes?: string[] | null
  blindAnswerPriceBucket?: TemplatePriceBucket | null
}

export function mapTemplateWineEntry(w: TemplateWineEntry, idx: number) {
  return {
    libraryWine: typeof w.libraryWine === 'number' ? w.libraryWine : null,
    customWine: w.customWine?.name?.trim() ? w.customWine : undefined,
    pourOrder: w.pourOrder ?? idx + 1,
    hostNotes: w.hostNotes ?? '',
    abv: typeof w.abv === 'number' ? w.abv : null,
    servingTemp: w.servingTemp ?? '',
    guestDescription: w.guestDescription ?? '',
    foodPairing: w.foodPairing ?? '',
    blindAnswerCountry: w.blindAnswerCountry ?? null,
    blindAnswerGrapes: Array.isArray(w.blindAnswerGrapes)
      ? w.blindAnswerGrapes.filter((g) => typeof g === 'string' && g.trim().length > 0)
      : [],
    blindAnswerPriceBucket: w.blindAnswerPriceBucket ?? null,
  }
}
