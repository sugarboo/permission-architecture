import { describe, expect, it } from 'vitest'
import { mergePermissionCandidates, type PermissionCandidate } from '../../app/utils/policy-rules'

const basePermission: Omit<PermissionCandidate, 'sourceType' | 'sourceId' | 'sourceName'> = {
  id: 'p_customer_read',
  code: 'crm.customer.read',
  name: '查看客户',
  type: 'RESOURCE',
  domain: 'CRM',
  riskLevel: 'LOW'
}

describe('effective permission merge', () => {
  it('retains distinct role, direct and menu CORE origins for one capability', () => {
    const result = mergePermissionCandidates([
      { ...basePermission, sourceType: 'ROLE', sourceId: 'r_sales', sourceName: '销售专员' },
      { ...basePermission, sourceType: 'DIRECT', sourceId: 'g_1', sourceName: '用户直授' },
      { ...basePermission, sourceType: 'MENU_CORE', sourceId: 'm_customer', sourceName: '客户列表' }
    ])

    expect(result).toHaveLength(1)
    expect(result[0]?.sources.map(source => source.sourceType)).toEqual(['ROLE', 'DIRECT', 'MENU_CORE'])
  })

  it('deduplicates the same origin but keeps different roles', () => {
    const result = mergePermissionCandidates([
      { ...basePermission, sourceType: 'ROLE', sourceId: 'r_sales', sourceName: '销售专员' },
      { ...basePermission, sourceType: 'ROLE', sourceId: 'r_sales', sourceName: '销售专员' },
      { ...basePermission, sourceType: 'ROLE', sourceId: 'r_manager', sourceName: '销售主管' }
    ])

    expect(result[0]?.sources).toHaveLength(2)
    expect(result[0]?.sources.map(source => source.sourceId)).toEqual(['r_sales', 'r_manager'])
  })
})
