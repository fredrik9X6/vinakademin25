import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBreadcrumbTrail } from './breadcrumb-trail'

const labels = (pathname: string, extra = {}) =>
  buildBreadcrumbTrail({ pathname, ...extra }).map((c) => c.label)

test('the gallery is labelled Provningar', () => {
  assert.deepEqual(labels('/provningsmallar'), ['Hem', 'Provningar'])
})

// The reported defect: creating your own tasting used to breadcrumb under a
// different product entirely.
test('creating a tasting sits under Provningar', () => {
  assert.deepEqual(labels('/skapa-provning'), ['Hem', 'Provningar', 'Skapa egen'])
})

test('editing an existing draft drops the numeric id but keeps the parent', () => {
  assert.deepEqual(labels('/skapa-provning/42'), ['Hem', 'Provningar', 'Skapa egen'])
})

test('nothing under /mina-provningar says Vinkurser', () => {
  for (const p of ['/mina-provningar/historik', '/mina-provningar/planer/7']) {
    assert.ok(
      !labels(p).some((l) => l.includes('Vinkurser')),
      `${p} still breadcrumbs to Vinkurser`,
    )
  }
  assert.deepEqual(labels('/mina-provningar/historik'), ['Hem', 'Mina provningar', 'Historik'])
})

test('the moved courses page keeps its own name', () => {
  assert.deepEqual(labels('/mina-vinkurser'), ['Hem', 'Mina vinkurser'])
})

test('the last crumb is the current page', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/skapa-provning' })
  assert.equal(trail[trail.length - 1].isCurrentPage, true)
  assert.equal(trail[0].isCurrentPage, false)
  // The injected parent is a link, not the current page.
  assert.equal(trail[1].isCurrentPage, false)
  assert.equal(trail[1].href, '/provningsmallar')
})

test('a course lesson still appends its resolved title', () => {
  assert.deepEqual(
    labels('/vinkurser/grunderna', {
      resolvedTitle: 'Grunderna i vin',
      itemKind: 'lesson',
      itemId: '9',
      resolvedItemTitle: 'Syra och sötma',
    }),
    ['Hem', 'Vinkurser', 'Grunderna i vin', 'Syra och sötma'],
  )
})

test('the homepage has no trail', () => {
  assert.deepEqual(buildBreadcrumbTrail({ pathname: '/' }), [])
})

// The fix for the "Mina provningar" crumb pointing at the wrong product:
// its href must match where /mina-provningar/planer itself 301s to, not the
// accumulated (now-redirected-elsewhere) /mina-provningar path.
test('the "Mina provningar" crumb links to the merged surface, not the video-courses redirect', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/mina-provningar/historik' })
  const crumb = trail.find((c) => c.label === 'Mina provningar')
  assert.equal(crumb?.href, '/provningsmallar?visa=mina')
})

test('the override also applies deeper under the old prefix, e.g. a live plan session', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/mina-provningar/planer/7' })
  const crumb = trail.find((c) => c.label === 'Mina provningar')
  assert.equal(crumb?.href, '/provningsmallar?visa=mina')
})

test('a section without an override still gets its accumulated path', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/vinkurser/grunderna' })
  const crumb = trail.find((c) => c.label === 'Vinkurser')
  assert.equal(crumb?.href, '/vinkurser')
})

test('the /skapa-provning parent crumb still has href /provningsmallar', () => {
  const trail = buildBreadcrumbTrail({ pathname: '/skapa-provning' })
  const crumb = trail.find((c) => c.label === 'Provningar')
  assert.equal(crumb?.href, '/provningsmallar')
})
