export interface RoleInterface {
  role: string
  permissions?: string[]
}

export type RoleInput = string | RoleInterface
