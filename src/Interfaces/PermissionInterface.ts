export interface PermissionInterface {
  permission: string
  granted?: boolean
}

export type PermissionInput = string | PermissionInterface
