import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTemplateAccess } from './template-access'

test('admins see every template, gated or not', () => {
  assert.equal(
    resolveTemplateAccess({ role: 'admin', accessLevel: 'paid', isAuthenticated: true }),
    true,
  )
})

test('a public template is readable by an anonymous visitor', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: 'free', isAuthenticated: false }),
    true,
  )
})

test('a gated template is hidden from an anonymous visitor', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: 'paid', isAuthenticated: false }),
    false,
  )
})

test('any account unlocks a gated template — no purchase needed', () => {
  assert.equal(
    resolveTemplateAccess({ role: 'user', accessLevel: 'paid', isAuthenticated: true }),
    true,
  )
})

test('a missing accessLevel is treated as gated, not public', () => {
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: null, isAuthenticated: false }),
    false,
  )
  assert.equal(
    resolveTemplateAccess({ role: null, accessLevel: undefined, isAuthenticated: true }),
    true,
  )
})
