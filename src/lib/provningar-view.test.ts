import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProvningarHref,
  parseProvningarFilters,
  viewIncludesPlans,
  viewIncludesTemplates,
  type ProvningarFilterState,
} from './provningar-view'

const BASE: ProvningarFilterState = {
  view: 'alla',
  tag: null,
  access: null,
  status: null,
  showArchived: false,
}

test('an absent or unknown visa param means Alla', () => {
  assert.equal(parseProvningarFilters({}).view, 'alla')
  assert.equal(parseProvningarFilters({ visa: 'nonsense' }).view, 'alla')
  assert.equal(parseProvningarFilters({ visa: 'mina' }).view, 'mina')
  assert.equal(parseProvningarFilters({ visa: 'mallar' }).view, 'mallar')
})

test('parses the pre-existing params alongside it', () => {
  const s = parseProvningarFilters({
    visa: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
    showArchived: '1',
  })
  assert.deepEqual(s, {
    view: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
    showArchived: true,
  })
})

test('Alla serialises to a bare path', () => {
  assert.equal(buildProvningarHref(BASE, {}), '/provningsmallar')
})

test('switching view keeps the path clean', () => {
  assert.equal(buildProvningarHref(BASE, { view: 'mina' }), '/provningsmallar?visa=mina')
})

// The regression this module exists for: clicking a secondary filter must not
// throw the user back to Alla.
test('changing access preserves the active view and tag', () => {
  const current: ProvningarFilterState = {
    ...BASE,
    view: 'mallar',
    tag: 'Bourgogne',
  }
  assert.equal(
    buildProvningarHref(current, { access: 'paid' }),
    '/provningsmallar?visa=mallar&tag=Bourgogne&access=paid',
  )
})

test('template-only filters are dropped when switching to Mina', () => {
  const current: ProvningarFilterState = {
    ...BASE,
    view: 'mallar',
    tag: 'Bourgogne',
    access: 'paid',
    status: 'draft',
  }
  assert.equal(buildProvningarHref(current, { view: 'mina' }), '/provningsmallar?visa=mina')
})

test('the plan-only filter is dropped when leaving Mina', () => {
  const current: ProvningarFilterState = { ...BASE, view: 'mina', showArchived: true }
  assert.equal(buildProvningarHref(current, { view: 'mallar' }), '/provningsmallar?visa=mallar')
  assert.equal(
    buildProvningarHref(current, { showArchived: true }),
    '/provningsmallar?visa=mina&showArchived=1',
  )
})

test('tag values are URL-encoded', () => {
  assert.equal(
    buildProvningarHref(BASE, { tag: 'Rhône & Syrah' }),
    '/provningsmallar?tag=Rh%C3%B4ne%20%26%20Syrah',
  )
})

test('view membership predicates', () => {
  assert.equal(viewIncludesPlans('alla'), true)
  assert.equal(viewIncludesPlans('mina'), true)
  assert.equal(viewIncludesPlans('mallar'), false)
  assert.equal(viewIncludesTemplates('alla'), true)
  assert.equal(viewIncludesTemplates('mina'), false)
  assert.equal(viewIncludesTemplates('mallar'), true)
})
