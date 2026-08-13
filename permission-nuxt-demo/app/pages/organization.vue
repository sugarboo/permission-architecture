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
const assignmentOpen = ref(false)
const saving = ref(false)
const unitForm = reactive({ name: '', parentId: 'o_company', unitType: 'DEPARTMENT', leaderUserId: null as string | null })
const positionForm = reactive({ name: '', orgUnitId: '' })
const assignmentForm = reactive({ userId: '', employeeNo: '', orgUnitId: '', positionId: '', reason: '' })

const allUnits = computed(() => org.value?.units || [])
const allPositions = computed(() => org.value?.positions || [])
const selectedUnit = computed(() => allUnits.value.find((item: any) => item.id === selectedUnitId.value) || null)
const visiblePositions = computed(() => allPositions.value.filter((item: any) => item.orgUnitId === selectedUnitId.value))
const parentOptions = computed(() => allUnits.value.filter((item: any) => item.unitType !== 'GROUP' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const unitOptions = computed(() => allUnits.value.filter((item: any) => item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const userOptions = computed(() => (users.value || []).filter(item => item.status === 'ACTIVE').map(item => ({
  label: `${item.displayName}${item.employeeNo ? ` · ${item.employeeNo}` : ''}${item.positionName ? ` · 当前：${item.orgUnitName} / ${item.positionName}` : ' · 当前未任职'}`,
  value: item.id
})))
const assignmentPositionOptions = computed(() => allPositions.value.filter((item: any) => item.orgUnitId === assignmentForm.orgUnitId && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))

watch(() => assignmentForm.orgUnitId, () => {
  if (!assignmentPositionOptions.value.some((item: any) => item.value === assignmentForm.positionId)) {
    assignmentForm.positionId = assignmentPositionOptions.value[0]?.value || ''
  }
})
watch(() => assignmentForm.userId, (userId) => {
  assignmentForm.employeeNo = (users.value || []).find(item => item.id === userId)?.employeeNo || ''
})

function selectUnit(node: OrgNode) { selectedUnitId.value = node.id }
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
  positionOpen.value = true
}
function openAssignment(position?: any) {
  const orgUnitId = position?.orgUnitId || selectedUnitId.value
  const positionId = position?.id || allPositions.value.find((item: any) => item.orgUnitId === orgUnitId && item.status === 'ACTIVE')?.id || ''
  Object.assign(assignmentForm, { userId: '', employeeNo: '', orgUnitId, positionId, reason: '' })
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
    await mockFetch('/api/org/positions', { method: 'POST', body: positionForm })
    showSuccess('岗位已创建', '新岗位已加入当前组织，初始在岗人数为 0。')
    positionOpen.value = false
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function saveAssignment() {
  saving.value = true
  try {
    await mockFetch(`/api/org/assignments/${assignmentForm.userId}`, { method: 'PUT', body: assignmentForm })
    const userName = (users.value || []).find(item => item.id === assignmentForm.userId)?.displayName || '用户'
    const unitName = allUnits.value.find((item: any) => item.id === assignmentForm.orgUnitId)?.name || '组织'
    const positionName = allPositions.value.find((item: any) => item.id === assignmentForm.positionId)?.name || '岗位'
    showSuccess('用户任职已更新', `${userName} 已设置为 ${unitName} / ${positionName}。`)
    assignmentOpen.value = false
    await Promise.all([refresh(), refreshUsers()])
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="组织与岗位统一维护任职" description="用户创建时不选择组织或岗位；组织管理员在这里选择用户、补充可选工号并设置正式任职。">
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
                    <UBadge v-for="member in position.members" :key="member.id" color="primary" variant="subtle" size="sm" :label="member.employeeNo ? `${member.name} · ${member.employeeNo}` : member.name" />
                    <span v-if="!position.members.length" class="muted">暂无成员</span>
                  </div>
                </div>
                <div class="row-actions">
                  <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-user-plus" label="分配用户" @click="openAssignment(position)" />
                </div>
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

    <USlideover v-model:open="positionOpen" title="新建岗位" description="岗位只保留名称和所属组织两个关键字段。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="form-grid">
          <UFormField label="岗位名称" required><UInput v-model="positionForm.name" placeholder="例如：客户运营主管" /></UFormField>
          <UFormField label="所属组织" required><USelect v-model="positionForm.orgUnitId" :items="unitOptions" value-key="value" /></UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px"><UIcon name="i-lucide-info" size="16" /><span>创建后可从岗位列表直接分配用户；角色和资源授权仍在用户或角色页维护。</span></div>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="positionOpen = false" /><UButton color="primary" label="创建岗位" :loading="saving" @click="createPosition" /></div></template>
    </USlideover>

    <USlideover v-model:open="assignmentOpen" title="设置用户组织与岗位" description="用户任职只在本页维护；重新分配会覆盖该用户当前主任职。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }">
      <template #body>
        <div class="form-grid one">
          <UFormField label="选择用户" required><USelect v-model="assignmentForm.userId" :items="userOptions" value-key="value" placeholder="选择要设置任职的用户" /></UFormField>
          <UFormField label="工号（选填）"><UInput v-model="assignmentForm.employeeNo" placeholder="例如：EMP0401" /></UFormField>
          <UFormField label="所属组织" required><USelect v-model="assignmentForm.orgUnitId" :items="unitOptions" value-key="value" /></UFormField>
          <UFormField label="岗位" required><USelect v-model="assignmentForm.positionId" :items="assignmentPositionOptions" value-key="value" placeholder="请先选择组织" /></UFormField>
          <UFormField label="调整说明（选填）"><UTextarea v-model="assignmentForm.reason" autoresize placeholder="例如：转岗至华东客户组" /></UFormField>
        </div>
        <div class="inline-alert" style="margin-top: 14px"><UIcon name="i-lucide-info" size="16" /><span>重新分配会覆盖当前主任职。工号为可选基础信息；角色与资源授权仍在用户或角色页维护。</span></div>
      </template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="assignmentOpen = false" /><UButton color="primary" label="保存任职" :loading="saving" @click="saveAssignment" /></div></template>
    </USlideover>

  </div>
</template>
