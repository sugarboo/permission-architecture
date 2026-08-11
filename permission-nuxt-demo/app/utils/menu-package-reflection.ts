export type MenuPackageMenu = {
  id: string
  nodeType: 'BOARD' | 'DIRECTORY' | 'MENU'
  name: string
  permissionId: string | null
  status: 'ACTIVE' | 'DISABLED'
}

export type MenuPackageBinding = {
  menuId: string
  permissionId: string
  bundleLevel: 'CORE' | 'OPTIONAL'
}

export type MenuPackageReflection = {
  selectedMenuIds: string[]
  selectedMenuNames: string[]
  coreSources: Map<string, string[]>
  optionalSources: Map<string, string[]>
}

function addSource(target: Map<string, string[]>, permissionId: string, menuName: string) {
  const sources = target.get(permissionId) || []
  if (!sources.includes(menuName)) sources.push(menuName)
  target.set(permissionId, sources)
}

export function resolveMenuPackageReflection(
  menus: MenuPackageMenu[],
  bindings: MenuPackageBinding[],
  selectedPermissionIds: string[]
): MenuPackageReflection {
  const selectedPermissions = new Set(selectedPermissionIds)
  const selectedMenus = menus.filter(menu => menu.nodeType === 'MENU'
    && menu.status === 'ACTIVE'
    && Boolean(menu.permissionId)
    && selectedPermissions.has(menu.permissionId!))
  const menuNames = new Map(selectedMenus.map(menu => [menu.id, menu.name]))
  const coreSources = new Map<string, string[]>()
  const optionalSources = new Map<string, string[]>()

  for (const binding of bindings) {
    const menuName = menuNames.get(binding.menuId)
    if (!menuName) continue
    addSource(binding.bundleLevel === 'CORE' ? coreSources : optionalSources, binding.permissionId, menuName)
  }

  // A capability already provided as CORE by any selected menu is effective;
  // do not simultaneously present it as an outstanding OPTIONAL choice.
  for (const permissionId of coreSources.keys()) optionalSources.delete(permissionId)

  return {
    selectedMenuIds: selectedMenus.map(menu => menu.id),
    selectedMenuNames: selectedMenus.map(menu => menu.name),
    coreSources,
    optionalSources
  }
}
