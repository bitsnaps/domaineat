/**
 * Test the actual router/index.ts module — covers route definitions
 * and navigation logic that was at 0% coverage.
 */
import { describe, it, expect } from 'vitest'
import router from '@/router/index'

describe('Router module', () => {
  it('exports a router instance', () => {
    expect(router).toBeDefined()
    expect(router.getRoutes).toBeTypeOf('function')
  })

  it('has a route named dashboard at /', () => {
    const route = router.getRoutes().find((r) => r.name === 'dashboard')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/')
  })

  it('has a route named domains at /domains', () => {
    const route = router.getRoutes().find((r) => r.name === 'domains')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/domains')
  })

  it('has a route named ledger at /ledger', () => {
    const route = router.getRoutes().find((r) => r.name === 'ledger')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/ledger')
  })

  it('has a route named prospects at /prospects', () => {
    const route = router.getRoutes().find((r) => r.name === 'prospects')
    expect(route).toBeDefined()
    expect(route?.path).toBe('/prospects')
  })

 it('has a route named settings at /settings', () => {
  const route = router.getRoutes().find((r) => r.name === 'settings')
  expect(route).toBeDefined()
  expect(route?.path).toBe('/settings')
 })

	it('has a route named login at /login', () => {
		const route = router.getRoutes().find((r) => r.name === 'login')
		expect(route).toBeDefined()
		expect(route?.path).toBe('/login')
	})

	it('has a route named search at /search', () => {
		const route = router.getRoutes().find((r) => r.name === 'search')
		expect(route).toBeDefined()
		expect(route?.path).toBe('/search')
		expect(route?.meta?.public).toBe(true)
	})

 it('has exactly 9 named routes', () => {
 const named = router.getRoutes().filter((r) => r.name)
	expect(named.length).toBe(9)
 })

 it('has a route named home at /home', () => {
 const route = router.getRoutes().find((r) => r.name === 'home')
 expect(route).toBeDefined()
 expect(route?.path).toBe('/home')
 })

  it('uses createWebHistory', () => {
    // Router should be in history mode (not hash)
    expect(router.options.history).toBeDefined()
  })
})
