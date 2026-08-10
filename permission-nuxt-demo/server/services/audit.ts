import { eq, sql } from 'drizzle-orm'
import { auditLogs, policyMeta, users } from '../database/schema'
import { useDb } from '../utils/db'

export type AuditInput = {
  actorUserId: string
  action: string
  entityType: string
  entityId: string
  summary: string
  detail?: unknown
}

export function writeAudit(input: AuditInput) {
  const { db } = useDb()
  db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    summary: input.summary,
    detailJson: JSON.stringify(input.detail ?? {}),
    createdAt: new Date().toISOString()
  }).run()
}

export function bumpPolicyVersion(affectedUserIds: string[] = []) {
  const { db } = useDb()
  const stamp = new Date().toISOString()
  db.update(policyMeta)
    .set({ value: sql`CAST(${policyMeta.value} AS INTEGER) + 1`, updatedAt: stamp })
    .where(eq(policyMeta.key, 'policy_version'))
    .run()

  for (const userId of new Set(affectedUserIds)) {
    db.update(users)
      .set({ authzVersion: sql`${users.authzVersion} + 1`, updatedAt: stamp })
      .where(eq(users.id, userId))
      .run()
  }
}

export function bumpCatalogVersion() {
  const { db } = useDb()
  const stamp = new Date().toISOString()
  db.update(policyMeta)
    .set({ value: sql`CAST(${policyMeta.value} AS INTEGER) + 1`, updatedAt: stamp })
    .where(eq(policyMeta.key, 'catalog_version'))
    .run()
  bumpPolicyVersion()
}
