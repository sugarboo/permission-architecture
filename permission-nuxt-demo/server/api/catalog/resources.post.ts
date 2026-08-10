import { and, eq, inArray, ne } from 'drizzle-orm'
import { z } from 'zod'
import { functionResources, permissions, resources } from '../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../services/audit'
import { requireFunction } from '../../services/policy'
import { useDb } from '../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../utils/validation'

const resourceSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().regex(/^(report|template)(\.[a-z][a-z0-9_]*){2,}$/),
  domain: z.string().trim().min(2).max(40),
  resourceType: z.enum(['REPORT', 'TEMPLATE']),
  description: z.string().trim().max(240).default(''),
  status: z.enum(['DRAFT', 'ACTIVE']).default('DRAFT'),
  functionPermissionIds: z.array(z.string()).default([])
}).superRefine((value, context) => {
  if (!value.code.startsWith(`${value.resourceType.toLowerCase()}.`)) {
    context.addIssue({ code: 'custom', message: '资源编码前缀必须与资源类型一致', path: ['code'] })
  }
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.catalog.manage')
  const body = await readSchema(event, resourceSchema)
  const { db } = useDb()
  const functionIds = [...new Set(body.functionPermissionIds)]
  const selectedFunctions = functionIds.length
    ? db.select({ id: permissions.id }).from(permissions).where(and(
      inArray(permissions.id, functionIds),
      eq(permissions.type, 'FUNCTION'),
      ne(permissions.status, 'DISABLED')
    )).all()
    : []
  if (selectedFunctions.length !== functionIds.length) {
    throw createError({ statusCode: 422, statusMessage: '关联项包含不存在或已停用的功能' })
  }

  const id = crypto.randomUUID()
  const stamp = new Date().toISOString()

  try {
    db.transaction((tx) => {
      tx.insert(resources).values({
        id,
        code: body.code,
        name: body.name,
        domain: body.domain,
        resourceType: body.resourceType,
        status: body.status,
        description: body.description,
        createdAt: stamp,
        updatedAt: stamp
      }).run()
      if (functionIds.length) {
        tx.insert(functionResources).values(functionIds.map(functionPermissionId => ({ functionPermissionId, resourceId: id, createdAt: stamp }))).run()
      }
    })
  } catch (error) {
    rethrowDatabaseError(error, '资源编码已存在，或所选功能无效')
  }

  bumpCatalogVersion()
  writeAudit({ actorUserId, action: 'CREATE_RESOURCE', entityType: 'BUSINESS_RESOURCE', entityId: id, summary: `新建业务资源“${body.name}”`, detail: { code: body.code, type: body.resourceType, status: body.status, functionPermissionIds: functionIds } })
  setResponseStatus(event, 201)
  return { id }
})
