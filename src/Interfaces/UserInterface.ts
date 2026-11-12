import { RoleInput } from './RoleInterface'
import { PermissionInput } from './PermissionInterface'

export interface UserInterface {
  roles: RoleInput[]
  permissions: PermissionInput[]
  [key: string]: unknown
}
