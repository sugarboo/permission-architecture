import { describe, expect, it } from 'vitest'
import { resolveMenuPackageReflection, type MenuPackageBinding, type MenuPackageMenu } from '../../app/utils/menu-package-reflection'

const menus: MenuPackageMenu[] = [
  { id: 'm_customers', nodeType: 'MENU', name: '客户列表', permissionId: 'pm_customers', status: 'ACTIVE' },
  { id: 'm_orders', nodeType: 'MENU', name: '订单列表', permissionId: 'pm_orders', status: 'ACTIVE' },
  { id: 'd_crm', nodeType: 'DIRECTORY', name: '客户管理', permissionId: null, status: 'ACTIVE' }
]

const bindings: MenuPackageBinding[] = [
  { menuId: 'm_customers', permissionId: 'f_read', bundleLevel: 'CORE' },
  { menuId: 'm_customers', permissionId: 'f_export', bundleLevel: 'OPTIONAL' },
  { menuId: 'm_orders', permissionId: 'f_read', bundleLevel: 'OPTIONAL' },
  { menuId: 'm_orders', permissionId: 'f_approve', bundleLevel: 'OPTIONAL' }
]

describe('menu package reflection', () => {
  it('reflects CORE and OPTIONAL functions for selected menu leaves', () => {
    const result = resolveMenuPackageReflection(menus, bindings, ['pm_customers'])

    expect(result.selectedMenuNames).toEqual(['客户列表'])
    expect(result.coreSources.get('f_read')).toEqual(['客户列表'])
    expect(result.optionalSources.get('f_export')).toEqual(['客户列表'])
  })

  it('lets CORE win when another selected menu marks the same function OPTIONAL', () => {
    const result = resolveMenuPackageReflection(menus, bindings, ['pm_customers', 'pm_orders'])

    expect(result.coreSources.get('f_read')).toEqual(['客户列表'])
    expect(result.optionalSources.has('f_read')).toBe(false)
    expect(result.optionalSources.get('f_approve')).toEqual(['订单列表'])
  })

  it('ignores bindings from menus that are not selected', () => {
    const result = resolveMenuPackageReflection(menus, bindings, [])

    expect(result.selectedMenuIds).toEqual([])
    expect(result.coreSources.size).toBe(0)
    expect(result.optionalSources.size).toBe(0)
  })
})
