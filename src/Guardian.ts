import { GuardianGate } from './GuardianGate'
import { User } from './Support/User'
import { UserInterface } from './Interfaces/UserInterface'
import { PolicyCallback, BeforeCallback, AfterCallback } from './GuardianGate'

export class Guardian {
  private static _instance: GuardianGate = new GuardianGate()

  static swap(instance: GuardianGate): void {
    Guardian._instance = instance
  }

  static reset(): void {
    Guardian._instance = new GuardianGate()
  }

  static instance(): GuardianGate {
    return Guardian._instance
  }

  static before(callback: BeforeCallback): void {
    Guardian._instance.before(callback)
  }

  static after(callback: AfterCallback): void {
    Guardian._instance.after(callback)
  }

  static define<TArgs extends unknown[]>(
    policy: string,
    callback: (user: User, ...args: TArgs) => boolean
  ): void {
    Guardian._instance.define(policy, callback)
  }

  static isDefined(policy: string): boolean {
    return Guardian._instance.isDefined(policy)
  }

  static allows(ability: string, ...args: unknown[]): boolean {
    return Guardian._instance.allows(ability, ...args)
  }

  static denies(ability: string, ...args: unknown[]): boolean {
    return Guardian._instance.denies(ability, ...args)
  }

  static cannot(ability: string, ...args: unknown[]): boolean {
    return Guardian._instance.cannot(ability, ...args)
  }

  static any(abilities: string[], ...args: unknown[]): boolean {
    return Guardian._instance.any(abilities, ...args)
  }

  static every(abilities: string[], ...args: unknown[]): boolean {
    return Guardian._instance.every(abilities, ...args)
  }

  static setUser(user: User | UserInterface): GuardianGate {
    return Guardian._instance.setUser(user)
  }

  static getUser(): User {
    return Guardian._instance.getUser()
  }

  static forUser(user: User | UserInterface): GuardianGate {
    return Guardian._instance.forUser(user)
  }

  static isUserLoggedIn(): boolean {
    return Guardian._instance.isUserLoggedIn()
  }

  static getPolicies(): Record<string, PolicyCallback> {
    return Guardian._instance.getPolicies()
  }
}

export { PolicyCallback, BeforeCallback, AfterCallback }
