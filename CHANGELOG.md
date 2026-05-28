# 更新日志

本文件记录码盒桌面端的重要变更，便于提交 Git 与发布说明。

## [未发布] — 2026-05-28

### 新增

- **内置终端**：仓库详情内 xterm 终端，按 `repoPath` 复用 PTY 会话；切换仓库/标签不杀进程，关闭应用时清理进程树。
- **终端配色**：设置 → 通用 → 终端配色（默认暖色/橙调）。
- **文件树自动刷新**：监听仓库目录变更（`fs.watch` + 防抖），窗口聚焦时补刷；侧栏提供手动刷新按钮。
- **文档区标签**：README/文件预览与「终端」分标签展示，避免与终端争用布局宽度。
- **代码预览**：非 Markdown 文件支持 highlight.js 高亮。
- **中文版 README**：支持 `README-CN.md`、`README_CN.md`、`README.zh-CN.md` 等；有中文版时默认优先展示。

### 修复

- Electron 预加载（CJS）与白屏：`loadAll` / `categoryIds` 规范化。
- 终端连接：WinPTY、`taskkill` 进程树、完整 `process.env`（修复 `claude` 等 CLI 找不到）。
- 终端列宽异常换行：`fitTerminal` 重试 + 仅在终端标签挂载时 fit。
- 文件树在终端/Claude 生成新文件后不更新的问题。

### 开发

- `npm run rebuild:pty`：重建 `node-pty` 原生模块。
- `CODEBOX_DEVTOOLS=1 npm run dev`：可选打开 DevTools。

### 已知限制

- Windows 下目录监听可能因 `node_modules` 等大目录产生多余刷新事件（已防抖，后续可加忽略规则）。
- 渲染进程与主进程的 README 文件名规则需保持两份列表同步（`electron/readme-files.ts` / `src/lib/readmeFiles.ts`）。
