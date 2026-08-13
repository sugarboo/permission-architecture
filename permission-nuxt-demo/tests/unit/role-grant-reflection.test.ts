import { describe, expect, it } from 'vitest'
import { resolveRoleGrantReflection } from '../../app/utils/role-grant-reflection'

const menus = [
  { permissionId: 'pm_customer', status: 'ACTIVE' as const },
  { permissionId: 'pm_purchase', status: 'ACTIVE' as const },
  { permissionId: 'pm_disabled', status: 'DISABLED' as const }
]

const resources = [
  { id: 'r_read', status: 'ACTIVE' as const },
  { id: 'r_create', status: 'ACTIVE' as const },
  { id: 'r_disabled', status: 'DISABLED' as const }
]

const roles = [
  { id: 'sales', name: '销售专员', status: 'ACTIVE' as const, permissionIds: ['pm_customer', 'r_read', 'r_disabled'] },
  { id: 'manager', name: '销售主管', status: 'ACTIVE' as const, permissionIds: ['pm_customer', 'r_read', 'r_create'] },
  { id: 'disabled', name: '停用角色', status: 'DISABLED' as const, permissionIds: ['pm_purchase', 'r_create'] }
]

describe('role grant reflection', () => {
  it('projects active role menus and resources without expanding them into direct grants', () => {
    const result = resolveRoleGrantReflection(roles, ['sales'], menus, resources)

    expect(result.selectedRoleNames).toEqual(['销售专员'])
    expect(result.menuSources.get('pm_customer')).toEqual(['销售专员'])
    expect(result.resourceSources.get('r_read')).toEqual(['销售专员'])
    expect(result.resourceSources.has('r_disabled')).toBe(false)
  })

  it('deduplicates display permissions while retaining every role source', () => {
    const result = resolveRoleGrantReflection(roles, ['sales', 'manager'], menus, resources)

    expect([...result.menuSources.keys()]).toEqual(['pm_customer'])
    expect(result.menuSources.get('pm_customer')).toEqual(['销售专员', '销售主管'])
    expect(result.resourceSources.get('r_read')).toEqual(['销售专员', '销售主管'])
    expect(result.resourceSources.get('r_create')).toEqual(['销售主管'])
  })

  it('ignores disabled roles and unknown permission ids', () => {
    const result = resolveRoleGrantReflection(roles, ['disabled'], menus, resources)

    expect(result.selectedRoleNames).toEqual([])
    expect(result.menuSources.size).toBe(0)
    expect(result.resourceSources.size).toBe(0)
  })
})
