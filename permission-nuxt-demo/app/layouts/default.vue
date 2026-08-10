<script setup lang="ts">
const route = useRoute()

const navigation = [
  { to: '/', label: '权限总览', icon: 'i-lucide-layout-dashboard' },
  { to: '/users', label: '用户管理', icon: 'i-lucide-users-round' },
  { to: '/roles', label: '角色模板', icon: 'i-lucide-shield-check' },
  { to: '/catalog', label: '功能与资源', icon: 'i-lucide-boxes' },
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
        <UBadge color="primary" variant="subtle" label="单企业模式" />
        <p>角色模板 + 用户加授 + 菜单包 + 组织岗位数据范围。不包含多租户或用户级 DENY。</p>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div class="breadcrumb">
          <span>企业中台</span>
          <UIcon name="i-lucide-chevron-right" size="12" /><strong>{{ currentLabel }}</strong>
        </div>
        <div class="actor-pill" title="Demo 请求默认以后端配置的权限管理员身份执行">
          <div class="actor-avatar">周</div>
          <div class="actor-copy"><b>周睿</b><span>权限管理员 · Demo Actor</span></div>
          <UBadge color="success" variant="subtle" size="sm" label="在线" />
        </div>
      </header>
      <div class="page-wrap">
        <slot />
      </div>
    </main>
  </div>
</template>
