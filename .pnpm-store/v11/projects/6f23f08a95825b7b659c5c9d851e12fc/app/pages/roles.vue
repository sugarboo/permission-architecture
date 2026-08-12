<script setup lang="ts">
definePageMeta({ title: '角色模板' })
const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const { data: roles, refresh, pending } = await useAsyncData('roles', () => mockFetch<any[]>('/api/roles'))
const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const authOpen = ref(false)
const authTarget = reactive({ id: '', name: '' })
const form = reactive({ name: '', code: '', domain: '信息板块', status: 'ACTIVE' as 'ACTIVE' | 'DISABLED' })
const domains = ['信息板块', '供应链板块', '设计师板块', '权限中心']
const filtered = computed(() => (roles.value || []).filter(role => `${role.name} ${role.code} ${role.domain}`.toLowerCase().includes(search.value.toLowerCase())))
function openAuth(role: any) { authTarget.id = role.id; authTarget.name = role.name; authOpen.value = true }
async function createRole() {
  saving.value = true
  try {
    await mockFetch('/api/roles', { method: 'POST', body: form })
    showSuccess('角色模板已创建', '新角色默认没有任何权限，可继续进入树形授权。')
    createOpen.value = false
    Object.assign(form, { name: '', code: '', domain: '信息板块', status: 'ACTIVE' })
    await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="角色是模板，不是边界" description="角色承担常规菜单与资源权限的批量复用；组织与岗位负责数据上下级，避免角色意外成为数据超管。"><UButton color="primary" icon="i-lucide-shield-plus" label="新建角色" @click="createOpen = true" /></PageHeader>
    <section class="panel">
      <div class="panel-head"><div><h2>角色模板</h2><p>扁平角色，不引入嵌套角色或角色层级。</p></div><UBadge color="neutral" variant="subtle" :label="`${roles?.length || 0} 个模板`" /></div>
      <div class="panel-body">
        <div class="toolbar"><UInput v-model="search" class="search-box" icon="i-lucide-search" placeholder="搜索名称、编码或板块" /><UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" /></div>
        <div class="table-scroll"><table class="data-table"><thead><tr><th>角色</th><th>适用板块</th><th>成员</th><th>菜单</th><th>显式资源</th><th>状态</th><th>操作</th></tr></thead><tbody>
          <tr v-for="role in filtered" :key="role.id"><td><div class="primary-cell"><div class="row-avatar"><UIcon name="i-lucide-shield-check" size="16" /></div><div><b>{{ role.name }}</b><small class="code">{{ role.code }}</small></div></div></td><td>{{ role.domain }}</td><td>{{ role.memberCount }} 人</td><td>{{ role.menuCount || 0 }}</td><td>{{ role.resourceCount || 0 }}</td><td><UBadge :color="role.status === 'ACTIVE' ? 'success' : 'neutral'" variant="subtle" :label="role.status === 'ACTIVE' ? '启用' : '停用'" /></td><td><div class="row-actions"><UButton color="primary" variant="ghost" size="sm" icon="i-lucide-git-branch-plus" label="授权" @click="openAuth(role)" /></div></td></tr>
        </tbody></table></div>
      </div>
    </section>

    <UModal v-model:open="createOpen" title="新建角色模板" description="编码创建后应保持稳定；数据范围不在角色中配置。" :dismissible="!saving" :ui="{ content: 'sm:max-w-xl' }">
      <template #body><div class="form-grid">
        <UFormField label="角色名称" required><UInput v-model="form.name" placeholder="例如：销售助理" /></UFormField>
        <UFormField label="角色编码" required><UInput v-model="form.code" class="code" placeholder="SALES_ASSISTANT" /></UFormField>
        <UFormField label="适用板块" required><USelect v-model="form.domain" :items="domains" /></UFormField>
        <UFormField label="状态"><USelect v-model="form.status" :items="[{ label: '启用', value: 'ACTIVE' }, { label: '停用', value: 'DISABLED' }]" value-key="value" /></UFormField>
      </div><div class="inline-alert" style="margin-top: 14px"><UIcon name="i-lucide-shield" size="16" /><span>角色仅保留名称、编码、板块和状态。创建后权限为空，请通过树形授权显式选择当前菜单叶子与资源。</span></div></template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="createOpen = false" /><UButton color="primary" label="创建并继续授权" :loading="saving" @click="createRole" /></div></template>
    </UModal>
    <AuthorizationDrawer v-model:open="authOpen" subject-type="role" :subject-id="authTarget.id" :subject-name="authTarget.name" @saved="refresh" />
  </div>
</template>
