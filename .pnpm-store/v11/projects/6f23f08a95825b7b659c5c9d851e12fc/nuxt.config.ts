export default defineNuxtConfig({
  compatibilityDate: '2026-08-01',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/ui'],
  ui: {
    fonts: false,
    // The permission center has a deliberately light visual system. Disabling
    // automatic OS color-mode syncing prevents teleported Nuxt UI overlays
    // (modal / slideover) from inheriting a persisted dark preference.
    colorMode: false,
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN', class: 'light' },
      title: '权限中心 · 企业中台',
      meta: [
        { name: 'description', content: 'RBAC 角色模板、用户直接加授、菜单权限包与组织岗位数据范围的纯前端静态演示。' }
      ]
    }
  },
  nitro: {
    preset: 'static',
    prerender: {
      routes: ['/', '/users', '/roles', '/catalog', '/menus', '/organization', '/simulator', '/audit', '/docs']
    }
  },
  typescript: {
    strict: true,
    // Run type checking as its own CI gate (`npm run typecheck`) instead of
    // invoking Vue/Volar a second time while Vite creates the bundle.
    typeCheck: false
  }
})
