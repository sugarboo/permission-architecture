<script setup lang="ts">
const route = useRoute()
const resetOpen = ref(false)
const { resetMockData } = useMockApi()

function confirmReset() {
  resetMockData()
  resetOpen.value = false
  window.location.reload()
}

const navigation = [
  { to: '/', label: '权限总览', icon: 'i-lucide-layout-dashboard' },
  { to: '/users', label: '用户管理', icon: 'i-lucide-users-round' },
  { to: '/roles', label: '角色模板', icon: 'i-lucide-shield-check' },
  { to: '/catalog', label: '资源管理', icon: 'i-lucide-boxes' },
  { to: '/menus', label: '菜单权限包', icon: 'i-lucide-panel-left' },
  { to: '/organization', label: '组织与岗位', icon: 'i-lucide-network' },
  { to: '/simulator', label: '权限模拟器', icon: 'i-lucide-flask-conical' },
  { to: '/audit', label: '授权审计', icon: 'i-lucide-scroll-text' },
  { to: '/docs', label: '方案文档', icon: 'i-lucide-book-open-text' }
]

const currentLabel = computed(() => navigation.find(item => item.to === route.path)?.label || '权限中心')
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand">
        <div class="brand-mark">
          <UIcon name="i-lucide-shield-check" size="20" />
        </div>
        <div>
          <div class="brand-title">企业中台 · 权限中心</div>
          <div class="brand-subtitle">Permission Architecture Demo</div>
        </div>
      </div>

      <div class="nav-section">Permission workspace</div>
      <nav class="nav-list" aria-label="权限中心导航">
        <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" class="nav-link">
          <UIcon :name="item.icon" size="16" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="sidebar-bottom">
        <div class="tags">
          <UBadge color="primary" variant="subtle" label="单企业模式" />
          <UBadge color="success" variant="subtle" label="纯静态 Mock" />
        </div>
        <p>角色模板 + 用户加授 + 菜单资源包 + 组织岗位数据范围。不包含多租户、用户级 DENY 或临时数据范围。</p>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div class="breadcrumb">
          <span>企业中台</span>
          <UIcon name="i-lucide-chevron-right" size="12" /><strong>{{ currentLabel }}</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 10px">
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-rotate-ccw" label="重置演示数据"
            @click="resetOpen = true" />
          <div class="actor-pill" title="静态 Demo 使用浏览器端模拟的权限管理员身份">
            <div class="actor-avatar">周</div>
            <div class="actor-copy"><b>周睿</b><span>权限管理员 · Mock Actor</span></div>
            <UBadge color="success" variant="subtle" size="sm" label="本机" />
          </div>
        </div>
      </header>
      <div class="page-wrap">
        <slot />
      </div>
    </main>

    <UModal v-model:open="resetOpen" title="重置全部演示数据" description="这会清除当前浏览器中新增或修改的用户、角色、菜单和授权，并恢复内置初始数据。"
      :ui="{ content: 'sm:max-w-md' }">
      <template #body>
        <div class="inline-alert warning">
          <UIcon name="i-lucide-triangle-alert" size="16" />
          <span>仅影响当前设备的 localStorage，不涉及数据库或远程服务。</span>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" label="取消" @click="resetOpen = false" />
          <UButton color="error" icon="i-lucide-rotate-ccw" label="确认重置" @click="confirmReset" />
        </div>
      </template>
    </UModal>
  </div>
</template>
