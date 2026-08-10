import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { permissions, rolePermissions, roles, userPermissions, userRoles, users } from '../../../database/schema'
import { bumpPolicyVersion, writeAudit } from '../../../services/audit'
import { requireFunction } from '../../../services/policy'
import { useDb } from '../../../utils/db'
import { readSchema } from '../../../utils/validation'

const roleGrantSchema = z.object({
  permissionIds: z.array(z.string()).default([]),
  reason: z.string().trim().min(1, '请填写授权原因').max(240)
})

const userGrantSchema = z.object({
  roleIds: z.array(z.string()).default([]),
  directPermissionIds: z.array(z.string()).default([]),
  reason: z.string().trim().min(1, '请填写授权原因').max(240),
  validTo: z.string().datetime().optional().nullable(),
  sourceTicket: z.string().trim().max(60).optional().nullable()
})

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')
  const id = getRouterParam(event, 'id')!
  const { db } = useDb()
  const stamp = new Date().toISOString()

  if (type === 'role') {
    const actorUserId = requireFunction(event, 'iam.role.manage')
    const body = await readSchema(event, roleGrantSchema)
    const role = db.select().from(roles).where(eq(roles.id, id)).get()
    if (!role) throw createError({ statusCode: 404, statusMessage: '角色不存在' })
    const selected = body.permissionIds.length ? db.select().from(permissions).where(and(inArray(permissions.id, body.permissionIds), eq(permissions.status, 'ACTIVE'))).all() : []
    if (selected.length !== new Set(body.permissionIds).size || selected.some(permission => !['FUNCTION', 'MENU'].includes(permission.type))) throw createError({ statusCode: 422, statusMessage: '角色只能获得已启用的菜单或功能权限' })
    const previous = db.select().from(rolePermissions).where(eq(rolePermissions.roleId, id)).all()
    db.transaction((tx) => {
      tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id)).run()
      if (selected.length) tx.insert(rolePermissions).values(selected.map(permission => ({ roleId: id, permissionId: permission.id, reason: body.reason, createdAt: stamp }))).run()
    })
    const affected = db.select({ userId: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, id)).all().map(row => row.userId)
    bumpPolicyVersion(affected)
    writeAudit({ actorUserId, action: 'UPDATE_ROLE_GRANTS', entityType: 'ROLE', entityId: id, summary: `更新角色“${role.name}”授权`, detail: { reason: body.reason, before: previous.map(item => item.permissionId), after: body.permissionIds, affectedUsers: affected.length } })
    return { affectedUsers: affected.length }
  }

  if (type === 'user') {
    const actorUserId = requireFunction(event, 'iam.user.manage')
    const body = await readSchema(event, userGrantSchema)
    const user = db.select().from(users).where(eq(users.id, id)).get()
    if (!user) throw createError({ statusCode: 404, statusMessage: '用户不存在' })
    if (user.status !== 'ACTIVE') throw createError({ statusCode: 422, statusMessage: '停用用户不能新增授权' })
    const selectedRoles = body.roleIds.length ? db.select().from(roles).where(and(inArray(roles.id, body.roleIds), eq(roles.status, 'ACTIVE'))).all() : []
    const selectedPermissions = body.directPermissionIds.length ? db.select().from(permissions).where(and(inArray(permissions.id, body.directPermissionIds), eq(permissions.status, 'ACTIVE'))).all() : []
    if (selectedRoles.length !== new Set(body.roleIds).size || selectedPermissions.length !== new Set(body.directPermissionIds).size || selectedPermissions.some(permission => !['FUNCTION', 'MENU'].includes(permission.type))) throw createError({ statusCode: 422, statusMessage: '用户只能获得已启用的角色、菜单或功能权限' })
    if (body.validTo && new Date(body.validTo) <= new Date()) throw createError({ statusCode: 422, statusMessage: '失效时间必须晚于当前时间' })
    const previousRoles = db.select().from(userRoles).where(eq(userRoles.userId, id)).all()
    const previousDirect = db.select().from(userPermissions).where(eq(userPermissions.userId, id)).all()

    db.transaction((tx) => {
      tx.delete(userRoles).where(eq(userRoles.userId, id)).run()
      tx.delete(userPermissions).where(eq(userPermissions.userId, id)).run()
      if (selectedRoles.length) tx.insert(userRoles).values(selectedRoles.map(role => ({ userId: id, roleId: role.id, validFrom: stamp, validTo: null, reason: body.reason, createdAt: stamp }))).run()
      if (selectedPermissions.length) tx.insert(userPermissions).values(selectedPermissions.map(permission => ({ id: crypto.randomUUID(), userId: id, permissionId: permission.id, validFrom: stamp, validTo: body.validTo || null, reason: body.reason, sourceTicket: body.sourceTicket || null, createdAt: stamp }))).run()
    })
    bumpPolicyVersion([id])
    writeAudit({ actorUserId, action: 'UPDATE_USER_GRANTS', entityType: 'USER', entityId: id, summary: `更新用户“${user.displayName}”授权`, detail: { reason: body.reason, sourceTicket: body.sourceTicket || null, validTo: body.validTo || null, before: { roles: previousRoles.map(item => item.roleId), direct: previousDirect.map(item => item.permissionId) }, after: { roles: body.roleIds, direct: body.directPermissionIds } } })
    return { userId: id }
  }

  throw createError({ statusCode: 400, statusMessage: '主体类型仅支持 user 或 role' })
})
