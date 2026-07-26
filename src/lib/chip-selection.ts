/**
 * Selection logic for tap-to-toggle chips.
 *
 * Kept pure and separate from the component so it can be tested without a DOM.
 * Selection order is preserved deliberately: a taster's first-named aroma is
 * meaningful, and re-sorting under them as they tap is disorienting.
 */
export function toggleChip(
  selected: readonly string[],
  value: string,
  max?: number,
): string[] {
  if (!value || value.trim() === '') return [...selected]
  const idx = selected.indexOf(value)
  if (idx >= 0) {
    // Removal is always allowed, even when already at/over `max`.
    return selected.filter((v) => v !== value)
  }
  if (typeof max === 'number' && selected.length >= max) return [...selected]
  return [...selected, value]
}
