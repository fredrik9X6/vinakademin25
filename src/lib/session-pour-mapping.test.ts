import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveWineIdentityForPour } from './session-pour-mapping'

// A plan wine as it arrives from payload.findByID(..., { depth: 2 }).
const libraryWine = (pourOrder: number, id: number) => ({
  pourOrder,
  libraryWine: { id },
  customWine: null,
})

const customWine = (
  pourOrder: number,
  fields: Record<string, unknown>,
) => ({
  pourOrder,
  libraryWine: null,
  customWine: fields,
})

describe('resolveWineIdentityForPour', () => {
  it('resolves a library wine to its numeric id', () => {
    const wines = [libraryWine(1, 501), libraryWine(2, 502)]
    assert.deepEqual(resolveWineIdentityForPour(wines, 2), {
      wine: 502,
      customWine: null,
    })
  })

  it('accepts a bare numeric libraryWine relationship (depth 0)', () => {
    const wines = [{ pourOrder: 1, libraryWine: 777, customWine: null }]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: 777,
      customWine: null,
    })
  })

  it('resolves a custom wine to a snapshot carrying every persisted field', () => {
    const wines = [
      customWine(1, {
        name: 'Château Test',
        producer: 'Domaine Test',
        vintage: '2019',
        type: 'red',
        priceSek: 189,
        systembolagetProductNumber: '12345',
        systembolagetUrl: 'https://systembolaget.se/12345',
        imageUrl: 'https://example.com/a.png',
      }),
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: null,
      customWine: {
        name: 'Château Test',
        producer: 'Domaine Test',
        vintage: '2019',
        type: 'red',
        priceSek: 189,
        systembolagetProductNumber: '12345',
        systembolagetUrl: 'https://systembolaget.se/12345',
        imageUrl: 'https://example.com/a.png',
      },
    })
  })

  it('omits absent optional custom-wine fields rather than sending nulls', () => {
    const wines = [customWine(1, { name: 'Bara Namn' })]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: null,
      customWine: { name: 'Bara Namn' },
    })
  })

  it('falls back to array index when pourOrder is absent', () => {
    const wines = [
      { libraryWine: { id: 10 }, customWine: null },
      { libraryWine: { id: 20 }, customWine: null },
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 2), {
      wine: 20,
      customWine: null,
    })
  })

  it('returns null when the pour order is not in the plan', () => {
    assert.equal(resolveWineIdentityForPour([libraryWine(1, 501)], 9), null)
  })

  it('returns null for a custom wine with no usable name', () => {
    assert.equal(resolveWineIdentityForPour([customWine(1, { name: '   ' })], 1), null)
  })

  it('returns null for an entry with neither library nor custom wine', () => {
    assert.equal(
      resolveWineIdentityForPour([{ pourOrder: 1, libraryWine: null, customWine: null }], 1),
      null,
    )
  })

  it('returns null for an empty plan', () => {
    assert.equal(resolveWineIdentityForPour([], 1), null)
  })

  it('prefers the library wine when an entry somehow carries both', () => {
    const wines = [
      { pourOrder: 1, libraryWine: { id: 42 }, customWine: { name: 'Ignored' } },
    ]
    assert.deepEqual(resolveWineIdentityForPour(wines, 1), {
      wine: 42,
      customWine: null,
    })
  })
})
