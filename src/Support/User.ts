import { RoleInterface, RoleInput } from '../Interfaces/RoleInterface'
import { PermissionInterface, PermissionInput } from '../Interfaces/PermissionInterface'

export class User {
  protected attributes: Record<string, unknown> | null

  constructor(attributes: Record<string, unknown> | null = {}) {
    this.attributes = attributes

    this.get = this.get.bind(this)

    return new Proxy(this, {
      get: this.get
    })
  }

  get(target: User, name: string): unknown {
    return name in target
      ? (target as unknown as Record<string, unknown>)[name]
      : target.getData()[name]
  }

  getData(): Record<string, unknown> {
    if (!this.attributes) {
      throw new Error('Properties not defined for current user')
    }

    return this.attributes
  }

  private normalizeRole(role: RoleInput): RoleInterface {
    return typeof role === 'string' ? { role } : role
  }

  private normalizePermission(permission: PermissionInput): PermissionInterface {
    return typeof permission === 'string'
      ? { permission, granted: true }
      : { granted: true, ...permission }
  }

  getRoles(): RoleInterface[] {
    const data = this.getData()

    if (!data.roles) {
      throw new Error('Roles not implemented')
    }

    return (data.roles as RoleInput[]).map(r => this.normalizeRole(r))
  }

  getPermissions(): PermissionInterface[] {
    const data = this.getData()

    if (!data.permissions) {
      throw new Error('Permissions not implemented')
    }

    return (data.permissions as PermissionInput[]).map(p => this.normalizePermission(p))
  }

  private getRolePermissions(): PermissionInterface[] {
    try {
      const result: PermissionInterface[] = []
      for (const role of this.getRoles()) {
        if (Array.isArray(role.permissions)) {
          for (const p of role.permissions) {
            result.push({ permission: p, granted: true })
          }
        }
      }
      return result
    } catch (e) {
      return []
    }
  }

  private getAllGrantedPermissions(): PermissionInterface[] {
    const direct = this.getPermissions()
    const fromRoles = this.getRolePermissions()

    const merged = new Map<string, PermissionInterface>()

    for (const p of [...fromRoles, ...direct]) {
      merged.set(p.permission, p)
    }

    return Array.from(merged.values())
  }

  // --- Role checks ---

  is(role: string | string[]): boolean {
    const roles = this.getRoles()
    const requested = typeof role === 'string' ? [role] : role

    return roles.some(r => requested.includes(r.role))
  }

  isNot(role: string | string[]): boolean {
    return !this.is(role)
  }

  isAny(roles: string[]): boolean {
    return this.is(roles)
  }

  isAll(roles: string[]): boolean {
    const userRoles = this.getRoles().map(r => r.role)

    return roles.every(r => userRoles.includes(r))
  }

  // --- Permission checks ---

  can(ability: string | string[]): boolean {
    const permissions = this.getAllGrantedPermissions()
    const requested = typeof ability === 'string' ? [ability] : ability

    return permissions.some(p => requested.includes(p.permission) && p.granted === true)
  }

  cannot(ability: string | string[]): boolean {
    return !this.can(ability)
  }

  hasPermission(ability: string): boolean {
    return this.can(ability)
  }

  hasAnyPermission(abilities: string[]): boolean {
    return this.can(abilities)
  }

  hasAllPermissions(abilities: string[]): boolean {
    const permissions = this.getAllGrantedPermissions()
    const granted = new Set(permissions.filter(p => p.granted).map(p => p.permission))

    return abilities.every(a => granted.has(a))
  }
}

