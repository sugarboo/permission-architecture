export type ReflectableRole = {
  id: string
  name: string
  status: 'ACTIVE' | 'DISABLED'
  permissionIds?: string[]
}

export type ReflectableMenu = {
  permissionId: string | null
  status: 'ACTIVE' | 'DISABLED'
}

export type ReflectableResource = {
  id: string
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED'
}

export type RoleGrantReflection = {
  selectedRoleNames: string[]
  menuSources: Map<string, string[]>
  resourceSources: Map<string, string[]>
}

function addSource(target: Map<string, string[]>, permissionId: string, roleName: string) {
  const sources = target.get(permissionId) || []
  if (!sources.includes(roleName)) sources.push(roleName)
  target.set(permissionId, sources)
}

export function resolveRoleGrantReflection(
  roles: ReflectableRole[],
  selectedRoleIds: string[],
  menus: ReflectableMenu[],
  resources: ReflectableResource[]
): RoleGrantReflection {
  const selected = new Set(selectedRoleIds)
  const activeRoles = roles.filter(role => role.status === 'ACTIVE' && selected.has(role.id))
  const menuPermissionIds = new Set(menus
    .filter(menu => menu.status === 'ACTIVE' && menu.permissionId)
    .map(menu => menu.permissionId as string))
  const resourceIds = new Set(resources
    .filter(resource => resource.status === 'ACTIVE')
    .map(resource => resource.id))
  const menuSources = new Map<string, string[]>()
  const resourceSources = new Map<string, string[]>()

  for (const role of activeRoles) {
    for (const permissionId of role.permissionIds || []) {
      if (menuPermissionIds.has(permissionId)) addSource(menuSources, permissionId, role.name)
      else if (resourceIds.has(permissionId)) addSource(resourceSources, permissionId, role.name)
    }
  }

  return {
    selectedRoleNames: activeRoles.map(role => role.name),
    menuSources,
    resourceSources
  }
}
