import User from './Support/User'
import { UserInterface } from './Interfaces/UserInterface'

class Guardian {
  private policies: any
  private user: null | User
  private static _before: (user: User, ability: string | string[]) => {}
  private static _after: (
    user: User,
    ability: string | string[],
    result: boolean,
    ...args: any[]
  ) => {}

  constructor() {
    this.policies = {}
    this.user = null

    this.getProxied = this.getProxied.bind(this)

    return new Proxy(this, {
      get: this.getProxied
    })
  }

  public before(callback: (user: User, ability: string | string[]) => {}): void {
    Guardian._before = callback
  }

  public after(
    callback: (user: User, ability: string | string[], result: boolean, ...args: any[]) => {}
  ): void {
    Guardian._after = callback
  }

  protected getProxied(target: Guardian, name): any {
    if (!this.isUserLoggedIn()) {
      return (target as any)[name]
    }

    return name in target ? (target as any)[name] : this.getUser()[name]
  }

  public define(policy: string, callback: any): void {
    this.policies[policy] = callback
  }

  public isDefined(policy): boolean {
    return this.policies[policy] !== undefined
  }

  private applyBeforeCheck(): boolean {
    let allowed = false

    if (Guardian._before) {
      allowed = Guardian._before.apply(Guardian, arguments)
    }

    return allowed
  }

  private applyAfterCheck(): void {
    if (Guardian._after) {
      let params = [].slice.call(arguments)

      Guardian._after.apply(Guardian, arguments)
    }
  }

  private _applyPolicy(): boolean {
    let params = [].slice.call(arguments)
    const user = params.shift()
    const policy = params.shift()

    if (!this.isDefined(policy)) {
      return false
    }

    const args = [user].concat(params)

    const allowed = this.policies[policy].apply(this, args)

    return allowed
  }

  public allows(): boolean {
    let params = [].slice.call(arguments)
    const user = this.getUser()

    let allowed = false
    let args: any[] = [user].concat(params)

    // Apply global checks
    allowed = this.applyBeforeCheck.apply(this, args)

    // Apply custom policies
    if (allowed === false) {
      allowed = this._applyPolicy.apply(this, args)
    }

    const ability = params.shift()

    // Apply basic user ACL
    if (allowed === false && !this.isDefined(ability)) {
      allowed = this.getUser().can(ability)
    }

    args = [user].concat([ability, allowed, params])

    // Apply global after checks, this does not mutate the result
    this.applyAfterCheck.apply(this, args)

    return allowed
  }

  public denies(): boolean {
    return !this.allows.apply(this, arguments)
  }

  private __validate(user: User | UserInterface): User {
    const instanceOfUser = user instanceof User === true

    if (!instanceOfUser && (user as UserInterface).roles && (user as UserInterface).permissions) {
      user = new User(user)
    } else if (
      !instanceOfUser &&
      (!(user as UserInterface).roles || !(user as UserInterface).permissions)
    ) {
      throw new Error('User object does not have a roles or permissions properties')
    } else if (!instanceOfUser) {
      throw new Error('Class for user is not a implementation of Guardian/User')
    }

    return user as User
  }

  public forUser(user: User | UserInterface): Guardian {
    user = this.__validate(user)

    const guardian = new Guardian()

    guardian.setUser(user)

    for (const policy in this.policies) {
      const callback = this.policies[policy]

      guardian.define(policy, callback)
    }

    return guardian
  }

  public setUser(user: User | UserInterface): Guardian {
    user = this.__validate(user)

    this.user = user

    return this
  }

  public getUser(): User {
    let user = this.user

    if (!user) {
      throw new Error('No user logged in')
    }

    return user
  }

  public isUserLoggedIn(): boolean {
    return this.user !== null
  }

  public getPolicies(): any[] {
    return this.policies
  }
}

export default Guardian
