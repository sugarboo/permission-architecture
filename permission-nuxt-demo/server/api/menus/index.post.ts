import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { menus, permissions } from '../../database/schema'
import { bumpCatalogVersion, writeAudit } from '../../services/audit'
import { requireFunction } from '../../services/policy'
import { useDb } from '../../utils/db'
import { readSchema, rethrowDatabaseError } from '../../utils/validation'

const menuSchema = z.object({
  nodeType: z.enum(['BOARD', 'DIRECTORY', 'MENU']),
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().regex(/^[A-Z][A-Z0-9_]{2,59}$/),
  parentId: z.string().optional().nullable(),
  permissionCode: z.string().trim().optional().nullable(),
  routePath: z.string().trim().optional().nullable(),
  componentKey: z.string().trim().optional().nullable(),
  icon: z.string().trim().optional().nullable(),
  sortOrder: z.number().int().min(0).max(9999).default(100),
  status: z.enum(['ACTIVE', 'DISABLED']).default('ACTIVE')
})

export default defineEventHandler(async (event) => {
  const actorUserId = requireFunction(event, 'iam.menu.manage')
  const body = await readSchema(event, menuSchema)
  const { db } = useDb()
  const stamp = new Date().toISOString()
  const id = crypto.randomUUID()
  const permissionId = body.nodeType === 'MENU' ? crypto.randomUUID() : null

  const parent = body.parentId ? db.select().from(menus).where(eq(menus.id, body.parentId)).get() : null
  const validParent = body.nodeType === 'BOARD'
    ? !body.parentId
    : body.nodeType === 'DIRECTORY'
      ? parent?.nodeType === 'BOARD'
      : parent?.nodeType === 'DIRECTORY'

  if (!validParent) throw createError({ statusCode: 422, statusMessage: '父子类型不合法：板块 → 目录 → 页面菜单' })
  if (body.nodeType === 'MENU' && (!body.permissionCode?.match(/^menu\.[a-z][a-z0-9_.]+$/) || !body.routePath?.startsWith('/') || !body.componentKey)) {
    throw createError({ statusCode: 422, statusMessage: '页面菜单必须填写 menu.* 权限码、路由和组件键' })
  }

  try {
    db.transaction((tx) => {
      if (permissionId) {
        tx.insert(permissions).values({ id: permissionId, type: 'MENU', code: body.permissionCode!, name: `${body.name}菜单`, domain: parent?.name || '菜单', dataDomainCode: null, riskLevel: 'LOW', status: 'ACTIVE', description: '页面菜单叶子授权', createdAt: stamp, updatedAt: stamp }).run()
      }
      tx.insert(menus).values({ id, parentId: body.parentId || null, nodeType: body.nodeType, name: body.name, code: body.code, permissionId, routePath: body.routePath || null, componentKey: body.componentKey || null, icon: body.icon || null, sortOrder: body.sortOrder, status: body.status, createdAt: stamp, updatedAt: stamp }).run()
    })
  } catch (error) {
    rethrowDatabaseError(error, '菜单编码或菜单权限码已存在')
  }

  bumpCatalogVersion()
  writeAudit({ actorUserId, action: 'CREATE_MENU', entityType: 'MENU', entityId: id, summary: `新建${body.nodeType === 'BOARD' ? '板块' : body.nodeType === 'DIRECTORY' ? '目录' : '页面菜单'}“${body.name}”`, detail: body })
  setResponseStatus(event, 201)
  return { id, permissionId }
})
