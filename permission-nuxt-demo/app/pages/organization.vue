<script setup lang="ts">
import type { OrgNode } from '~/types/organization'

definePageMeta({ title: '组织与岗位' })
const { showError, showSuccess } = useAppApi()
const { data: org, refresh, pending } = await useAsyncData('organization', () => $fetch<any>('/api/org'))
const { data: users } = await useAsyncData('users-for-org', () => $fetch<any[]>('/api/users'))
const selectedUnitId = ref('o_company')
const unitOpen = ref(false)
const positionOpen = ref(false)
const scopeOpen = ref(false)
const saving = ref(false)
const scopeTarget = reactive({ id: '', name: '' })
const unitForm = reactive({ name: '', code: '', parentId: 'o_company', unitType: 'DEPARTMENT', leaderUserId: null as string | null, sortOrder: 100, status: 'ACTIVE' })
const positionForm = reactive({ name: '', code: '', orgUnitId: '', description: '', suggestedRoleId: null as string | null, status: 'ACTIVE', highRiskReason: '' })
const scopeReason = ref('')
const scopes: Record<string, any> = reactive({})
const scopeItems = [
  { label: '无数据（NONE）', value: 'NONE' }, { label: '仅本人（SELF）', value: 'SELF' }, { label: '本部门（DEPT）', value: 'DEPT' },
  { label: '本部门及下级', value: 'DEPT_AND_DESCENDANTS' }, { label: '指定部门', value: 'CUSTOM_DEPTS' }, { label: '全部（ALL · 高风险）', value: 'ALL' }
]

const allUnits = computed(() => org.value?.units || [])
const selectedUnit = computed(() => allUnits.value.find((item: any) => item.id === selectedUnitId.value) || null)
const visiblePositions = computed(() => (org.value?.positions || []).filter((item: any) => item.orgUnitId === selectedUnitId.value))
const parentOptions = computed(() => allUnits.value.filter((item: any) => item.unitType !== 'GROUP' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const unitOptions = computed(() => allUnits.value.filter((item: any) => item.unitType !== 'COMPANY' && item.status === 'ACTIVE').map((item: any) => ({ label: item.name, value: item.id })))
const userOptions = computed(() => (users.value || []).filter(item => item.status === 'ACTIVE').map(item => ({ label: `${item.displayName} · ${item.employeeNo}`, value: item.id })))
const roleOptions = computed(() => (org.value?.roles || []).map((item: any) => ({ label: `${item.name} · ${item.code}`, value: item.id })))

function selectUnit(node: OrgNode) { selectedUnitId.value = node.id }
function ensureScopeState() { for (const domain of org.value?.dataDomains || []) if (!scopes[domain.code]) scopes[domain.code] = { scopeType: 'NONE', includeDescendants: false, customOrgUnitIds: [] } }
watch(org, ensureScopeState, { immediate: true })
function resetScopes() { Object.keys(scopes).forEach(key => delete scopes[key]); ensureScopeState() }
function toggleCustom(domainCode: string, orgUnitId: string, checked: boolean) { const target = scopes[domainCode]!; const next = new Set(target.customOrgUnitIds); checked ? next.add(orgUnitId) : next.delete(orgUnitId); target.customOrgUnitIds = [...next] }
function scopePayload() { return Object.entries(scopes).map(([dataDomainCode, scope]) => ({ dataDomainCode, scopeType: scope.scopeType, includeDescendants: scope.includeDescendants, customOrgUnitIds: scope.customOrgUnitIds })) }
function openCreateUnit() { unitForm.parentId = selectedUnit.value?.unitType === 'GROUP' ? selectedUnit.value.parentId : selectedUnitId.value; unitOpen.value = true }
function openCreatePosition() { positionForm.orgUnitId = selectedUnit.value?.unitType === 'COMPANY' ? '' : selectedUnitId.value; resetScopes(); positionOpen.value = true }
function openScope(position: any) { scopeTarget.id = position.id; scopeTarget.name = position.name; resetScopes(); for (const item of (org.value?.scopes || []).filter((row: any) => row.positionId === position.id)) scopes[item.dataDomainCode] = { scopeType: item.scopeType, includeDescendants: Boolean(item.includeDescendants), customOrgUnitIds: [...item.customOrgUnitIds] }; scopeReason.value = ''; scopeOpen.value = true }

async function createUnit() {
  saving.value = true
  try { const result = await $fetch<any>('/api/org/units', { method: 'POST', body: unitForm }); showSuccess('组织节点已创建', '闭包关系、策略版本和审计记录已同步更新。'); unitOpen.value = false; await refresh(); selectedUnitId.value = result.id; Object.assign(unitForm, { name: '', code: '', parentId: 'o_company', unitType: 'DEPARTMENT', leaderUserId: null, sortOrder: 100, status: 'ACTIVE' }) } catch (error) { showError(error) } finally { saving.value = false }
}
async function createPosition() {
  saving.value = true
  try { await $fetch('/api/org/positions', { method: 'POST', body: { ...positionForm, scopes: scopePayload() } }); showSuccess('岗位已创建', '岗位角色建议与各数据域范围已保存，初始在岗人数为 0。'); positionOpen.value = false; await refresh() } catch (error) { showError(error) } finally { saving.value = false }
}
async function saveScopes() {
  saving.value = true
  try { const result = await $fetch<any>(`/api/org/positions/${scopeTarget.id}/scopes`, { method: 'PUT', body: { reason: scopeReason.value, scopes: scopePayload() } }); showSuccess('岗位数据策略已发布', `已提升 ${result.affectedUsers || 0} 名在岗用户的策略版本。`); scopeOpen.value = false; await refresh() } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="组织回答“能看哪些数据”" description="上下级来自组织树；岗位在每个数据域单独配置固定范围枚举。角色不会携带隐式的全量数据范围。"><UButton color="neutral" variant="outline" icon="i-lucide-briefcase-business" label="新建岗位" @click="openCreatePosition" /><UButton color="primary" icon="i-lucide-git-branch-plus" label="新建下级部门" @click="openCreateUnit" /></PageHeader>
    <div class="split-grid">
      <section class="panel"><div class="panel-head"><div><h2>组织架构</h2><p>单根树，部门移动需重算闭包关系。</p></div><UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" /></div><div class="panel-body"><OrgManagementTree :nodes="org?.unitTree || []" :selected-id="selectedUnitId" @select="selectUnit" /></div></section>
      <section class="panel"><div class="panel-head"><div><h2>{{ selectedUnit?.name || '岗位列表' }}</h2><p>{{ selectedUnit?.code || '请选择组织节点' }} · {{ visiblePositions.length }} 个岗位</p></div><UButton v-if="selectedUnit?.unitType !== 'COMPANY'" color="primary" variant="soft" size="sm" icon="i-lucide-plus" label="在此新建岗位" @click="openCreatePosition" /></div><div class="panel-body">
        <div v-if="visiblePositions.length" class="source-list"><div v-for="position in visiblePositions" :key="position.id" class="source-card"><div style="display: flex; justify-content: space-between; gap: 14px; align-items: start"><div><div class="tags"><b>{{ position.name }}</b><UBadge color="success" variant="subtle" size="sm" :label="`${position.memberCount} 人在岗`" /></div><p>{{ position.description || '暂无岗位说明' }}</p><p class="code">{{ position.code }} · 建议角色：{{ position.suggestedRoleName || '无' }}</p></div><UButton color="primary" variant="ghost" size="sm" icon="i-lucide-database" label="数据范围" @click="openScope(position)" /></div><div class="tags" style="margin-top: 10px"><UBadge v-for="scope in (org?.scopes || []).filter((item: any) => item.positionId === position.id)" :key="scope.id" :color="scope.scopeType === 'ALL' ? 'warning' : 'neutral'" variant="subtle" size="sm" :label="`${scope.dataDomainName} · ${scope.scopeType}`" /></div></div></div>
        <EmptyState v-else title="当前组织没有岗位" description="岗位既是任职模板，也是数据范围策略的来源。"><UButton v-if="selectedUnit?.unitType !== 'COMPANY'" color="primary" size="sm" label="新建岗位" @click="openCreatePosition" /></EmptyState>
      </div></section>
    </div>

    <UModal v-model:open="unitOpen" title="新建下级组织" description="新节点会写入组织树和闭包表；小组下不能继续新增层级。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }"><template #body><div class="form-grid"><UFormField label="组织名称" required><UInput v-model="unitForm.name" placeholder="例如：华北客户组" /></UFormField><UFormField label="组织编码" required><UInput v-model="unitForm.code" class="code" placeholder="ORG_INFO_NORTH" /></UFormField><UFormField label="上级组织" required><USelect v-model="unitForm.parentId" :items="parentOptions" value-key="value" /></UFormField><UFormField label="类型" required><USelect v-model="unitForm.unitType" :items="[{ label: '部门', value: 'DEPARTMENT' }, { label: '小组', value: 'GROUP' }]" value-key="value" /></UFormField><UFormField label="负责人"><USelect v-model="unitForm.leaderUserId" :items="userOptions" value-key="value" placeholder="可稍后设置" /></UFormField><UFormField label="排序"><UInput v-model.number="unitForm.sortOrder" type="number" /></UFormField></div></template><template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="unitOpen = false" /><UButton color="primary" label="创建组织" :loading="saving" @click="createUnit" /></div></template></UModal>

    <USlideover v-model:open="positionOpen" title="新建岗位与数据策略" description="同一岗位可在不同数据域拥有不同范围。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }"><template #body><div class="form-grid"><UFormField label="岗位名称" required><UInput v-model="positionForm.name" placeholder="例如：客户运营主管" /></UFormField><UFormField label="岗位编码" required><UInput v-model="positionForm.code" class="code" placeholder="POSITION_CUSTOMER_OPS_MANAGER" /></UFormField><UFormField label="所属组织" required><USelect v-model="positionForm.orgUnitId" :items="unitOptions" value-key="value" /></UFormField><UFormField label="建议角色"><USelect v-model="positionForm.suggestedRoleId" :items="roleOptions" value-key="value" placeholder="仅建议，不自动耦合" /></UFormField><UFormField label="岗位说明" class="span-2"><UTextarea v-model="positionForm.description" autoresize /></UFormField></div><div class="panel" style="margin-top: 14px; box-shadow: none"><div class="panel-head"><div><h3>按数据域设置范围</h3><p>未配置或 NONE 均为默认拒绝。</p></div></div><div class="panel-body source-list"><div v-for="domain in org?.dataDomains || []" :key="domain.code" class="source-card"><div class="form-grid"><UFormField :label="`${domain.name} · ${domain.code}`"><USelect v-model="scopes[domain.code].scopeType" :items="scopeItems" value-key="value" /></UFormField><div style="display: flex; align-items: end; padding-bottom: 7px"><UCheckbox v-model="scopes[domain.code].includeDescendants" label="包含所选部门下级" /></div><UFormField v-if="scopes[domain.code].scopeType === 'CUSTOM_DEPTS'" label="指定部门" class="span-2"><div class="tags"><label v-for="unit in unitOptions" :key="unit.value" class="source-card" style="display: flex; gap: 7px; align-items: center"><UCheckbox :model-value="scopes[domain.code].customOrgUnitIds.includes(unit.value)" @update:model-value="toggleCustom(domain.code, unit.value, $event === true)" /><span>{{ unit.label }}</span></label></div></UFormField></div></div></div></div><UFormField v-if="Object.values(scopes).some(scope => scope.scopeType === 'ALL')" label="ALL 高风险原因" required style="margin-top: 14px"><UTextarea v-model="positionForm.highRiskReason" autoresize /></UFormField></template><template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="positionOpen = false" /><UButton color="primary" label="创建岗位" :loading="saving" @click="createPosition" /></div></template></USlideover>

    <USlideover v-model:open="scopeOpen" :title="`岗位数据范围 · ${scopeTarget.name}`" description="发布后立即刷新所有有效任职用户的策略版本。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }"><template #body><div class="source-list"><div v-for="domain in org?.dataDomains || []" :key="domain.code" class="source-card"><UFormField :label="`${domain.name} · ${domain.code}`"><USelect v-model="scopes[domain.code].scopeType" :items="scopeItems" value-key="value" /></UFormField><UCheckbox v-model="scopes[domain.code].includeDescendants" label="包含指定部门的全部下级" style="margin-top: 9px" /><div v-if="scopes[domain.code].scopeType === 'CUSTOM_DEPTS'" class="tags" style="margin-top: 9px"><label v-for="unit in unitOptions" :key="unit.value" class="source-card" style="display: flex; gap: 7px; align-items: center"><UCheckbox :model-value="scopes[domain.code].customOrgUnitIds.includes(unit.value)" @update:model-value="toggleCustom(domain.code, unit.value, $event === true)" /><span>{{ unit.label }}</span></label></div></div></div><UFormField label="变更原因" required style="margin-top: 14px"><UTextarea v-model="scopeReason" autoresize placeholder="说明岗位数据范围调整原因" /></UFormField></template><template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="scopeOpen = false" /><UButton color="primary" label="发布数据策略" :loading="saving" @click="saveScopes" /></div></template></USlideover>
  </div>
</template>
