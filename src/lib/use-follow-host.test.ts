import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldFollowHost, FOLLOW_IDLE_MS } from './use-follow-host'

describe('shouldFollowHost', () => {
  it('follows when the user has never interacted', () => {
    assert.equal(shouldFollowHost(null, 10_000), true)
  })

  it('follows when the last interaction is older than the idle window', () => {
    assert.equal(shouldFollowHost(0, FOLLOW_IDLE_MS + 1), true)
  })

  it('does not follow while the user is actively typing', () => {
    assert.equal(shouldFollowHost(0, 1_000), false)
  })

  it('treats exactly the idle window as still active (fails safe: no hijack)', () => {
    assert.equal(shouldFollowHost(0, FOLLOW_IDLE_MS), false)
  })
})
