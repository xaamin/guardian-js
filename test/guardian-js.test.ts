import { Guardian, Gate, User, GuardianGate, UserInterface } from '../src/index'

interface Post { authorId: number; title: string }
interface Comment { postId: number; body: string }

// ─── Fixtures ───────────────────────────────────────────────────────────────

const userWithObjectSyntax = {
  roles: [{ role: 'admin' }, { role: 'editor' }],
  permissions: [
    { permission: 'edit-posts', granted: true },
    { permission: 'delete-posts', granted: false },
  ],
}

const userWithArraySyntax = {
  roles: ['admin', 'editor'],
  permissions: ['edit-posts'],
}

const userWithMixedSyntax = {
  roles: ['admin', { role: 'moderator', permissions: ['moderate-comments'] }],
  permissions: [{ permission: 'edit-posts', granted: true }],
}

const userWithRolePermissions = {
  roles: [{ role: 'editor', permissions: ['publish-posts', 'edit-posts'] }],
  permissions: [],
}

// ─── User: role checks ───────────────────────────────────────────────────────

describe('User: role checks', () => {
  it('is() with object syntax', () => {
    const user = new User(userWithObjectSyntax)
    expect(user.is('admin')).toBe(true)
    expect(user.is('viewer')).toBe(false)
  })

  it('is() with array syntax', () => {
    const user = new User(userWithArraySyntax)
    expect(user.is('admin')).toBe(true)
    expect(user.is('viewer')).toBe(false)
  })

  it('is() with array of roles argument', () => {
    const user = new User(userWithArraySyntax)
    expect(user.is(['admin', 'viewer'])).toBe(true)
    expect(user.is(['viewer', 'guest'])).toBe(false)
  })

  it('isNot()', () => {
    const user = new User(userWithArraySyntax)
    expect(user.isNot('viewer')).toBe(true)
    expect(user.isNot('admin')).toBe(false)
  })

  it('isAny()', () => {
    const user = new User(userWithArraySyntax)
    expect(user.isAny(['viewer', 'admin'])).toBe(true)
    expect(user.isAny(['viewer', 'guest'])).toBe(false)
  })

  it('isAll()', () => {
    const user = new User(userWithArraySyntax)
    expect(user.isAll(['admin', 'editor'])).toBe(true)
    expect(user.isAll(['admin', 'viewer'])).toBe(false)
  })
})

// ─── User: permission checks ─────────────────────────────────────────────────

describe('User: permission checks (direct)', () => {
  it('can() with object syntax — granted=true allows', () => {
    const user = new User(userWithObjectSyntax)
    expect(user.can('edit-posts')).toBe(true)
  })

  it('can() with object syntax — granted=false denies', () => {
    const user = new User(userWithObjectSyntax)
    expect(user.can('delete-posts')).toBe(false)
  })

  it('can() with array syntax — string permissions are granted by default', () => {
    const user = new User(userWithArraySyntax)
    expect(user.can('edit-posts')).toBe(true)
    expect(user.can('delete-posts')).toBe(false)
  })

  it('can() with array of abilities argument', () => {
    const user = new User(userWithObjectSyntax)
    expect(user.can(['edit-posts', 'delete-posts'])).toBe(true)
    expect(user.can(['delete-posts', 'write-posts'])).toBe(false)
  })

  it('cannot()', () => {
    const user = new User(userWithObjectSyntax)
    expect(user.cannot('delete-posts')).toBe(true)
    expect(user.cannot('edit-posts')).toBe(false)
  })

  it('hasPermission()', () => {
    const user = new User(userWithArraySyntax)
    expect(user.hasPermission('edit-posts')).toBe(true)
    expect(user.hasPermission('delete-posts')).toBe(false)
  })

  it('hasAnyPermission()', () => {
    const user = new User(userWithArraySyntax)
    expect(user.hasAnyPermission(['edit-posts', 'delete-posts'])).toBe(true)
    expect(user.hasAnyPermission(['delete-posts', 'write-posts'])).toBe(false)
  })

  it('hasAllPermissions()', () => {
    const user = new User({ roles: [], permissions: ['edit-posts', 'publish-posts'] })
    expect(user.hasAllPermissions(['edit-posts', 'publish-posts'])).toBe(true)
    expect(user.hasAllPermissions(['edit-posts', 'delete-posts'])).toBe(false)
  })
})

// ─── User: role-based permissions ────────────────────────────────────────────

describe('User: role-based permissions', () => {
  it('can() inherits permissions from roles', () => {
    const user = new User(userWithRolePermissions)
    expect(user.can('publish-posts')).toBe(true)
    expect(user.can('edit-posts')).toBe(true)
    expect(user.can('delete-posts')).toBe(false)
  })

  it('direct permission overrides role permission when granted=false', () => {
    const user = new User({
      roles: [{ role: 'editor', permissions: ['edit-posts'] }],
      permissions: [{ permission: 'edit-posts', granted: false }],
    })
    expect(user.can('edit-posts')).toBe(false)
  })

  it('mixed syntax — string role with permissions array', () => {
    const user = new User(userWithMixedSyntax)
    expect(user.can('moderate-comments')).toBe(true)
    expect(user.can('edit-posts')).toBe(true)
  })
})

// ─── User: normalization edge cases ──────────────────────────────────────────

describe('User: normalization', () => {
  it('getRoles() normalizes string roles to objects', () => {
    const user = new User(userWithArraySyntax)
    const roles = user.getRoles()
    expect(roles).toEqual([{ role: 'admin' }, { role: 'editor' }])
  })

  it('getPermissions() normalizes string permissions to objects with granted=true', () => {
    const user = new User(userWithArraySyntax)
    const permissions = user.getPermissions()
    expect(permissions).toEqual([{ permission: 'edit-posts', granted: true }])
  })

  it('can() falls back to direct permissions when roles key is absent', () => {
    const user = new User({ permissions: ['edit-posts'] })
    expect(user.can('edit-posts')).toBe(true)
    expect(user.can('delete-posts')).toBe(false)
  })

  it('getData() throws when attributes is falsy', () => {
    const user = new User(null)
    expect(() => user.getData()).toThrow('Properties not defined for current user')
  })

  it('getRoles() throws when roles missing', () => {
    const user = new User({ permissions: [] })
    expect(() => user.getRoles()).toThrow('Roles not implemented')
  })

  it('getPermissions() throws when permissions missing', () => {
    const user = new User({ roles: [] })
    expect(() => user.getPermissions()).toThrow('Permissions not implemented')
  })
})

// ─── GuardianGate: basic setup ────────────────────────────────────────────

describe('GuardianGate: setup', () => {
  it('setUser and getUser work', () => {
    const guardian = new GuardianGate()
    guardian.setUser(userWithArraySyntax)
    expect(guardian.getUser()).toBeInstanceOf(User)
  })

  it('isUserLoggedIn()', () => {
    const guardian = new GuardianGate()
    expect(guardian.isUserLoggedIn()).toBe(false)
    guardian.setUser(userWithArraySyntax)
    expect(guardian.isUserLoggedIn()).toBe(true)
  })

  it('getUser() throws when no user set', () => {
    const guardian = new GuardianGate()
    expect(() => guardian.getUser()).toThrow('No user logged in')
  })

  it('setUser() throws for invalid user object', () => {
    const guardian = new GuardianGate()
    expect(() => guardian.setUser({ name: 'Alice' } as unknown as UserInterface)).toThrow()
  })

  it('forUser() creates a scoped guardian with same policies', () => {
    const guardian = new GuardianGate()
    guardian.define('edit-post', (user: User) => user.is('admin'))
    const scoped = guardian.forUser(userWithArraySyntax)
    expect(scoped.allows('edit-post')).toBe(true)
  })

  it('proxy forwards unknown properties to the User', () => {
    const guardian = new GuardianGate()
    guardian.setUser({ roles: [], permissions: [], name: 'Alice' })
    expect((guardian as unknown as Record<string, unknown>).name).toBe('Alice')
  })
})

// ─── GuardianGate: allows / denies / cannot ───────────────────────────────

describe('GuardianGate: allows, denies, cannot', () => {
  function makeGuardian(userData = userWithObjectSyntax) {
    const g = new GuardianGate()
    g.setUser(userData)
    return g
  }

  it('allows() — permission present and granted', () => {
    const g = makeGuardian()
    expect(g.allows('edit-posts')).toBe(true)
  })

  it('allows() — permission not granted', () => {
    const g = makeGuardian()
    expect(g.allows('delete-posts')).toBe(false)
  })

  it('allows() — permission not present', () => {
    const g = makeGuardian()
    expect(g.allows('write-posts')).toBe(false)
  })

  it('allows() — no policy defined, falls back to ACL check', () => {
    const g = new GuardianGate()
    g.setUser({ roles: [], permissions: ['read'] })
    expect(g.allows('read')).toBe(true)
    expect(g.allows('write')).toBe(false)
  })

  it('denies() is inverse of allows()', () => {
    const g = makeGuardian()
    expect(g.denies('edit-posts')).toBe(false)
    expect(g.denies('delete-posts')).toBe(true)
  })

  it('cannot() is alias for denies()', () => {
    const g = makeGuardian()
    expect(g.cannot('edit-posts')).toBe(false)
    expect(g.cannot('delete-posts')).toBe(true)
  })
})

// ─── GuardianGate: any / every ────────────────────────────────────────────

describe('GuardianGate: any / every', () => {
  function makeGuardian() {
    const g = new GuardianGate()
    g.setUser({ roles: [], permissions: ['read', 'write'] })
    return g
  }

  it('any() — returns true when at least one ability allowed', () => {
    const g = makeGuardian()
    expect(g.any(['read', 'delete'])).toBe(true)
  })

  it('any() — returns false when none allowed', () => {
    const g = makeGuardian()
    expect(g.any(['delete', 'publish'])).toBe(false)
  })

  it('every() — returns true when all allowed', () => {
    const g = makeGuardian()
    expect(g.every(['read', 'write'])).toBe(true)
  })

  it('every() — returns false when one is denied', () => {
    const g = makeGuardian()
    expect(g.every(['read', 'delete'])).toBe(false)
  })
})

// ─── GuardianGate: custom policies ────────────────────────────────────────

describe('GuardianGate: custom policies', () => {
  it('define() with typed single resource arg', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)

    g.define('post.update', (user: User, post: Post) =>
      user.is('admin') && post.authorId === 1
    )

    expect(g.allows('post.update', { authorId: 1, title: 'Hello' })).toBe(true)
    expect(g.allows('post.update', { authorId: 2, title: 'Hello' })).toBe(false)
  })

  it('define() with typed multiple args', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)

    g.define('post.delete', (user: User, post: Post, reason: string) =>
      user.is('admin') && post.authorId === 1 && reason.length > 0
    )

    expect(g.allows('post.delete', { authorId: 1, title: 'Hello' }, 'spam')).toBe(true)
    expect(g.allows('post.delete', { authorId: 1, title: 'Hello' }, '')).toBe(false)
  })

  it('denies() / cannot() with typed resource arg', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)

    g.define('comment.moderate', (user: User, comment: Comment) =>
      user.is('admin') && comment.postId > 0
    )

    expect(g.denies('comment.moderate', { postId: 1, body: 'test' })).toBe(false)
    expect(g.cannot('comment.moderate', { postId: 0, body: 'test' })).toBe(true)
  })

  it('isDefined() reports policy existence', () => {
    const g = new GuardianGate()
    g.define('some-policy', () => true)
    expect(g.isDefined('some-policy')).toBe(true)
    expect(g.isDefined('other-policy')).toBe(false)
  })

  it('getPolicies() returns registered policies', () => {
    const g = new GuardianGate()
    g.define('some-policy', () => true)
    expect(g.getPolicies()['some-policy']).toBeDefined()
  })
})

// ─── GuardianGate: before / after hooks ───────────────────────────────────

describe('GuardianGate: before / after hooks', () => {
  it('before() — returning true short-circuits policy and ACL check', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)
    g.before(() => true)
    expect(g.allows('delete-posts')).toBe(true)
  })

  it('before() — returning undefined falls through to normal checks', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)
    g.before(() => undefined)
    expect(g.allows('edit-posts')).toBe(true)
    expect(g.allows('delete-posts')).toBe(false)
  })

  it('after() — callback is called with final result', () => {
    const g = new GuardianGate()
    g.setUser(userWithObjectSyntax)

    const spy = vi.fn()
    g.after(spy)

    g.allows('edit-posts')
    expect(spy).toHaveBeenCalledWith(expect.any(User), 'edit-posts', true)
  })

  it('hooks are isolated between instances', () => {
    const g1 = new GuardianGate()
    g1.setUser(userWithObjectSyntax)
    g1.before(() => true)

    const g2 = new GuardianGate()
    g2.setUser(userWithObjectSyntax)

    expect(g1.allows('delete-posts')).toBe(true)
    expect(g2.allows('delete-posts')).toBe(false)
  })
})

// ─── Guardian Facade ─────────────────────────────────────────────────────────

describe('Guardian Facade', () => {
  beforeEach(() => Guardian.reset())

  it('Gate is an alias for Guardian', () => {
    expect(Gate).toBe(Guardian)
  })

  it('static calls delegate to the internal instance', () => {
    Guardian.setUser(userWithArraySyntax)
    expect(Guardian.allows('edit-posts')).toBe(true)
    expect(Guardian.allows('delete-posts')).toBe(false)
  })

  it('reset() clears user and policies between tests', () => {
    Guardian.setUser(userWithArraySyntax)
    Guardian.define('some-policy', () => true)

    Guardian.reset()

    expect(Guardian.isUserLoggedIn()).toBe(false)
    expect(Guardian.isDefined('some-policy')).toBe(false)
  })

  it('swap() replaces the internal instance', () => {
    const fake = new GuardianGate()
    fake.setUser({ roles: ['admin'], permissions: ['super-power'] })

    Guardian.swap(fake)

    expect(Guardian.allows('super-power')).toBe(true)
    expect(Guardian.instance()).toBe(fake)
  })

  it('instance() returns the current GuardianGate', () => {
    expect(Guardian.instance()).toBeInstanceOf(GuardianGate)
  })

  it('define() and isDefined() work via facade', () => {
    Guardian.setUser(userWithObjectSyntax)
    Guardian.define('post.update', (user: User, post: Post) =>
      user.is('admin') && post.authorId === 1
    )

    expect(Guardian.isDefined('post.update')).toBe(true)
    expect(Guardian.allows('post.update', { authorId: 1, title: 'Hello' })).toBe(true)
    expect(Guardian.allows('post.update', { authorId: 2, title: 'Hello' })).toBe(false)
  })

  it('before() — hook is scoped to the current instance', () => {
    Guardian.setUser(userWithObjectSyntax)
    Guardian.before(() => true)
    expect(Guardian.allows('delete-posts')).toBe(true)

    Guardian.reset()
    Guardian.setUser(userWithObjectSyntax)
    expect(Guardian.allows('delete-posts')).toBe(false)
  })

  it('after() — callback is called with final result', () => {
    Guardian.setUser(userWithObjectSyntax)

    const spy = vi.fn()
    Guardian.after(spy)

    Guardian.allows('edit-posts')
    expect(spy).toHaveBeenCalledWith(expect.any(User), 'edit-posts', true)
  })

  it('forUser() returns a scoped GuardianGate instance', () => {
    Guardian.define('edit-post', (user: User) => user.is('admin'))
    const scoped = Guardian.forUser(userWithArraySyntax)

    expect(scoped).toBeInstanceOf(GuardianGate)
    expect(scoped.allows('edit-post')).toBe(true)
  })

  it('denies() and cannot() work via facade', () => {
    Guardian.setUser(userWithObjectSyntax)
    expect(Guardian.denies('delete-posts')).toBe(true)
    expect(Guardian.cannot('delete-posts')).toBe(true)
    expect(Guardian.cannot('edit-posts')).toBe(false)
  })

  it('any() and every() work via facade', () => {
    Guardian.setUser({ roles: [], permissions: ['read', 'write'] })
    expect(Guardian.any(['read', 'delete'])).toBe(true)
    expect(Guardian.every(['read', 'write'])).toBe(true)
    expect(Guardian.every(['read', 'delete'])).toBe(false)
  })
})
