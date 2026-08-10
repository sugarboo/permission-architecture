import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { functions, permissions } from '../../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema } from '../../../utils/validation'

const updateFunctionSchema = z.object({
  name: z.string().trim().min(2).max(60),
  domain: z.string().trim().min(2).max(40),
  dataDomainCode: z.string().trim().optional().nullable(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  actionType: z.enum(['read', 'create', 'update', 'delete', 'import', 'export', 'approve', 'assign', 'publish', 'manage', 'submit', 'review']),
  dataScoped: z.boolean(),
  isSensitive: z.boolean(),
  description: z.string().trim().max(240).default(''),
  status: z.enum(['DRAFT', 'ACTIVE', 'DISABLED']),
  reason: z.string().trim().min(4).max(240)
}).superRefine((value, context) => {
  if (value.dataScoped && !value.dataDomainCode) {
    context.addIssue({ code: 'custom', message: '受数据范围控制的功能必须选择数据域', path: ['dataDomainCode'] })
  }
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.catalog.manage')
  const id = getRouterParam(event, 'id')!
  const body = await readSchema(event, updateFunctionSchema)
  const { db, sqlite } = useDb()
  const before = sqlite.prepare(`
    SELECT p.id, p.code, p.name, p.domain, p.data_domain_code AS dataDomainCode,
           p.risk_level AS riskLevel, p.status, p.description,
           f.action_type AS actionType, f.data_scoped AS dataScoped, f.is_sensitive AS isSensitive
    FROM iam_permission p
    JOIN iam_function f ON f.permission_id = p.id
    WHERE p.id = ? AND p.type = 'FUNCTION'
  `).get(id) as Record<string, unknown> | undefined
  if (!before) throw createError({ statusCode: 404, statusMessage: '业务功能不存在' })
  if (body.actionType !== before.actionType) {
    throw createError({ statusCode: 422, statusMessage: '动作类型与稳定功能码共同定义功能语义，启用后不可修改；请新建功能并迁移引用' })
  }

  const stamp = new Date().toISOString()
  db.transaction((tx) => {
    tx.update(permissions).set({
      name: body.name,
      domain: body.domain,
      dataDomainCode: body.dataScoped ? body.dataDomainCode || null : null,
      riskLevel: body.riskLevel,
      status: body.status,
      description: body.description,
      updatedAt: stamp
    }).where(eq(permissions.id, id)).run()
    tx.update(functions).set({
      dataScoped: body.dataScoped,
      isSensitive: body.isSensitive
    }).where(eq(functions.permissionId, id)).run()
  })

  bumpCatalogVersion()
  writeAudit({
    actorUserId,
    action: 'UPDATE_FUNCTION',
    entityType: 'FUNCTION',
    entityId: id,
    summary: `编辑业务功能“${body.name}”`,
    detail: { reason: body.reason, before, after: { code: before.code, ...body } }
  })
  return { id, code: before.code }
})
