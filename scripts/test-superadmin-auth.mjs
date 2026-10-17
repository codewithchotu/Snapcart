import { test, describe } from 'node:test'
import assert from 'node:assert'
import { isSuperAdmin } from '../src/lib/roles.ts'

describe('Super Admin Role & Authorization Verification Suite', () => {

  describe('1. isSuperAdmin pure role helper', () => {
    test('Grants access when user.role is superAdmin', () => {
      assert.strictEqual(isSuperAdmin({ role: 'superAdmin', email: 'custom@example.com' }), true)
    })

    test('Grants access when user.email matches configured superAdmin email (case-insensitive and trimmed)', () => {
      assert.strictEqual(isSuperAdmin({ role: 'user', email: 'mo0322975@gmail.com' }), true)
      assert.strictEqual(isSuperAdmin({ role: 'admin', email: 'MO0322975@GMAIL.COM' }), true)
      assert.strictEqual(isSuperAdmin({ role: null, email: '  mo0322975@gmail.com  ' }), true)
    })

    test('Denies access for ordinary user', () => {
      assert.strictEqual(isSuperAdmin({ role: 'user', email: 'customer@gmail.com' }), false)
    })

    test('Denies access for delivery boy', () => {
      assert.strictEqual(isSuperAdmin({ role: 'deliveryBoy', email: 'rider@gmail.com' }), false)
    })

    test('Denies access for normal Kirana store admin without superAdmin rights', () => {
      assert.strictEqual(isSuperAdmin({ role: 'admin', email: 'storeowner@gmail.com' }), false)
    })

    test('Denies access when user is null or undefined', () => {
      assert.strictEqual(isSuperAdmin(null), false)
      assert.strictEqual(isSuperAdmin(undefined), false)
      assert.strictEqual(isSuperAdmin({}), false)
    })
  })

  describe('2. Middleware / Proxy Route Guard Simulation', () => {
    function simulateProxyGuard(pathname, session) {
      if (!session) {
        if (pathname.startsWith('/api/')) {
          return { status: 401, action: 'json_error' }
        }
        return { status: 307, action: 'redirect_login' }
      }

      const role = session.user?.role
      const isSuper = isSuperAdmin(session.user)

      if (role) {
        if (pathname.startsWith('/user') && role !== 'user' && !isSuper) {
          return { status: 307, action: 'redirect_unauthorized' }
        }
        if (pathname.startsWith('/delivery') && role !== 'deliveryBoy' && !isSuper) {
          return { status: 307, action: 'redirect_unauthorized' }
        }
        if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'superAdmin' && !isSuper) {
          return { status: 307, action: 'redirect_unauthorized' }
        }
      }

      return { status: 200, action: 'next' }
    }

    test('Super Admin accessing /admin/stores is allowed', () => {
      const res = simulateProxyGuard('/admin/stores', {
        user: { id: '6ac52d1f2fad540645c22f58', role: 'superAdmin', email: 'mo0322975@gmail.com' }
      })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.action, 'next')
    })

    test('Super Admin with stale role="user" is still allowed to access /admin/stores via verified email', () => {
      const res = simulateProxyGuard('/admin/stores', {
        user: { id: '6ac52d1f2fad540645c22f58', role: 'user', email: 'mo0322975@gmail.com' }
      })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.action, 'next')
    })

    test('Kirana store admin accessing /admin/stores is allowed', () => {
      const res = simulateProxyGuard('/admin/stores', {
        user: { id: '6ac8682997f96b072e5a5b40', role: 'admin', email: 'lakshshastry26@gmail.com' }
      })
      assert.strictEqual(res.status, 200)
      assert.strictEqual(res.action, 'next')
    })

    test('Regular customer attempting /admin/stores is blocked with redirect to /unauthorized', () => {
      const res = simulateProxyGuard('/admin/stores', {
        user: { id: '6ac52d6a2fad540645c22f65', role: 'user', email: 'customer@gmail.com' }
      })
      assert.strictEqual(res.status, 307)
      assert.strictEqual(res.action, 'redirect_unauthorized')
    })

    test('Delivery boy attempting /admin/stores is blocked with redirect to /unauthorized', () => {
      const res = simulateProxyGuard('/admin/stores', {
        user: { id: '6ac532302fad540645c22f9d', role: 'deliveryBoy', email: 'driver@gmail.com' }
      })
      assert.strictEqual(res.status, 307)
      assert.strictEqual(res.action, 'redirect_unauthorized')
    })

    test('Unauthenticated visitor attempting /admin/stores is redirected to /login', () => {
      const res = simulateProxyGuard('/admin/stores', null)
      assert.strictEqual(res.status, 307)
      assert.strictEqual(res.action, 'redirect_login')
    })

    test('Unauthenticated visitor calling /api/admin/stores receives 401 Unauthorized', () => {
      const res = simulateProxyGuard('/api/admin/stores', null)
      assert.strictEqual(res.status, 401)
      assert.strictEqual(res.action, 'json_error')
    })
  })

  describe('3. API Endpoint Authorization Simulation (Create & Assign Admin)', () => {
    function simulateCreateStoreAuth(session) {
      if (!session?.user) {
        return { status: 401, message: 'Unauthorized' }
      }
      if (!isSuperAdmin(session.user)) {
        return { status: 403, message: 'Only Super Admin can register Kirana stores.' }
      }
      return { status: 201, message: 'Store registered successfully' }
    }

    test('Unauthenticated user receives 401 (not 403)', () => {
      const res = simulateCreateStoreAuth(null)
      assert.strictEqual(res.status, 401)
      assert.strictEqual(res.message, 'Unauthorized')
    })

    test('Regular admin receives 403 Forbidden for Super Admin store registration', () => {
      const res = simulateCreateStoreAuth({ user: { role: 'admin', email: 'kirana@example.com' } })
      assert.strictEqual(res.status, 403)
      assert.strictEqual(res.message, 'Only Super Admin can register Kirana stores.')
    })

    test('Regular customer receives 403 Forbidden for Super Admin store registration', () => {
      const res = simulateCreateStoreAuth({ user: { role: 'user', email: 'shopper@example.com' } })
      assert.strictEqual(res.status, 403)
    })

    test('Super Admin receives 201 Created', () => {
      const res = simulateCreateStoreAuth({ user: { role: 'superAdmin', email: 'mo0322975@gmail.com' } })
      assert.strictEqual(res.status, 201)
    })
  })
})
