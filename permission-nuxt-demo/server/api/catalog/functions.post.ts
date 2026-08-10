import { z } from 'zod'
import { functions, permissions } from '../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../services/audit'
import { requireFunction } from '../../services/policy'
import { useDb } from '../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../utils/validation'

const functionSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2}$/),
  domain: z.string().trim().min(2).max(40),
  dataDomainCode: z.string().trim().optional().nullable(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  actionType: z.enum(['read', 'create', 'update', 'delete', 'import', 'export', 'approve', 'assign', 'publish', 'manage', 'submit', 'review']),
  dataScoped: z.boolean().default(false),
  isSensitive: z.boolean().default(false),
  description: z.string().trim().max(240).default(''),
  status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT')
}).superRefine((value, context) => {
  if (value.dataScoped && !value.dataDomainCode) context.addIssue({ code: 'custom', message: '受数据范围控制的功能必须选择数据域', path: ['dataDomainCode'] })
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.catalog.manage')
  const body = await readSchema(event, functionSchema)
  const { db } = useDb()
  const id = crypto.randomUUID()
  const stamp = new Date().toISOString()

  try {
    db.transaction((tx) => {
      tx.insert(permissions).values({
        id,
        type: 'FUNCTION',
        code: body.code,
        name: body.name,
        domain: body.domain,
        dataDomainCode: body.dataDomainCode || null,
        riskLevel: body.riskLevel,
        status: body.status,
        description: body.description,
        createdAt: stamp,
        updatedAt: stamp
      }).run()
      tx.insert(functions).values({ permissionId: id, actionType: body.actionType, dataScoped: body.dataScoped, isSensitive: body.isSensitive }).run()
    })
  } catch (error) {
    rethrowDatabaseError(error, '功能码已存在')
  }

  bumpCatalogVersion()
  writeAudit({ actorUserId, action: 'CREATE_FUNCTION', entityType: 'FUNCTION', entityId: id, summary: `新建功能“${body.name}”`, detail: { code: body.code, status: body.status } })
  setResponseStatus(event, 201)
  return { id }
})
