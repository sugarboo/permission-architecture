import { z } from 'zod'
import { getEffectivePermissionContext, requireFunction, resolveDataAccess } from '../../services/policy'
import { canAccessOwnedRow } from '../../services/policy-rules'
import { useDb } from '../../utils/db'
import { readSchema } from '../../utils/validation'

const simulationSchema = z.object({
  userId: z.string().min(1),
  permissionCode: z.string().min(3),
  dataDomainCode: z.string().optional().nullable(),
  customerId: z.string().optional().nullable()
})

export default defineEventHandler(async (event) => {
  requireFunction(event, 'iam.audit.read')
  const body = await readSchema(event, simulationSchema)
  const context = getEffectivePermissionContext(body.userId)
  const permission = context.permissions.find(item => item.code === body.permissionCode)
  const { sqlite } = useDb()
  const dataDomainCode = body.dataDomainCode || permission?.dataDomainCode || null
  const dataAccess = dataDomainCode ? resolveDataAccess(body.userId, dataDomainCode) : null
  let rowDecision: boolean | null = null
  let customer: ({ ownerUserId: string, ownerOrgUnitId: string } & Record<string, unknown>) | null = null

  if (body.customerId) {
    const foundCustomer = sqlite.prepare(`
      SELECT c.id, c.name, c.owner_user_id AS ownerUserId, c.owner_org_unit_id AS ownerOrgUnitId,
             ou.name AS ownerOrgUnitName, u.display_name AS ownerName
      FROM demo_customer c
      JOIN org_unit ou ON ou.id = c.owner_org_unit_id
      JOIN iam_user u ON u.id = c.owner_user_id
      WHERE c.id = ?
    `).get(body.customerId) as ({ ownerUserId: string, ownerOrgUnitId: string } & Record<string, unknown>) | undefined
    customer = foundCustomer ?? null
    rowDecision = Boolean(customer && dataAccess && canAccessOwnedRow(dataAccess, customer, body.userId))
  }

  return {
    allowed: Boolean(permission) && (rowDecision ?? true),
    capabilityAllowed: Boolean(permission),
    rowAllowed: rowDecision,
    permission: permission || null,
    dataAccess,
    customer
  }
})
