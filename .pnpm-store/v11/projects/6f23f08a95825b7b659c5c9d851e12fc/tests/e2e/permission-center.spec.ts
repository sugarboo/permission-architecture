import { expect, test } from '@playwright/test'

async function waitForNuxt(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown } | null)?.__vue_app__))
}

test('overview and navigation expose the current demo scope', async ({ page }) => {
  await page.goto('/')
  await waitForNuxt(page)
  await expect(page.getByRole('heading', { name: '把授权语言还给业务' })).toBeVisible()
  await expect(page.getByText('单企业模式', { exact: true })).toBeVisible()
  await expect(page.getByText('纯静态 Mock', { exact: true })).toBeVisible()
  await expect(page.getByText('保持 ALLOW-only，权限来源清晰可解释。')).toBeVisible()
  await expect(page.getByRole('link', { name: '组织与岗位' })).toBeVisible()
  await expect(page.getByRole('link', { name: '权限模拟器' })).toHaveCount(0)
})

test('user create and tree authorization flows are interactive', async ({ page }) => {
  await page.goto('/users')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '新建用户' }).click()
  const createDialog = page.getByRole('dialog', { name: '新建用户' })
  await expect(createDialog.getByRole('textbox', { name: '姓名*' })).toBeVisible()
  await expect(createDialog.getByRole('textbox', { name: /工号/ })).toHaveCount(0)
  await expect(createDialog.getByRole('button', { name: '创建用户' })).toBeVisible()
  await createDialog.getByRole('button', { name: '取消' }).click()

  await expect(page.getByRole('columnheader', { name: '策略版本' })).toHaveCount(0)

  await page.getByRole('row', { name: /EMP0108/ }).getByRole('button', { name: '授权' }).click()
  const authDialog = page.getByRole('dialog', { name: /用户授权/ })
  await expect(authDialog.getByRole('heading', { name: '角色模板（可多选）' })).toBeVisible()
  await expect(authDialog.getByText('已选 1 个')).toBeVisible()
  await expect(authDialog.getByRole('tree')).toBeVisible()
  await expect(authDialog.getByRole('button', { name: '数据范围' })).toHaveCount(0)

  const customerMenu = authDialog.getByRole('checkbox', { name: '选择 客户列表' })
  await expect(customerMenu).toBeChecked()
  await expect(customerMenu).toBeDisabled()

  await authDialog.getByRole('checkbox', { name: '选择角色 采购专员' }).click()
  const purchaseMenu = authDialog.getByRole('checkbox', { name: '选择 采购订单' })
  await expect(purchaseMenu).toBeChecked()
  await expect(purchaseMenu).toBeDisabled()

  await authDialog.getByRole('button', { name: /^资源/ }).click()
  await expect(authDialog.getByText('2 项 CORE 已自动反显')).toBeVisible()
  await expect(authDialog.getByText('OPTIONAL 已黄色高亮')).toBeVisible()

  const customerReadCheckbox = authDialog.getByRole('checkbox', { name: '选择 查看客户' })
  const customerReadRow = customerReadCheckbox.locator('xpath=ancestor::div[contains(@class, "tree-row")][1]')
  await expect(customerReadCheckbox).toBeChecked()
  await expect(customerReadRow.getByText(/CORE 自动/)).toBeVisible()

  const customerCreateCheckbox = authDialog.getByRole('checkbox', { name: '选择 新建客户' })
  const customerCreateRow = customerCreateCheckbox.locator('xpath=ancestor::div[contains(@class, "tree-row")][1]')
  await expect(customerCreateCheckbox).toBeChecked()
  await expect(customerCreateRow.getByText('OPTIONAL · 角色已授')).toBeVisible()

  const purchaseApproveCheckbox = authDialog.getByRole('checkbox', { name: '选择 审批采购单' })
  const purchaseApproveRow = purchaseApproveCheckbox.locator('xpath=ancestor::div[contains(@class, "tree-row")][1]')
  await expect(purchaseApproveCheckbox).not.toBeChecked()
  await expect(purchaseApproveRow.getByText('OPTIONAL · 待选')).toBeVisible()
})

test('organization page owns user assignment', async ({ page }) => {
  await page.goto('/organization')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '设置用户任职' }).click()
  const dialog = page.getByRole('dialog', { name: '设置用户组织与岗位' })
  await expect(dialog.getByText('用户任职只在本页维护')).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /工号/ })).toBeVisible()
  await expect(dialog.getByRole('button', { name: '保存任职' })).toBeVisible()
})

test('role and menu creation prefill stable code prefixes', async ({ page }) => {
  await page.goto('/roles')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '新建角色' }).click()
  const roleDialog = page.getByRole('dialog', { name: '新建角色模板' })
  await expect(roleDialog.getByRole('textbox', { name: '角色编码*' })).toHaveValue('ROLE_')
  await expect(roleDialog.getByText('适用板块', { exact: true })).toHaveCount(0)

  await page.goto('/menus')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '新建菜单节点' }).click()
  const menuDialog = page.getByRole('dialog', { name: '新建目录菜单节点' })
  const codeInput = menuDialog.getByRole('textbox', { name: '菜单编码*' })
  await expect(codeInput).toHaveValue('MENU_')
  await menuDialog.getByRole('button', { name: '板块' }).click()
  await expect(codeInput).toHaveValue('BOARD_')
  await menuDialog.getByRole('button', { name: '目录' }).click()
  await expect(codeInput).toHaveValue('DIR_')
})

test('menu package keeps high-risk capabilities out of CORE', async ({ page }) => {
  await page.goto('/menus')
  await waitForNuxt(page)
  await page.getByRole('button', { name: '编辑权限包' }).click()
  const dialog = page.getByRole('dialog', { name: /发布权限包/ })
  await expect(dialog.getByRole('button', { name: '删除客户 CORE' })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '删除客户 OPTIONAL' })).toBeEnabled()
})

test('resource edit flow is available without a second business-resource layer', async ({ page }) => {
  await page.goto('/catalog')
  await waitForNuxt(page)

  await page.getByRole('button', { name: '编辑' }).first().click()
  const resourceDialog = page.getByRole('dialog', { name: '编辑资源' })
  await expect(resourceDialog.getByText('资源码启用后作为研发契约保持不变。')).toBeVisible()
  await expect(resourceDialog.getByText('API → 资源 → 功能的二次映射')).toBeVisible()
  await expect(resourceDialog.getByRole('button', { name: '保存修改' })).toBeVisible()

  await resourceDialog.getByRole('button', { name: '取消' }).click()
  await page.getByRole('button', { name: '新建资源' }).click()
  const createResourceDialog = page.getByRole('dialog', { name: '新建资源' })
  await expect(createResourceDialog.getByRole('textbox', { name: '稳定资源码*' })).toHaveValue('crm.')
  await expect(createResourceDialog.getByText(/数据域/)).toHaveCount(0)
})
