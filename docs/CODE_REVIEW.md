# 代码审查备忘（提交 Git 前）

审查范围：近期 Electron 终端、文件树、README 中文版、仓库详情 UI 相关改动。  
审查日期：2026-05-28

---

## 总体结论

**可以提交。** 架构清晰（主进程 PTY / 文件监听 / README 解析分离），用户反馈的主要问题已覆盖。提交前建议本地跑一遍 `npm run build` 与 `npm run dev` 冒烟测试。

---

## 做得好的地方

| 模块 | 说明 |
|------|------|
| `electron/terminal-manager.ts` | 按仓库复用 PTY、`destroyAll` 退出清理、resize 边界检查 |
| `electron/file-tree-watcher.ts` | 引用计数，多组件订阅同一仓库时不会误关 watcher |
| `electron/readme-files.ts` | 主/中文 README 分离，避免把 `README_CN.md` 当原文 |
| `src/lib/fitTerminal.ts` | 解决 xterm 在 0 宽度下 fit 导致列数过小的问题 |
| `src/components/RepoDetail.tsx` | 终端与文档分标签；`keepAlive` 与 store 会话状态一致 |
| 安全边界 | `contextIsolation` + preload 白名单 IPC，未向渲染进程暴露任意 shell |

---

## 建议改进（非阻塞）

### 1. README 文件名规则重复维护（中）

- `electron/readme-files.ts` 与 `src/lib/readmeFiles.ts` 逻辑需手动同步。
- **后续**：抽到 `shared/readme-files.ts` 供 Vite 与 Electron 共用，或仅主进程判断、IPC 返回 `chineseFileName`。

### 2. 目录监听在大仓库上的开销（中）

- `fs.watch(..., { recursive: true })` 会收到 `node_modules` 内大量事件；列表接口虽过滤，但仍会触发防抖刷新。
- **后续**：换 `chokidar` 并 `ignored: ['**/node_modules/**', '**/.git/**']`，或仅在用户点击刷新时拉取。

### 3. `FileTree` 刷新时的双重 `loadChildren`（低）

- `refreshKey` 变化时，已展开目录会再次 `loadChildren`；与 `expanded && children === null` 的 effect 可能连续请求两次。
- **影响**：轻微多余 IO，可合并为单次。

### 4. 终端环境变量全量继承（低 / 有意为之）

- PTY 使用完整 `process.env` 以支持 `claude`、npm 全局命令。
- **注意**：从 GUI 启动时 PATH 仍可能少于用户终端；文档已说明可从已配置环境的终端里 `npm run dev`。

### 5. 类型与 API 契约（低）

- `ReadmeResult.chineseFileName` 已加入 preload 类型；若新增 IPC，记得同步 `electron/preload.ts` 与 `src/vite-env.d.ts`（经 `ElectronAPI` 间接引用）。

---

## 提交前检查清单

- [ ] `npm run build` 通过
- [ ] `npm run dev`：选仓库 → 文档默认中文 README（若有 `README_CN.md`）
- [ ] 打开终端 → 输入 `claude` 或 `where claude` 正常
- [ ] 终端内新建文件 → 文件树自动出现（或点刷新按钮）
- [ ] 切换「文档 / 终端」标签 → 终端无异常窄列换行
- [ ] 退出应用 → 任务管理器无残留 `cmd.exe` 子进程
- [ ] `git status` 无 `repos/`、`码盒/`、`.claude/`、`mahe-data.json`、克隆进来的第三方仓库
- [ ] 确认未提交 `.env`、API Key、electron-store 数据（系统目录或误拷到项目根的 `mahe-data.json`）

---

## 建议的 Git 提交拆分（可选）

若希望历史清晰，可拆为 2～3 个 commit：

1. `feat(terminal): embedded xterm with session reuse and theme`
2. `feat(repo): file tree watch refresh and chinese readme detection`
3. `fix(electron): preload cjs, env passthrough, and layout fit`

也可合并为单个 `feat: repo detail terminal, file tree sync, and readme cn support`。

---

## 未纳入本次审查

- AI Agent / GitHub 探索 / 模型配置等未改模块
- 单元测试（项目当前以手动冒烟为主）
