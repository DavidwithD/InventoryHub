此目录包含对 `Categories` 页面进行重构后独立的组件与 hooks。

目的
- 将页面逻辑拆分为更小、更易维护的组件与 hooks。
- 保持 UI（组件）与数据/业务逻辑（hooks）分离，便于测试与复用。

目录结构
- `components/`
  - `CategoriesToolbar.tsx` — 工具栏/新增按钮。
  - `CategoriesTable.tsx` — 表格与删除确认（只负责渲染和触发事件回调）。
  - `CategoryDialog.tsx` — 新增/编辑对话框（管理自身表单状态与本地校验）。
- `hooks/`
  - `useCategories.ts` — 提供 `loadCategories`、`createCategory`、`updateCategory`、`deleteCategory`，并负责刷新列表。

已完成的重构要点
- `app/categories/page.tsx` 已改为容器组件：负责组合 hooks 与 components，管理页面级 snackbar 与对话框开启/关闭。
- 表格组件包含本地删除确认对话框，避免容器重复实现确认逻辑。
- 对话框组件管理本地表单状态并通过 `onSave(payload)` 将已校验的数据回传给容器。

运行和手动验证
- 在项目根目录启动前端开发服务器：

```bash
cd inventory-hub-frontend
npm run dev
```

- 手动验证要点：
  - 打开 `Categories` 页面，检查列表是否加载。
  - 新增分类、编辑分类、删除分类（确认对话框）是否工作并显示 snackbar。

改进建议（可选）
- 将 `CategoryDialog` 的 `alert()` 校验替换成统一的 `Snackbar` 回调（容器提供 `onNotify`）。
- 添加单元测试：对 `useCategories` 做 mock API 测试；对 `CategoryDialog` 做行为测试（输入/保存）。
- 若其它页面也需要 `useSuppliers` 或类似 hook，可考虑放到 `app/hooks/` 做跨页面共享。

作者 / 维护
- 重构由自动化助手与开发者协作完成。若你希望我继续：我可以把 dialog 的校验消息统一到页面 snackbar，或启动 dev 并做一遍手工验证并修复问题。