/**
 * Swedish copy strings for the session recap narrative footer.
 * Centralised here so they're easy to find and refine — and so the recap
 * component stays focused on layout, not string templating.
 */

/**
 * Round to one decimal for the user-facing diff. `0.84` → `0.8`.
 */
function fmtDiff(n: number): string {
  return n.toFixed(1).replace('.', ',')
}

/**
 * Build a sentence about the viewer's rating diff vs the group average.
 * Returns `null` when the diff is too small to be interesting.
 */
export function ratingDiffSentence(myRating: number, groupAvg: number): string | null {
  const diff = myRating - groupAvg
  if (Math.abs(diff) < 0.5) return null
  const abs = fmtDiff(Math.abs(diff))
  return diff > 0
    ? `Du gav ${abs} över snittet.`
    : `Du gav ${abs} under snittet.`
}

/**
 * Build a sentence about flavours the viewer noted that the group didn't
 * surface in their top set. Caps at the first two unique picks to keep it
 * tight. Returns `null` when there's nothing surprising to say.
 */
export function uniqueFlavoursSentence(
  myFlavours: ReadonlyArray<string>,
  groupTopLabels: ReadonlyArray<string>,
): string | null {
  if (myFlavours.length === 0) return null
  const groupSet = new Set(groupTopLabels.map((s) => s.toLocaleLowerCase('sv')))
  const unique = myFlavours.filter(
    (f) => !groupSet.has(String(f).toLocaleLowerCase('sv')),
  )
  if (unique.length === 0) return null
  const first = unique[0]
  if (unique.length === 1) {
    return `Du noterade ${first} som gruppen inte plockade upp.`
  }
  const second = unique[1]
  return `Du noterade ${first} och ${second} som gruppen inte plockade upp.`
}

/**
 * The "no review for this wine" placeholder for the compare column.
 */
export const NO_REVIEW_PLACEHOLDER = 'Du recenserade inte det här vinet'
