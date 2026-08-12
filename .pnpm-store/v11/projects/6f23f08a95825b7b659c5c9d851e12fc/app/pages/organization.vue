<script setup lang="ts">
import type { OrgNode } from '~/types/organization'

definePageMeta({ title: '组织与岗位' })
const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const { data: org, refresh, pending } = await useAsyncData('organization', () => mockFetch<any>('/api/org'))
const { data: users, refresh: refreshUsers } = await useAsyncData('users-for-org', () => mockFetch<any[]>('/api/users'))

const selectedUnitId = ref('o_company')
const unitOpen = ref(false)
const positionOpen = ref(false)
const scopeOpen = ref(false)
const assignmentOpen = ref(false)
const saving = ref(false)
const scopeTarget = reactive({ id: '', name: '' })
const unitForm = reactive({ name: '', parentId: 'o_company', unitType: 'DEPARTMENT', leaderUserId: null as string | null })
const positionForm = reactive({ name: '', orgUnitId: '' })
const assignmentForm = reactive({ userId: '', orgUnitId: '', positionId: '', reason: '' })
const scopeReason = ref('')
const scopes: Record<string, any> = reactive({})
const scopeItems = [
  { label: '无数据（NONE）', value: 'NONE' },
  { label: '仅本人（SELF）', value: 'SELF' },
  { label: '本部门（DEPT）', value: 'DEPT' },
  { label: '本部门及下级', value: 'DEPT_AND_DESCENDANTS' },
  { label: '指定部门', value: 'CUSTOM_DEPTS' },
  { label: '全部（ALL · 高风险）', value: 'ALL' }
]

const allUnits = computed(() => org.value?.units || [])
const allPositions = computed(() => org.value?.positions || [])
const selectedUnit = computed(() => allUnits.value.find((item: any) => item.id === selectedUnitId.value) || null)
const visiblePositions = computed(() => allPositions.value.filter((item: any) => item.orgUnitId === selectedUnitId.value))
const parentOptions = computed(() => allUnits.value.filter((item: any) => item.unitType !== 'GROUP' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const unitOptions = computed(() => allUnits.value.filter((item: any) => item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const scopeUnitOptions = computed(() => allUnits.value.filter((item: any) => item.unitType !== 'COMPANY' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const userOptions = computed(() => (users.value || []).filter(item => item.status === 'ACTIVE').map(item => ({
  label: `${item.displayName} · ${item.employeeNo}${item.positionName ? ` · 当前：${item.orgUnitName} / ${item.positionName}` : ' · 当前未任职'}`,
  value: item.id
})))
const assignmentPositionOptions = computed(() => allPositions.value.filter((item: any) => item.orgUnitId === assignmentForm.orgUnitId && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))

watch(() => assignmentForm.orgUnitId, () => {
  if (!assignmentPositionOptions.value.some((item: any) => item.value === assignmentForm.positionId)) {
    assignmentForm.positionId = assignmentPositionOptions.value[0]?.value || ''
  }
})

function selectUnit(node: OrgNode) { selectedUnitId.value = node.id }
function ensureScopeState() {
  for (const domain of org.value?.dataDomains || []) {
    if (!scopes[domain.code]) scopes[domain.code] = { scopeType: 'NONE', includeDescendants: false, customOrgUnitIds: [] }
  }
}
watch(org, ensureScopeState, { immediate: true })
function resetScopes() { Object.keys(scopes).forEach(key => delete scopes[key]); ensureScopeState() }
function toggleCustom(domainCode: string, orgUnitId: string, checked: boolean) {
  const target = scopes[domainCode]!
  const next = new Set(target.customOrgUnitIds)
  checked ? next.add(orgUnitId) : next.delete(orgUnitId)
  target.customOrgUnitIds = [...next]
}
function scopePayload() {
  return Object.entries(scopes).map(([dataDomainCode, scope]) => ({ dataDomainCode, scopeType: scope.scopeType, includeDescendants: scope.includeDescendants, customOrgUnitIds: scope.customOrgUnitIds }))
}
function openCreateUnit() {
  Object.assign(unitForm, {
    name: '',
    parentId: selectedUnit.value?.unitType === 'GROUP' ? selectedUnit.value.parentId : selectedUnitId.value,
    unitType: 'DEPARTMENT',
    leaderUserId: null
  })
  unitOpen.value = true
}
function openCreatePosition() {
  Object.assign(positionForm, { name: '', orgUnitId: selectedUnitId.value })
  resetScopes()
  positionOpen.value = true
}
function openScope(position: any) {
  scopeTarget.id = position.id
  scopeTarget.name = position.name
  resetScopes()
  for (const item of (org.value?.scopes || []).filter((row: any) => row.positionId === position.id)) {
    scopes[item.dataDomainCode] = { scopeType: item.scopeType, includeDescendants: Boolean(item.includeDescendants), customOrgUnitIds: [...item.customOrgUnitIds] }
  }
  scopeReason.value = ''
  scopeOpen.value = true
}
function openAssignment(position?: any) {
  const orgUnitId = position?.orgUnitId || selectedUnitId.value
  const positionId = position?.id || allPositions.value.find((item: any) => item.orgUnitId === orgUnitId && item.status === 'ACTIVE')?.id || ''
  Object.assign(assignmentForm, { userId: '', orgUnitId, positionId, reason: '' })
  assignmentOpen.value = true
}

async function createUnit() {
  saving.value = true
  try {
    const result = await mockFetch<any>('/api/org/units', { method: 'POST', body: unitForm })
    showSuccess('组织节点已创建', '新组织已插入组织树。')
    unitOpen.value = false
    await refresh()
    selectedUnitId.value = result.id
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function createPosition() {
  saving.value = true
  try {
    await mockFetch('/api/org/positions', { method: 'POST', body: { ...positionForm, scopes: scopePayload() } })
    showSuccess('岗位已创建', '岗位与各数据域正式范围已保存，初始在岗人数为 0。')
    positionOpen.value = false
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function saveScopes() {
  saving.value = true
  try {
    const result = await mockFetch<any>(`/api/org/positions/${scopeTarget.id}/scopes`, { method: 'PUT', body: { reason: scopeReason.value, scopes: scopePayload() } })
    showSuccess('岗位数据策略已发布', `已提升 ${result.affectedUsers || 0} 名在岗用户的策略版本。`)
    scopeOpen.value = false
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function saveAssignment() {
  saving.value = true
  try {
    await mockFetch(`/api/org/assignments/${assignmentForm.userId}`, { method: 'PUT', body: assignmentForm })
    const userName = (users.value || []).find(item => item.id === assignmentForm.userId)?.displayName || '用户'
    const positionName = allPositions.value.find((item: any) => item.id === assignmentForm.positionId)?.name || '岗位'
    showSuccess('用户任职已更新', `${userName} 已设置为 ${selectedUnit.value?.name || ''} / ${positionName}。`)
    assignmentOpen.value = false
    await Promise.all([refresh(), refreshUsers()])
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="组织与岗位统一维护任职" description="用户创建时不选择组织或岗位；组织管理员在这里选择用户并设置正式任职，岗位再按数据域提供数据范围。">
      <UButton color="neutral" variant="outline" icon="i-lucide-user-round-cog" label="设置用户任职" @click="openAssignment()" />
      <UButton color="neutral" variant="outline" icon="i-lucide-briefcase-business" label="新建岗位" @click="openCreatePosition" />
      <UButton color="primary" icon="i-lucide-git-branch-plus" label="新建下级组织" @click="openCreateUnit" />
    </PageHeader>

    <div class="split-grid">
      <section class="panel">
        <div class="panel-head">
          <div><h2>组织架构</h2><p>在组织侧统一维护用户归属和岗位。</p></div>
          <UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" />
        </div>
        <div class="panel-body"><OrgManagementTree :nodes="org?.unitTree || []" :selected-id="selectedUnitId" @select="selectUnit" /></div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div><h2>{{ selectedUnit?.name || '岗位列表' }}</h2><p>{{ visiblePositions.length }} 个岗位 · {{ selectedUnit?.memberCount || 0 }} 名成员</p></div>
          <UButton color="primary" variant="soft" size="sm" icon="i-lucide-plus" label="在此新建岗位" @click="openCreatePosition" />
        </div>
        <div class="panel-body">
          <div v-if="visiblePositions.length" class="source-list">
            <div v-for="position in visiblePositions" :key="position.id" class="source-card">
              <div style="display: flex; justify-content: space-between; gap: 14px; align-items: start">
                <div>
                  <div class="tags"><b>{{ position.name }}</b><UBadge color="success" variant="subtle" size="sm" :label="`${position.memberCount} 人在岗`" /></div>
                  <div class="tags" style="margin-top: 9px">
                    <UBadge v-for="member in position.members" :key="member.id" color="primary" variant="subtle" size="sm" :label="`${member.name} · ${member.employeeNo}`" />
                    <span v-if="!position.members.length" class="muted">暂无成员</span>
                  </div>
                </div>
                <div class="row-actions">
                  <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-user-plus" label="分配用户" @click="openAssignment(position)" />
                  <UButton color="primary" variant="ghost" size="sm" icon="i-lucide-database" label="数据范围" @click="openScope(position)" />
                </div>
              </div>
              <div class="tags" style="margin-top: 10px">
                <UBadge v-for="scope in (org?.scopes || []).filter((item: any) => item.positionId === position.id)" :key="scope.id" :color="scope.scopeType === 'ALL' ? 'warning' : 'neutral'" variant="subtle" size="sm" :label="`${scope.dataDomainName} · ${scope.scopeType}`" />
              </div>
            </div>
          </div>
          <EmptyState v-else title="当前组织没有岗位" description="先创建岗位，再通过用户下拉框分配任职。"><UButton color="primary" size="sm" label="新建岗位" @click="openCreatePosition" /></EmptyState>
        </div>
      </section>
    </div>

    <UModal v-model:open="unitOpen" title="新建下级组织" description="仅保留组织名称、上级、类型与负责人四个关键字段。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="组织名称" required><UInput v-model="unitForm.name" placeholder="例如：华北客户组" /></UFormField>
          <UFormField label="上级组织" required><USelect v-model="unitForm.parentId" :items="parentOptions" value-key="value" /></UFormField>
          <UFormField label="类型" required><USelect v-model="unitForm.unitType" :items="[{ label: '部门', value: 'DEPARTMENT' }, { label: '小组', value: 'GROUP' }]" value-key="value" /></UFormField>
          <UFormField label="负责人（选填）"><USelect v-model="unitForm.leaderUserId" :items="userOptions" value-key="value" placeholder="可稍后设置" /></UFormField>
        </div>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="unitOpen = false" /><UButton color="primary" label="创建组织" :loading="saving" @click="createUnit" /></div></template>
    </UModal>

    <USlideover v-model:open="positionOpen" title="新建岗位与正式数据范围" description="岗位只保留名称和所属组织；数据范围按业务数据域配置。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="岗位名称" required><UInput v-model="positionForm.name" placeholder="例如：客户运营主管" /></UFormField>
          <UFormField label="所属组织" required><USelect v-model="positionForm.orgUnitId" :items="unitOptions" value-key="value" /></UFormField>
        </div>
        <div class="panel" style="margin-top: 14px; box-shadow: none">
          <div class="panel-head"><div><h3>按数据域设置范围</h3><p>未配置或 NONE 均为默认拒绝。</p></div></div>
          <div class="panel-body source-list">
            <div v-for="domain in org?.dataDomains || []" :key="domain.code" class="source-card">
              <div class="form-grid">
                <UFormField :label="`${domain.name} · ${domain.code}`"><USelect v-model="scopes[domain.code].scopeType" :items="scopeItems" value-key="value" /></UFormField>
                <div style="display: flex; align-items: end; padding-bottom: 7px"><UCheckbox v-model="scopes[domain.code].includeDescendants" label="包含所选部门下级" /></div>
                <UFormField v-if="scopes[domain.code].scopeType === 'CUSTOM_DEPTS'" label="指定部门" class="span-2">
                  <div class="tags"><label v-for="unit in scopeUnitOptions" :key="unit.value" class="source-card" style="display: flex; gap: 7px; align-items: center"><UCheckbox :model-value="scopes[domain.code].customOrgUnitIds.includes(unit.value)" @update:model-value="toggleCustom(domain.code, unit.value, $event === true)" /><span>{{ unit.label }}</span></label></div>
                </UFormField>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="positionOpen = false" /><UButton color="primary" label="创建岗位" :loading="saving" @click="createPosition" /></div></template>
    </USlideover>

    <USlideover v-model:open="assignmentOpen" title="设置用户组织与岗位" description="用户任职只在本页维护；重新分配会覆盖该用户当前主任职。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="form-grid one">
          <UFormField label="选择用户" required><USelect v-model="assignmentForm.userId" :items="userOptions" value-key="value" placeholder="选择要设置任职的用户" /></UFormField>
          <UFormField label="所属组织" required><USelect v-model="assignmentForm.orgUnitId" :items="unitOptions" value-key="value" /></UFormField>
          <UFormField label="岗位" required><USelect v-model="assignmentForm.positionId" :items="assignmentPositionOptions" value-key="value" placeholder="请先选择组织" /></UFormField>
          <UFormField label="调整说明（选填）"><UTextarea v-model="assignmentForm.reason" autoresize placeholder="例如：转岗至华东客户组" /></UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px"><UIcon name="i-lucide-info" size="16" /><span>岗位决定正式数据范围；角色与资源授权仍在用户或角色页面维护，两者互不隐式绑定。</span></div>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="assignmentOpen = false" /><UButton color="primary" label="保存任职" :loading="saving" @click="saveAssignment" /></div></template>
    </USlideover>

    <USlideover v-model:open="scopeOpen" :title="`岗位数据范围 · ${scopeTarget.name}`" description="这里仅维护岗位的正式数据策略，不提供用户临时数据范围。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="source-list">
          <div v-for="domain in org?.dataDomains || []" :key="domain.code" class="source-card">
            <UFormField :label="`${domain.name} · ${domain.code}`"><USelect v-model="scopes[domain.code].scopeType" :items="scopeItems" value-key="value" /></UFormField>
            <UCheckbox v-model="scopes[domain.code].includeDescendants" label="包含指定部门的全部下级" style="margin-top: 9px" />
            <div v-if="scopes[domain.code].scopeType === 'CUSTOM_DEPTS'" class="tags" style="margin-top: 9px"><label v-for="unit in scopeUnitOptions" :key="unit.value" class="source-card" style="display: flex; gap: 7px; align-items: center"><UCheckbox :model-value="scopes[domain.code].customOrgUnitIds.includes(unit.value)" @update:model-value="toggleCustom(domain.code, unit.value, $event === true)" /><span>{{ unit.label }}</span></label></div>
          </div>
        </div>
        <UFormField label="变更说明（选填）" style="margin-top: 14px"><UTextarea v-model="scopeReason" autoresize placeholder="简要说明岗位数据范围调整" /></UFormField>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="scopeOpen = false" /><UButton color="primary" label="发布数据策略" :loading="saving" @click="saveScopes" /></div></template>
    </USlideover>
  </div>
</template>
