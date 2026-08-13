<script setup lang="ts">
import type { MenuNode } from '~/types/permission'

definePageMeta({ title: '菜单权限包' })
const { showError, showSuccess } = useAppApi()
const { mockFetch } = useMockApi()
const { data: catalog, refresh, pending } = await useAsyncData('menus-catalog', () => mockFetch<any>('/api/catalog'))
const selectedId = ref('m_customer')
const createOpen = ref(false)
const bindingOpen = ref(false)
const saving = ref(false)
const bindingSearch = ref('')
const bindingReason = ref('')
const bindingLevels = reactive<Record<string, 'CORE' | 'OPTIONAL' | 'NONE'>>({})
const nodeCodePrefixes = { BOARD: 'BOARD_', DIRECTORY: 'DIR_', MENU: 'MENU_' } as const
const form = reactive({ nodeType: 'MENU' as 'BOARD' | 'DIRECTORY' | 'MENU', name: '', code: 'MENU_', parentId: undefined as string | undefined, permissionCode: 'menu.', routePath: '' })

const allMenus = computed<MenuNode[]>(() => catalog.value?.menus || [])
const selected = computed(() => allMenus.value.find(item => item.id === selectedId.value) || null)
const currentBindings = computed(() => (catalog.value?.menuBindings || []).filter((item: any) => item.menuId === selectedId.value))
const boardOptions = computed(() => allMenus.value.filter(item => item.nodeType === 'BOARD').map(item => ({ label: item.name, value: item.id })))
const directoryOptions = computed(() => allMenus.value.filter(item => item.nodeType === 'DIRECTORY').map(item => ({ label: `${allMenus.value.find(parent => parent.id === item.parentId)?.name || ''} / ${item.name}`, value: item.id })))
const parentOptions = computed(() => form.nodeType === 'DIRECTORY' ? boardOptions.value : form.nodeType === 'MENU' ? directoryOptions.value : [])
const bindingCandidates = computed(() => (catalog.value?.resources || []).filter((item: any) => item.status === 'ACTIVE' && `${item.name} ${item.code}`.toLowerCase().includes(bindingSearch.value.toLowerCase())))
const coreCount = computed(() => Object.values(bindingLevels).filter(level => level === 'CORE').length)
const optionalCount = computed(() => Object.values(bindingLevels).filter(level => level === 'OPTIONAL').length)

watch(() => form.nodeType, (type) => {
  const suffix = form.code.replace(/^(BOARD_|DIR_|MENU_)/, '')
  form.code = `${nodeCodePrefixes[type]}${suffix}`
  form.parentId = undefined
  if (type !== 'MENU') {
    form.permissionCode = ''
    form.routePath = ''
  } else if (!form.permissionCode) {
    form.permissionCode = 'menu.'
  }
})

function selectMenu(node: MenuNode) { selectedId.value = node.id }
function openBindings() {
  if (selected.value?.nodeType !== 'MENU') return
  Object.keys(bindingLevels).forEach(key => delete bindingLevels[key])
  for (const item of currentBindings.value) bindingLevels[item.permissionId] = item.bundleLevel
  bindingReason.value = ''
  bindingSearch.value = ''
  bindingOpen.value = true
}
function setLevel(item: any, level: 'CORE' | 'OPTIONAL' | 'NONE') { if (level !== 'CORE' || item.riskLevel !== 'HIGH') bindingLevels[item.id] = level }
function resetMenu() { Object.assign(form, { nodeType: 'MENU', name: '', code: 'MENU_', parentId: undefined, permissionCode: 'menu.', routePath: '' }) }
function openCreateMenu() { resetMenu(); createOpen.value = true }

async function createMenu() {
  saving.value = true
  try {
    const result = await mockFetch<any>('/api/menus', { method: 'POST', body: form })
    showSuccess('菜单节点已创建', form.nodeType === 'MENU' ? '页面菜单已插入树中；下一步可发布 CORE / OPTIONAL 权限包。' : '新节点已插入所选父级。')
    createOpen.value = false; resetMenu(); await refresh(); selectedId.value = result.id
  } catch (error) { showError(error) } finally { saving.value = false }
}

async function publishBindings() {
  const corePermissionIds = Object.entries(bindingLevels).filter(([, level]) => level === 'CORE').map(([id]) => id)
  const optionalPermissionIds = Object.entries(bindingLevels).filter(([, level]) => level === 'OPTIONAL').map(([id]) => id)
  saving.value = true
  try {
    await mockFetch(`/api/menus/${selectedId.value}/bindings`, { method: 'PUT', body: { corePermissionIds, optionalPermissionIds, reason: bindingReason.value } })
    showSuccess('菜单权限包已发布', '目录与策略版本已提升；高风险能力保持 OPTIONAL。')
    bindingOpen.value = false; await refresh()
  } catch (error) { showError(error) } finally { saving.value = false }
}
</script>

<template>
  <div>
    <PageHeader title="板块 → 目录 → 页面菜单" description="板块与目录只用于分组；页面菜单携带资源包。授予菜单时自动展开 CORE，高风险资源保持 OPTIONAL。"><UButton color="primary" icon="i-lucide-panel-top-open" label="新建菜单节点" @click="openCreateMenu" /></PageHeader>
    <div class="split-grid">
      <section class="panel"><div class="panel-head"><div><h2>目录菜单树</h2><p>新增子菜单不会自动进入历史父节点授权。</p></div><UButton color="neutral" variant="ghost" icon="i-lucide-refresh-cw" :loading="pending" @click="refresh()" /></div><div class="panel-body"><MenuManagementTree :nodes="catalog?.menuTree || []" :selected-id="selectedId" @select="selectMenu" /></div></section>
      <section class="panel">
        <template v-if="selected"><div class="panel-head"><div><h2>{{ selected.name }}</h2><p class="code">{{ selected.code }}</p></div><UButton v-if="selected.nodeType === 'MENU'" color="primary" variant="soft" icon="i-lucide-package-open" label="编辑权限包" @click="openBindings" /></div>
          <div class="panel-body"><div class="detail-hero"><div style="display: flex; justify-content: space-between; gap: 12px"><div><UBadge color="primary" variant="subtle" :label="selected.nodeType" /><h3 style="margin-top: 10px">{{ selected.name }}</h3><p>{{ selected.nodeType === 'MENU' ? '这是可授权的页面菜单叶子。CORE 资源随菜单展开，OPTIONAL 资源由管理员单独选择。' : '这是结构分组节点；授权快照不会保存未来后代通配授权。' }}</p></div><UIcon :name="selected.nodeType === 'BOARD' ? 'i-lucide-layout-grid' : selected.nodeType === 'DIRECTORY' ? 'i-lucide-folder-tree' : 'i-lucide-panel-top'" size="32" style="color: #246bfd" /></div>
            <div class="detail-grid"><div class="detail-cell"><span>上级</span><b>{{ allMenus.find(item => item.id === selected?.parentId)?.name || '根节点' }}</b></div><div class="detail-cell"><span>状态</span><b>{{ selected.status }}</b></div><div class="detail-cell"><span>前端路由</span><b class="code">{{ selected.routePath || '—' }}</b></div><div class="detail-cell"><span>授权叶子</span><b class="code">{{ selected.permissionId || '无' }}</b></div></div></div>
            <div v-if="selected.nodeType === 'MENU'" class="panel" style="margin-top: 16px; box-shadow: none"><div class="panel-head"><div><h3>当前已发布资源包</h3><p>{{ selected.coreCount || 0 }} CORE · {{ selected.optionalCount || 0 }} OPTIONAL</p></div></div><div class="panel-body source-list"><div v-for="item in currentBindings" :key="item.permissionId" class="source-card"><div style="display: flex; justify-content: space-between; gap: 10px"><b>{{ item.name }}</b><UBadge :color="item.bundleLevel === 'CORE' ? 'primary' : 'neutral'" variant="subtle" :label="item.bundleLevel" /></div><p class="code">{{ item.code }} · {{ item.type }} · {{ item.riskLevel }}</p></div><EmptyState v-if="!currentBindings.length" title="尚未绑定权限包" description="页面菜单可以先创建，再发布至少一项安全的 CORE 资源。"><UButton color="primary" size="sm" label="配置权限包" @click="openBindings" /></EmptyState></div></div>
          </div></template><EmptyState v-else title="请选择一个菜单节点" description="从左侧树中选择板块、目录或页面菜单查看详情。" icon="i-lucide-panel-left" />
      </section>
    </div>

    <UModal v-model:open="createOpen" title="新建目录菜单节点" description="新建与编辑完全分离；保存后会真实插入树并选中。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body><div class="form-grid"><UFormField label="节点类型" required class="span-2"><div class="tab-strip"><button v-for="type in ['BOARD', 'DIRECTORY', 'MENU']" :key="type" class="tab-button" :class="{ active: form.nodeType === type }" @click="form.nodeType = type as any">{{ type === 'BOARD' ? '板块' : type === 'DIRECTORY' ? '目录' : '页面菜单' }}</button></div></UFormField><UFormField label="名称" required><UInput v-model="form.name" placeholder="例如：商机列表" /></UFormField><UFormField label="菜单编码" required><UInput v-model="form.code" class="code" placeholder="MENU_CRM_OPPORTUNITY_LIST" /></UFormField><UFormField v-if="form.nodeType !== 'BOARD'" label="上级节点" required><USelect v-model="form.parentId" :items="parentOptions" value-key="value" placeholder="选择合法父节点" /></UFormField><template v-if="form.nodeType === 'MENU'"><UFormField label="菜单权限码" required><UInput v-model="form.permissionCode" class="code" placeholder="menu.info.opportunity.list" /></UFormField><UFormField label="前端路由" required><UInput v-model="form.routePath" class="code" placeholder="/info/opportunity/list" /></UFormField></template></div><div class="inline-alert" style="margin-top: 14px"><UIcon name="i-lucide-info" size="16" /><span>节点编码会按类型预填 <span class="code">BOARD_ / DIR_ / MENU_</span>；页面菜单权限码预填 <span class="code">menu.</span>。排序、图标和组件键使用系统默认值。</span></div></template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="createOpen = false" /><UButton color="primary" label="创建节点" :loading="saving" @click="createMenu" /></div></template>
    </UModal>

    <USlideover v-model:open="bindingOpen" :title="`发布权限包 · ${selected?.name || ''}`" description="CORE 自动随菜单授予；OPTIONAL 由用户或角色单独选择。" :dismissible="!saving" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body><div class="toolbar"><UInput v-model="bindingSearch" class="search-box" icon="i-lucide-search" placeholder="搜索业务资源" /><div class="tags"><UBadge color="primary" variant="subtle" :label="`${coreCount} CORE`" /><UBadge color="neutral" variant="subtle" :label="`${optionalCount} OPTIONAL`" /></div></div><div class="source-list"><div v-for="item in bindingCandidates" :key="item.id" class="source-card"><div style="display: flex; gap: 12px; align-items: center"><div style="min-width: 0; flex: 1"><b>{{ item.name }}</b><p class="code">{{ item.code }} · RESOURCE · {{ item.riskLevel }}</p></div><div class="tab-strip"><button class="tab-button" :aria-label="`${item.name} 不绑定`" :class="{ active: bindingLevels[item.id] === 'NONE' || !bindingLevels[item.id] }" @click="setLevel(item, 'NONE')">不绑定</button><button class="tab-button" :aria-label="`${item.name} CORE`" :disabled="item.riskLevel === 'HIGH'" :class="{ active: bindingLevels[item.id] === 'CORE' }" @click="setLevel(item, 'CORE')">CORE</button><button class="tab-button" :aria-label="`${item.name} OPTIONAL`" :class="{ active: bindingLevels[item.id] === 'OPTIONAL' }" @click="setLevel(item, 'OPTIONAL')">OPTIONAL</button></div></div></div></div><div class="inline-alert warning" style="margin-top: 14px"><UIcon name="i-lucide-triangle-alert" size="16" /><span>菜单权限包只绑定资源；高风险资源永远不能设为 CORE。发布会生成 before / after 审计，并刷新受影响策略版本。</span></div><UFormField label="变更说明（选填）" style="margin-top: 14px"><UTextarea v-model="bindingReason" autoresize placeholder="简要说明本次菜单权限包变更" /></UFormField></template>
      <template #footer><div class="modal-actions"><UButton color="neutral" variant="ghost" label="取消" :disabled="saving" @click="bindingOpen = false" /><UButton color="primary" icon="i-lucide-send" label="发布权限包" :loading="saving" @click="publishBindings" /></div></template>
    </USlideover>
  </div>
</template>
