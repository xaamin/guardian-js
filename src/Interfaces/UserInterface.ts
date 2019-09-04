import { RoleInterface } from './RoleInterface';
import { PermissionInterface } from './PermissionInterface';

export interface UserInterface {
  roles: RoleInterface[],
  permissions: PermissionInterface[],
}