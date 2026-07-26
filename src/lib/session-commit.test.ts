import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { summariseCommit } from './session-commit'

describe('summariseCommit', () => {
  it('is ok when every attempted part succeeded', () => {
    assert.deepEqual(summariseCommit({ guess: 'ok', review: 'ok' }), {
      ok: true,
      message: 'Sparat',
    })
  })

  it('is ok when a part was legitimately skipped', () => {
    assert.deepEqual(summariseCommit({ guess: 'skipped', review: 'ok' }), {
      ok: true,
      message: 'Sparat',
    })
  })

  it('is ok when both parts were skipped — nothing to save is not an error', () => {
    assert.equal(summariseCommit({ guess: 'skipped', review: 'skipped' }).ok, true)
  })

  it('names the guess when only the guess failed', () => {
    const r = summariseCommit({ guess: 'failed', review: 'ok' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Gissningen kunde inte sparas')
  })

  it('names the note when only the note failed', () => {
    const r = summariseCommit({ guess: 'ok', review: 'failed' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Smaknoteringen kunde inte sparas')
  })

  it('reports both when both failed', () => {
    const r = summariseCommit({ guess: 'failed', review: 'failed' })
    assert.equal(r.ok, false)
    assert.equal(r.message, 'Inget kunde sparas')
  })
})
