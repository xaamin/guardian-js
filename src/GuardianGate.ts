import { User } from './Support/User'
import { UserInterface } from './Interfaces/UserInterface'

type PolicyCallback = (user: User, ...args: unknown[]) => boolean
type BeforeCallback = (user: User, ability: string, ...args: unknown[]) => boolean | undefined
type AfterCallback = (user: User, ability: string, result: boolean, ...args: unknown[]) => void

export class GuardianGate {
  private policies: Record<string, PolicyCallback>
  private user: null | User
  private _before?: BeforeCallback
  private _after?: AfterCallback

  constructor() {
    this.policies = {}
    this.user = null

    this.getProxied = this.getProxied.bind(this)

    return new Proxy(this, {
      get: this.getProxied
    })
  }

  public before(callback: BeforeCallback): void {
    this._before = callback
  }

  public after(callback: AfterCallback): void {
    this._after = callback
  }

  protected getProxied(target: GuardianGate, name: string): unknown {
    if (!this.isUserLoggedIn()) {
      return (target as unknown as Record<string, unknown>)[name]
    }

    return name in target
      ? (target as unknown as Record<string, unknown>)[name]
      : (this.getUser() as unknown as Record<string, unknown>)[name]
  }

  public define<TArgs extends unknown[]>(
    policy: string,
    callback: (user: User, ...args: TArgs) => boolean
  ): void {
    this.policies[policy] = callback as unknown as PolicyCallback
  }

  public isDefined(policy: string): boolean {
    return this.policies[policy] !== undefined
  }

  private applyBeforeCheck(user: User, ability: string, ...args: unknown[]): boolean | undefined {
    if (this._before) {
      return this._before(user, ability, ...args)
    }

    return undefined
  }

  private applyAfterCheck(user: User, ability: string, result: boolean, ...args: unknown[]): void {
    if (this._after) {
      this._after(user, ability, result, ...args)
    }
  }

  private applyPolicy(user: User, policy: string, ...args: unknown[]): boolean {
    if (!this.isDefined(policy)) {
      return user.can(policy)
    }

    return this.policies[policy](user, ...args)
  }

  public allows(ability: string, ...args: unknown[]): boolean {
    const user = this.getUser()

    const beforeResult = this.applyBeforeCheck(user, ability, ...args)

    if (beforeResult !== undefined) {
      this.applyAfterCheck(user, ability, beforeResult, ...args)
      return beforeResult
    }

    const allowed = this.applyPolicy(user, ability, ...args)

    this.applyAfterCheck(user, ability, allowed, ...args)

    return allowed
  }

  public denies(ability: string, ...args: unknown[]): boolean {
    return !this.allows(ability, ...args)
  }

  public cannot(ability: string, ...args: unknown[]): boolean {
    return this.denies(ability, ...args)
  }

  public any(abilities: string[], ...args: unknown[]): boolean {
    return abilities.some(ability => this.allows(ability, ...args))
  }

  public every(abilities: string[], ...args: unknown[]): boolean {
    return abilities.every(ability => this.allows(ability, ...args))
  }

  private __validate(user: User | UserInterface): User {
    if (user instanceof User) {
      return user
    }

    const hasRoles = Array.isArray((user as UserInterface).roles)
    const hasPermissions = Array.isArray((user as UserInterface).permissions)

    if (hasRoles && hasPermissions) {
      return new User(user as unknown as Record<string, unknown>)
    }

    throw new Error('User object must have both roles and permissions array properties')
  }

  public forUser(user: User | UserInterface): GuardianGate {
    const validUser = this.__validate(user)

    const guardian = new GuardianGate()

    guardian.setUser(validUser)

    for (const policy in this.policies) {
      guardian.define(policy, this.policies[policy])
    }

    return guardian
  }

  public setUser(user: User | UserInterface): GuardianGate {
    this.user = this.__validate(user)

    return this
  }

  public getUser(): User {
    if (!this.user) {
      throw new Error('No user logged in')
    }

    return this.user
  }

  public isUserLoggedIn(): boolean {
    return this.user !== null
  }

  public getPolicies(): Record<string, PolicyCallback> {
    return this.policies
  }
}

export { PolicyCallback, BeforeCallback, AfterCallback }
