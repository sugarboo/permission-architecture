<script setup lang="ts">
definePageMeta({ title: '权限模拟器' })
const { showError } = useAppApi()
const { data: users } = await useAsyncData('sim-users', () => $fetch<any[]>('/api/users'))
const { data: catalog } = await useAsyncData('sim-catalog', () => $fetch<any>('/api/catalog'))
const { data: allCustomers } = await useAsyncData('sim-customers-all', () => $fetch<any>('/api/demo/customers?userId=u_admin'))
const form = reactive({ userId: 'u_alice', permissionCode: 'crm.customer.read', dataDomainCode: 'crm.customer', customerId: 'c_003' })
const result = ref<any>(null)
const visibleCustomers = ref<any>(null)
const running = ref(false)
const userOptions = computed(() => (users.value || []).map(item => ({ label: `${item.displayName} · ${item.positionName || '无岗位'}`, value: item.id })))
const permissionOptions = computed(() => (catalog.value?.functions || []).map((item: any) => ({ label: `${item.name} · ${item.code}`, value: item.code, dataDomainCode: item.dataDomainCode })))
const customerOptions = computed(() => (allCustomers.value?.rows || []).map((item: any) => ({ label: `${item.name} · ${item.ownerName} / ${item.ownerOrgUnitName}`, value: item.id })))

watch(() => form.permissionCode, code => { const item = permissionOptions.value.find((option: { value: string, dataDomainCode?: string }) => option.value === code); form.dataDomainCode = item?.dataDomainCode || '' })

async function run() {
  running.value = true
  try {
    const [decision, visible] = await Promise.all([
      $fetch('/api/simulate', { method: 'POST', body: { ...form, dataDomainCode: form.dataDomainCode || null, customerId: form.customerId || null } }),
      $fetch(`/api/demo/customers?userId=${encodeURIComponent(form.userId)}`)
    ])
    result.value = decision
    visibleCustomers.value = visible
  } catch (error) { showError(error, '模拟失败') } finally { running.value = false }
}

onMounted(run)
</script>

<template>
  <div>
    <PageHeader title="先解释，再判断" description="模拟器在服务端使用真实有效权限和组织数据谓词计算结果，展示能力来源、岗位范围及具体数据行是否可访问。"><UButton color="primary" icon="i-lucide-play" label="运行模拟" :loading="running" @click="run" /></PageHeader>
    <div class="content-grid">
      <section class="panel"><div class="panel-head"><div><h2>模拟条件</h2><p>选择主体、业务动作和可选的数据对象。</p></div><UBadge color="primary" variant="subtle" label="Server-side" /></div><div class="panel-body form-grid one"><UFormField label="模拟用户"><USelect v-model="form.userId" :items="userOptions" value-key="value" /></UFormField><UFormField label="业务功能"><USelect v-model="form.permissionCode" :items="permissionOptions" value-key="value" /></UFormField><UFormField label="数据域"><UInput v-model="form.dataDomainCode" class="code" disabled /></UFormField><UFormField label="示例客户数据行"><USelect v-model="form.customerId" :items="customerOptions" value-key="value" /></UFormField><div class="inline-alert"><UIcon name="i-lucide-info" size="16" /><span>详情、更新、删除、导出与批量操作都应复用同一个数据谓词；这里用客户数据演示 ID + 数据范围联合判定。</span></div></div></section>
      <section><div class="decision-card" :class="result ? (result.allowed ? 'allow' : 'deny') : ''"><div class="decision-label">Final decision</div><h3>{{ !result ? '等待模拟' : result.allowed ? '允许访问' : '拒绝访问' }}</h3><p v-if="result">能力：{{ result.capabilityAllowed ? '通过' : '缺少功能' }}；数据行：{{ result.rowAllowed === null ? '无需对象判断' : result.rowAllowed ? '在范围内' : '超出范围' }}。</p></div><div v-if="result?.permission" class="panel" style="margin-top: 14px"><div class="panel-head"><div><h3>能力来源</h3><p class="code">{{ result.permission.code }}</p></div></div><div class="panel-body source-list"><div v-for="source in result.permission.sources" :key="`${source.sourceType}:${source.sourceId}`" class="source-card"><b>{{ source.sourceType === 'ROLE' ? '角色模板' : source.sourceType === 'DIRECT' ? '用户直授' : '菜单 CORE' }}</b><p>{{ source.sourceName }} · {{ source.sourceId }}</p></div></div></div></section>
    </div>

    <section v-if="result" class="panel" style="margin-top: 18px"><div class="panel-head"><div><h2>数据范围展开</h2><p>{{ result.dataAccess?.dataDomainCode || '该功能未声明数据域' }}</p></div><div class="tags"><UBadge :color="result.dataAccess?.all ? 'success' : 'primary'" variant="subtle" :label="result.dataAccess?.all ? 'ALL' : result.dataAccess?.self ? '包含 SELF' : '组织范围'" /><UBadge color="neutral" variant="subtle" :label="`${visibleCustomers?.rows?.length || 0} / ${visibleCustomers?.totalBeforeFilter || 0} 条客户可见`" /></div></div><div class="panel-body"><div class="source-list"><div v-for="scope in result.dataAccess?.scopes || []" :key="`${scope.positionId}:${scope.orgUnitId}`" class="source-card"><b>{{ scope.positionName }} @ {{ scope.orgUnitName }}</b><p>{{ scope.scopeType }} · 展开部门：{{ result.dataAccess.orgUnitIds.join(', ') || '无' }}</p></div><EmptyState v-if="!result.dataAccess?.scopes?.length" title="无有效岗位数据策略" description="对声明 data_scoped 的功能按 NONE 处理。" /></div><div v-if="visibleCustomers?.rows?.length" class="table-scroll" style="margin-top: 14px"><table class="data-table"><thead><tr><th>可见客户</th><th>负责人</th><th>归属部门</th><th>状态</th></tr></thead><tbody><tr v-for="row in visibleCustomers.rows" :key="row.id"><td><b>{{ row.name }}</b></td><td>{{ row.ownerName }}</td><td>{{ row.ownerOrgUnitName }}</td><td>{{ row.status }}</td></tr></tbody></table></div></div></section>
  </div>
</template>
