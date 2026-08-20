import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTastingRedirect } from './tasting-route-redirects'

test('/mina-provningar redirects to the renamed courses route', () => {
  assert.deepEqual(resolveTastingRedirect('/mina-provningar'), {
    pathname: '/mina-vinkvallar',
    status: 301,
  })
})

test('/mina-provningar/planer redirects to the merged gallery, filtered to Mina', () => {
  assert.deepEqual(resolveTastingRedirect('/mina-provningar/planer'), {
    pathname: '/provningsmallar',
    setParams: { visa: 'mina' },
    status: 301,
  })
})

test('a trailing slash matches the same rule', () => {
  assert.equal(resolveTastingRedirect('/mina-provningar/')?.pathname, '/mina-vinkvallar')
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/')?.pathname, '/provningsmallar')
})

// THE regression this module exists for. A prefix match here takes down every
// live tasting session and every guest recap link already handed out.
test('never matches a live session, its shopping list, or a recap', () => {
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/123'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/planer/123/handlingslista'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/historik'), null)
  assert.equal(resolveTastingRedirect('/mina-provningar/historik/45'), null)
})

test('never matches the redirect targets — no loops', () => {
  assert.equal(resolveTastingRedirect('/mina-vinkvallar'), null)
  assert.equal(resolveTastingRedirect('/provningsmallar'), null)
})

test('unrelated paths are untouched', () => {
  assert.equal(resolveTastingRedirect('/'), null)
  assert.equal(resolveTastingRedirect('/vinkvallen'), null)
  assert.equal(resolveTastingRedirect('/mina-provningarx'), null)
})

// The bare /vinprovningar root is an ACQUISITION path — 165 people/90d arrive
// from Instagram, Google and TikTok searching for wine tastings, and until
// 2026-07-27 every one of them was 301'd to the video-course catalogue.
test('the bare /vinprovningar root goes to the tastings gallery', () => {
  assert.deepEqual(resolveTastingRedirect('/vinprovningar'), {
    pathname: '/provningsmallar',
    status: 301,
  })
  assert.equal(resolveTastingRedirect('/vinprovningar/')?.pathname, '/provningsmallar')
})

// Sub-paths are genuine old COURSE detail URLs from before the collection was
// renamed. They keep going to /vinkvallen/<slug>, which middleware handles with
// a prefix rule — so this module must NOT claim them.
test('/vinprovningar sub-paths are left to the legacy course rule', () => {
  assert.equal(resolveTastingRedirect('/vinprovningar/grunderna-i-vin'), null)
  assert.equal(resolveTastingRedirect('/vinprovningar/nagon-kurs/recension'), null)
})
