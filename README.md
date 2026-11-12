# Guardian

- [Installation](#installation)
- [Introduction](#introduction)
- [User interface](#user)
  - [String syntax](#string-syntax)
  - [Object syntax](#object-syntax)
  - [Mixed syntax](#mixed-syntax)
  - [Role-based permissions](#role-based-permissions)
  - [Extending User](#extending-user)
- [Setting a user](#set-user)
  - [setUser](#setuser)
  - [forUser](#foruser)
- [User API](#user-api)
  - [Role checks](#role-checks)
  - [Permission checks](#permission-checks)
- [Gates](#gates)
  - [Writing Gates](#writing-gates)
  - [Authorizing Actions](#authorizing-actions)
  - [ACL fallback](#acl-fallback)
  - [any / every](#any-every)
  - [Intercepting Gate Checks](#intercepting-gate-checks)
- [Multiple instances](#multiple-instances)
- [Testing](#testing)
- [API Reference](#api-reference)


<a name="installation"></a>
## Installation

```
npm install @xaamin/guardian
# or
yarn add @xaamin/guardian
```


<a name="introduction"></a>
## Introduction

Guardian is a simple way to authorize user actions. There are two ways to authorize:

- **ACL checks** — the user object carries roles and permissions; call `user.can()` or `Gate.allows()` directly against those.
- **Policy closures** — register a named closure with `Gate.define()` for resource-aware logic (e.g. "can this user edit _this_ post?").

Both approaches can be combined. `Gate` and `Guardian` are the same static facade and can be used interchangeably.


<a name="user"></a>
## User interface (the contract)

Any plain object satisfying `UserInterface` can represent a user:

```ts
import type { UserInterface } from '@xaamin/guardian'
```

```ts
interface UserInterface {
  roles: RoleInput[]
  permissions: PermissionInput[]
  [key: string]: unknown   // allows extra properties like id, name, email
}
```

<a name="string-syntax"></a>
### String syntax

The simplest form — string roles and permissions are all granted by default:

```ts
import type { UserInterface } from '@xaamin/guardian'

const user: UserInterface = {
  roles: ['admin', 'editor'],
  permissions: ['post.create', 'post.update'],
}
```

<a name="object-syntax"></a>
### Object syntax

Use objects to get the `granted` flag on individual permissions or to attach permissions to a role:

```ts
const user: UserInterface = {
  roles: [
    { role: 'admin' },
    { role: 'editor' },
  ],
  permissions: [
    { permission: 'post.create', granted: true },
    { permission: 'post.delete', granted: false },
  ],
}
```

<a name="mixed-syntax"></a>
### Mixed syntax

String and object entries can be combined freely in both arrays:

```ts
const user: UserInterface = {
  roles: ['admin', { role: 'editor' }],
  permissions: ['post.create', { permission: 'post.delete', granted: false }],
}
```

<a name="role-based-permissions"></a>
### Role-based permissions

Roles can carry a `permissions` array. Those permissions are inherited by the user automatically — without having to list them again under `permissions`:

```ts
const user: UserInterface = {
  roles: [
    { role: 'editor', permissions: ['post.create', 'post.update'] },
  ],
  permissions: [],   // role permissions are inherited automatically
}
```

**Direct permissions override role permissions.** This lets you revoke a role-granted permission for a specific user:

```ts
const user: UserInterface = {
  roles: [
    { role: 'editor', permissions: ['post.update'] },
  ],
  permissions: [
    { permission: 'post.update', granted: false },   // revokes the role grant
  ],
}
```

<a name="extending-user"></a>
### Extending User

Extend the base `User` class to add domain-specific helpers. Extra properties you pass in the attributes object are automatically forwarded through the proxy:

```ts
import { User } from '@xaamin/guardian'

class AppUser extends User {
  get fullName(): string {
    const { firstName, lastName } = this.getData() as { firstName: string; lastName: string }
    return `${firstName} ${lastName}`
  }

  isVerified(): boolean {
    return this.getData().emailVerified === true
  }
}

const user = new AppUser({
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  emailVerified: true,
  roles: ['editor'],
  permissions: ['post.create'],
})

user.fullName    // 'Jane Doe'
user.isVerified() // true
```


<a name="set-user"></a>
## Setting a user for authorization

<a name="setuser"></a>
### setUser

Set the active user on the global facade. Accepts a plain `UserInterface` object or a `User` instance:

```ts
import { Gate, User } from '@xaamin/guardian'

// From a plain object
Gate.setUser({
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  roles: ['admin', 'editor'],
  permissions: ['post.create'],
})

// From a User instance
const user = new User({
  id: 2,
  name: 'Bob',
  roles: [{ role: 'editor', permissions: ['post.update'] }],
  permissions: [{ permission: 'post.delete', granted: false }],
})

Gate.setUser(user)
```

`setUser()` returns the underlying gate instance so it can be chained:

```ts
Gate.setUser(user).allows('post.create')
```

<a name="foruser"></a>
### forUser

Returns a new, isolated `GuardianGate` scoped to a specific user. All registered policies are copied over. The global facade is not modified:

```ts
import { Gate } from '@xaamin/guardian'

const adminGate = Gate.forUser(adminUser)
const editorGate = Gate.forUser(editorUser)

adminGate.allows('post.delete')   // evaluated for adminUser
editorGate.allows('post.delete')  // evaluated for editorUser
```

This is useful when you need to authorize on behalf of multiple users in the same request (e.g. in an admin panel).


<a name="user-api"></a>
## User API

The `User` class (and any class extending it) exposes the following methods.

<a name="role-checks"></a>
### Role checks

```ts
import { User } from '@xaamin/guardian'

const user = new User({
  roles: ['admin', 'editor'],
  permissions: [],
})

// is() — string or string[]
user.is('admin')               // true
user.is('viewer')              // false
user.is(['admin', 'viewer'])   // true  (any match)

// isNot() — inverse of is()
user.isNot('viewer')           // true
user.isNot('admin')            // false

// isAny() — true if the user has at least one of the listed roles
user.isAny(['editor', 'viewer'])   // true
user.isAny(['viewer', 'guest'])    // false

// isAll() — true if the user has every listed role
user.isAll(['admin', 'editor'])    // true
user.isAll(['admin', 'viewer'])    // false
```

<a name="permission-checks"></a>
### Permission checks

All permission checks include permissions inherited from roles.

```ts
const user = new User({
  roles: [{ role: 'editor', permissions: ['post.publish'] }],
  permissions: [
    { permission: 'post.create', granted: true },
    { permission: 'post.delete', granted: false },
  ],
})

// can() — string or string[]
user.can('post.create')             // true
user.can('post.publish')            // true  (inherited from role)
user.can('post.delete')             // false (explicitly denied)
user.can(['post.create', 'post.delete'])  // true (any match that is granted)

// cannot() — inverse of can()
user.cannot('post.delete')          // true
user.cannot('post.create')          // false

// hasPermission() — alias for can() with a single ability
user.hasPermission('post.create')   // true

// hasAnyPermission() — true if any of the permissions are granted
user.hasAnyPermission(['post.create', 'post.delete'])   // true

// hasAllPermissions() — true if every permission is granted
user.hasAllPermissions(['post.create', 'post.publish'])  // true
user.hasAllPermissions(['post.create', 'post.delete'])   // false
```

You can also read the raw normalized arrays:

```ts
user.getRoles()
// [{ role: 'editor', permissions: ['post.publish'] }]

user.getPermissions()
// [{ permission: 'post.create', granted: true }, { permission: 'post.delete', granted: false }]

user.getData()
// the raw attributes object passed to the constructor
```


<a name="gates"></a>
## Gates

<a name="writing-gates"></a>
### Writing Gates

Register a named policy with `Gate.define()`. The first argument to the callback is always the current user; additional arguments are typed directly from the function expression — no extra setup required:

```ts
import { Gate, User } from '@xaamin/guardian'

interface Post    { id: number; authorId: number; published: boolean }
interface Comment { postId: number; body: string }

// Single resource argument
Gate.define('post.update', (user: User, post: Post) => {
  return user.is('admin') || post.authorId === (user.getData().id as number)
})

// Multiple typed arguments
Gate.define('post.delete', (user: User, post: Post, reason: string) => {
  return user.is('admin') && post.authorId !== 0 && reason.length > 0
})

// Role-only check — no extra args
Gate.define('post.publish', (user: User) => {
  return user.is(['admin', 'editor'])
})

// Permission-based check
Gate.define('comment.moderate', (user: User, comment: Comment) => {
  return user.can('moderate-comments') && comment.postId > 0
})
```

> TypeScript infers the types of `post`, `reason`, and `comment` from the function expression. No registration step or type map is needed.

<a name="authorizing-actions"></a>
### Authorizing Actions

```ts
import { Gate } from '@xaamin/guardian'

const post: Post = { id: 1, authorId: 42, published: false }

if (Gate.allows('post.update', post)) {
  // current user can update the post
}

if (Gate.denies('post.update', post)) {
  // current user cannot update the post
}

// cannot() is an alias for denies()
if (Gate.cannot('post.delete', post, 'spam')) {
  throw new Error('Forbidden')
}
```

<a name="acl-fallback"></a>
### ACL fallback

When no policy is registered for an ability, `Gate.allows()` automatically falls back to `user.can(ability)`. This means ACL-only checks work without calling `define()`:

```ts
Gate.setUser({
  roles: ['editor'],
  permissions: ['post.create', { permission: 'post.delete', granted: false }],
})

Gate.allows('post.create')   // true  — from user permissions (no policy needed)
Gate.allows('post.delete')   // false — denied in user permissions
Gate.allows('post.update')   // false — not in permissions, no policy defined
```

<a name="any-every"></a>
### any / every

```ts
import { Gate } from '@xaamin/guardian'

// True if the user is allowed to perform at least one ability
if (Gate.any(['post.update', 'post.delete'], post)) {
  // show edit controls
}

// True if the user is allowed to perform every ability
if (Gate.every(['post.create', 'post.publish'])) {
  // show full editor toolbar
}
```

<a name="intercepting-gate-checks"></a>
### Intercepting Gate Checks

#### before

Runs before every authorization check. Return `true` or `false` to short-circuit the result. Return `undefined` (or nothing) to let the normal check proceed:

```ts
import { Gate, User } from '@xaamin/guardian'

Gate.before((user: User, ability: string) => {
  if (user.is('super-admin')) {
    return true   // super-admins pass everything
  }
  // return undefined implicitly — fall through to normal checks
})
```

#### after

Runs after every authorization check. The result cannot be changed, but it is useful for auditing and logging:

```ts
import { Gate, User } from '@xaamin/guardian'

Gate.after((user: User, ability: string, result: boolean) => {
  console.log(`[guardian] ${ability} → ${result ? 'allowed' : 'denied'}`)
})
```

Both callbacks receive the same extra arguments that were passed to `allows()`:

```ts
Gate.before((user: User, ability: string, ...args: unknown[]) => {
  // args mirrors what was passed to Gate.allows(ability, ...args)
})
```

If you need to store the callback in a typed variable, use the exported types:

```ts
import type { BeforeCallback, AfterCallback } from '@xaamin/guardian'

const beforeHook: BeforeCallback = (user, ability) => {
  if (user.is('super-admin')) return true
}

const afterHook: AfterCallback = (user, ability, result) => {
  auditLog.write({ ability, result, userId: user.getData().id })
}

Gate.before(beforeHook)
Gate.after(afterHook)
```

> `before` and `after` hooks are scoped to the gate instance they are registered on. They do not bleed across instances created with `forUser()` or `new GuardianGate()`.


<a name="multiple-instances"></a>
## Multiple instances

`Guardian` and `Gate` are a static facade over a shared `GuardianGate` instance. Use `GuardianGate` directly to create fully independent instances — useful in multi-tenant applications or for per-request isolation:

```ts
import { GuardianGate, User } from '@xaamin/guardian'

const gate = new GuardianGate()

gate.setUser({ roles: ['editor'], permissions: ['post.create'] })

gate.define('post.update', (user: User, post: Post) => {
  return user.is('editor') && post.authorId === (user.getData().id as number)
})

gate.allows('post.create')   // true
gate.allows('post.update', { id: 1, authorId: 99 })  // depends on the user
```

You can check whether a user is set before authorizing:

```ts
gate.isUserLoggedIn()   // boolean
gate.getUser()          // returns User, throws if none set
```


<a name="testing"></a>
## Testing

Guardian is designed to be testable without mocking or monkey-patching.

### Reset between tests (Vitest / Jest)

Call `Guardian.reset()` in `beforeEach` to give each test a clean facade with no user, no policies, and no hooks:

```ts
import { Guardian } from '@xaamin/guardian'

beforeEach(() => Guardian.reset())
```

### Swap the internal instance

`Guardian.swap()` replaces the facade's underlying `GuardianGate` with any instance you provide. This is useful when you want to pre-configure a gate and hand it to the facade, or inject a subclass:

```ts
import { Guardian, GuardianGate } from '@xaamin/guardian'

beforeEach(() => {
  const gate = new GuardianGate()
  gate.setUser({ roles: ['admin'], permissions: ['post.create'] })
  gate.define('post.update', (user) => user.is('admin'))

  Guardian.swap(gate)
})

afterEach(() => Guardian.reset())
```

### Fully isolated instances

For the highest isolation — when two tests must coexist in the same suite without touching shared state — use `GuardianGate` directly instead of the facade. Each instance has its own user, policies, and hooks:

```ts
import { GuardianGate, User } from '@xaamin/guardian'

it('admin can delete posts', () => {
  const gate = new GuardianGate()
  gate.setUser({ roles: ['admin'], permissions: [] })
  gate.define('post.delete', (user: User) => user.is('admin'))

  expect(gate.allows('post.delete')).toBe(true)
})

it('editor cannot delete posts', () => {
  const gate = new GuardianGate()
  gate.setUser({ roles: ['editor'], permissions: [] })
  gate.define('post.delete', (user: User) => user.is('admin'))

  expect(gate.allows('post.delete')).toBe(false)
})
```

### Summary

| Scenario | Approach |
|---|---|
| Testing code that calls `Guardian.*` / `Gate.*` directly | `beforeEach(() => Guardian.reset())` |
| Injecting a pre-configured or subclassed gate into the facade | `Guardian.swap(new GuardianGate(...))` |
| Testing a module that accepts a gate as a dependency | Pass a `new GuardianGate()` instance directly |
| Full isolation with no shared state | `new GuardianGate()` per test, no facade |


<a name="api-reference"></a>
## API Reference

### User

| Method | Signature | Description |
|---|---|---|
| `is` | `(role: string \| string[]) => boolean` | True if the user has the role (or any of the roles) |
| `isNot` | `(role: string \| string[]) => boolean` | Inverse of `is()` |
| `isAny` | `(roles: string[]) => boolean` | True if the user has at least one of the listed roles |
| `isAll` | `(roles: string[]) => boolean` | True if the user has every listed role |
| `can` | `(ability: string \| string[]) => boolean` | True if any matching permission is granted (includes role-inherited permissions) |
| `cannot` | `(ability: string \| string[]) => boolean` | Inverse of `can()` |
| `hasPermission` | `(ability: string) => boolean` | Alias for `can()` with a single ability |
| `hasAnyPermission` | `(abilities: string[]) => boolean` | True if any of the permissions are granted |
| `hasAllPermissions` | `(abilities: string[]) => boolean` | True if every listed permission is granted |
| `getRoles` | `() => RoleInterface[]` | Returns normalized role objects |
| `getPermissions` | `() => PermissionInterface[]` | Returns normalized permission objects (direct only) |
| `getData` | `() => Record<string, unknown>` | Returns the raw attributes object |

### Guardian / Gate (static facade)

| Method | Signature | Description |
|---|---|---|
| `setUser` | `(user: User \| UserInterface) => GuardianGate` | Set the active user on the shared instance |
| `getUser` | `() => User` | Returns the active user; throws if none set |
| `isUserLoggedIn` | `() => boolean` | True if a user has been set |
| `forUser` | `(user: User \| UserInterface) => GuardianGate` | Return a new scoped gate for a specific user (policies are copied) |
| `define` | `(ability: string, callback: (user: User, ...) => boolean) => void` | Register a policy closure |
| `isDefined` | `(ability: string) => boolean` | True if a policy is registered for the ability |
| `allows` | `(ability: string, ...args: unknown[]) => boolean` | True if the check passes |
| `denies` | `(ability: string, ...args: unknown[]) => boolean` | Inverse of `allows()` |
| `cannot` | `(ability: string, ...args: unknown[]) => boolean` | Alias for `denies()` |
| `any` | `(abilities: string[], ...args: unknown[]) => boolean` | True if at least one ability passes |
| `every` | `(abilities: string[], ...args: unknown[]) => boolean` | True if all abilities pass |
| `before` | `(callback: BeforeCallback) => void` | Register a before-hook on the shared instance |
| `after` | `(callback: AfterCallback) => void` | Register an after-hook on the shared instance |
| `getPolicies` | `() => Record<string, PolicyCallback>` | Returns the registered policy map |
| `instance` | `() => GuardianGate` | Returns the current underlying `GuardianGate` |
| `swap` | `(instance: GuardianGate) => void` | Replace the underlying instance (useful in tests) |
| `reset` | `() => void` | Replace the underlying instance with a fresh one (useful in tests) |

### GuardianGate (instance class)

Exposes the same authorization methods as the facade — `setUser`, `getUser`, `isUserLoggedIn`, `forUser`, `define`, `isDefined`, `allows`, `denies`, `cannot`, `any`, `every`, `before`, `after`, `getPolicies` — all as instance methods. Hooks and state are fully scoped to each instance.

### Exported types

```ts
import type {
  UserInterface,
  RoleInterface,
  RoleInput,
  PermissionInterface,
  PermissionInput,
  PolicyCallback,
  BeforeCallback,
  AfterCallback,
} from '@xaamin/guardian'
```

| Type | Definition |
|---|---|
| `RoleInput` | `string \| RoleInterface` |
| `PermissionInput` | `string \| PermissionInterface` |
| `PolicyCallback` | `(user: User, ...args: unknown[]) => boolean` |
| `BeforeCallback` | `(user: User, ability: string, ...args: unknown[]) => boolean \| undefined` |
| `AfterCallback` | `(user: User, ability: string, result: boolean, ...args: unknown[]) => void` |
