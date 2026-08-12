# 企业中台权限中心 · 纯静态 Demo

这是《企业中台权限架构方案》的可交互 Nuxt 4 演示实现。项目已改为纯前端静态应用：不连接数据库、不启动业务 API，也不需要配置环境变量。所有页面通过内置 Mock 数据仓库运行，变更保存在当前浏览器的 `localStorage`。

> 这是架构与交互演示，不是生产鉴权服务。生产系统仍必须在可信服务端完成身份认证、资源码校验、数据范围过滤和不可篡改审计。

## 已实现能力

- 角色模板（RBAC）与用户直接加授（ALLOW only）。
- 板块 → 目录 → 页面菜单三级树。
- 页面菜单 CORE / OPTIONAL 资源包；CORE 随菜单自动反显，OPTIONAL 显眼提示并由管理员按需选择。
- 原“功能”统一改名为“资源”；前端、后端统一使用 `crm.customer.read`、`sc.purchase_order.create` 一类稳定资源码。
- 删除旧的 REPORT / TEMPLATE 业务资源层；API 只作为直接校验资源码的执行点。
- 单根组织树、岗位及按数据域配置的数据范围。
- 用户创建不设置组织与岗位；在组织页通过用户下拉框统一设置或调整任职。
- 用户授权页不展示数据范围，本期不提供用户临时数据范围。
- 用户、角色、资源、菜单、部门、岗位和任职的新增/编辑模拟。
- 有效权限来源解释、能力 AND 数据范围模拟器及 Mock 审计。
- 右上角“一键重置演示数据”。
- 单企业范围；不包含多租户、用户级 DENY、角色嵌套或通配后代授权。

## 本地开发

要求 Node.js 22.13 或更高版本，推荐使用项目现有的 pnpm 锁文件。

```bash
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:3000`。

## 生成静态项目

```bash
pnpm build
```

构建结果位于：

```text
.output/public/
```

该目录只包含 HTML、CSS、JavaScript 和静态资源，可部署到 Nginx、OSS/CDN、GitHub Pages、Netlify、Vercel Static 等静态托管环境。

本地预览：

```bash
pnpm preview
```

请通过 HTTP 静态服务器访问，不建议直接双击 `index.html`；浏览器对 `file://` 模块加载和前端路由有限制。

## Mock 数据如何工作

浏览器端数据仓库位于：

```text
app/composables/useMockApi.ts
```

它保留了原页面所需的数据契约，但请求不会离开浏览器：

```text
页面调用 mockFetch('/api/users')
  → 浏览器端 Mock 路由分发
  → 内置种子数据 / localStorage
  → 返回与原页面兼容的对象
```

写操作会同步完成以下模拟行为：

1. 更新用户、角色、资源、菜单、组织、岗位或任职数据；
2. 重新计算菜单 CORE、有效权限和数据范围；
3. 提升 `policyVersion` / `catalogVersion`；
4. 生成 before / after Mock 审计；
5. 保存到 `localStorage`。

存储键：

```text
permission-center-static-demo-v2
```

点击页面右上角“重置演示数据”即可清除本机修改并恢复初始数据。不同浏览器或不同设备的数据互不共享。

## 静态 Demo 中的权限判定

```text
有效能力(u)
  = 角色授权(u)
  ∪ 用户直接加授(u)
  ∪ 已授权菜单的 CORE 资源(u)

允许访问(u, 资源, 数据对象)
  = 资源 ∈ 有效能力(u)
  AND 数据对象 ∈ 岗位在该数据域的有效范围
```

用户直授仅支持 ALLOW。菜单父节点只展开当前叶子集合；未来新增页面菜单不会自动进入历史授权。高风险资源不能成为菜单 CORE。

## 目录结构

```text
app/pages/                         九个演示页面
app/components/                    权限树、授权抽屉、组织树等组件
app/composables/useMockApi.ts      Mock 数据、持久化、变更与计算逻辑
app/utils/policy-rules.ts          权限来源合并与数据行判定纯函数
tests/unit/                        规则单元测试
tests/e2e/                         页面交互测试定义
.output/public/                    构建后的纯静态文件
```

旧版 SQLite 文件若仍存在于本地 `.data/`，仅作为历史备份保留，已被 `.gitignore` 排除，也不会参与运行或进入静态产物。

## 质量检查

```bash
pnpm typecheck
pnpm test
pnpm build

# 合并执行以上三项
pnpm verify
```

端到端测试定义仍保留：

```bash
pnpm test:e2e
```

## 生产落地边界

静态 Demo 的 `localStorage` 可被浏览器用户修改，因此只能用于会议展示和交互评审。生产落地至少需要：

1. 企业 SSO / OIDC Session；
2. 服务端逐请求资源码强制校验；
3. 列表、详情、编辑、删除、导出和异步任务复用同一数据范围谓词；
4. 权限目录版本、缓存失效和不可篡改集中审计；
5. 高风险授权审批、定时回收和离职/调岗事件联动。

## 方案资源

- [完整架构方案](../企业中台权限架构方案.md)
- [简化最佳实践版](../%23%20企业中台权限架构设计方案（简化最佳实践版）.md)
- [研发演示概要](../企业中台权限架构研发演示概要.md)
- 应用内 `/docs` 页面也包含核心方案说明。
