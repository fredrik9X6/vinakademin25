// Shared shape + helpers for the richer per-wine info (abv / serving temp /
// guest description / food pairing). Used by both editor forms, the summary
// card chips, and the edit sheet.

export type WineExtraFields = {
  /** Alcohol %, null when unset. */
  abv: number | null
  servingTemp: string
  guestDescription: string
  foodPairing: string
}

export const EMPTY_EXTRA: WineExtraFields = {
  abv: null,
  servingTemp: '',
  guestDescription: '',
  foodPairing: '',
}

/** Hydrate WineExtraFields from a stored wine entry (loose-typed). */
export function extraFromStored(w: {
  abv?: number | null
  servingTemp?: string | null
  guestDescription?: string | null
  foodPairing?: string | null
}): WineExtraFields {
  return {
    abv: typeof w.abv === 'number' ? w.abv : null,
    servingTemp: w.servingTemp ?? '',
    guestDescription: w.guestDescription ?? '',
    foodPairing: w.foodPairing ?? '',
  }
}

export function hasFakta(x: Pick<WineExtraFields, 'abv' | 'servingTemp'>): boolean {
  return x.abv != null || x.servingTemp.trim().length > 0
}

export function hasGuestInfo(
  x: Pick<WineExtraFields, 'guestDescription' | 'foodPairing'>,
): boolean {
  return x.guestDescription.trim().length > 0 || x.foodPairing.trim().length > 0
}
