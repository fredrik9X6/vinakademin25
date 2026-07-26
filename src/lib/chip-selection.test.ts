import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { toggleChip } from './chip-selection'

describe('toggleChip', () => {
  it('adds a value that is not selected', () => {
    assert.deepEqual(toggleChip([], 'Citrus'), ['Citrus'])
    assert.deepEqual(toggleChip(['Bär'], 'Citrus'), ['Bär', 'Citrus'])
  })

  it('removes a value that is already selected', () => {
    assert.deepEqual(toggleChip(['Bär', 'Citrus'], 'Bär'), ['Citrus'])
  })

  it('preserves the order the user selected in', () => {
    let s: string[] = []
    s = toggleChip(s, 'C')
    s = toggleChip(s, 'A')
    s = toggleChip(s, 'B')
    assert.deepEqual(s, ['C', 'A', 'B'])
  })

  it('does not mutate the input array', () => {
    const input = ['Bär']
    const out = toggleChip(input, 'Citrus')
    assert.deepEqual(input, ['Bär'])
    assert.notEqual(out, input)
  })

  it('ignores an add that would exceed max, but still allows removal', () => {
    assert.deepEqual(toggleChip(['A', 'B'], 'C', 2), ['A', 'B'])
    assert.deepEqual(toggleChip(['A', 'B'], 'A', 2), ['B'])
  })

  it('treats an absent max as unlimited', () => {
    assert.deepEqual(toggleChip(['A', 'B'], 'C'), ['A', 'B', 'C'])
  })

  it('is a no-op for a blank value', () => {
    assert.deepEqual(toggleChip(['A'], ''), ['A'])
    assert.deepEqual(toggleChip(['A'], '   '), ['A'])
  })
})
