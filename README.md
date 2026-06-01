# 码盒

> **Vibe Coding 灵感管理器** — 本地仓库收纳 + AI 辅助阅读 + 灵感二次创作

[![Release](https://img.shields.io/github/v/release/lovewold/codebox?label=release)](https://github.com/lovewold/codebox/releases)

Vibe Coding 时代，每个人都能用 AI 快速生成项目。GitHub 上每天涌现海量创意——克隆下来、看懂它、改造它，你的灵感不该散落一地。

码盒就是你的本地灵感盒子：**一键克隆、分类整理、README 预览、AI 翻译阅读、Git 管理、内置终端**——从「看到项目」到「跑起来」再到「改一版」，全在盒子里完成。

---

## 快速安装（Windows）

1. 打开 [Releases](https://github.com/lovewold/codebox/releases/latest) 下载 **`码盒 Setup x.x.x.exe`**
2. **双击安装程序**完成向导安装（会自动创建桌面快捷方式）
3. 本机需已安装 [Git](https://git-scm.com/)

> 不要直接运行 `win-unpacked` 里的 exe；若已便携运行，可在 **设置 → 通用 → 应用安装与快捷方式** 中创建桌面快捷方式或运行安装程序。

---
## 产品定位

```
GitHub 发现 → 码盒本地管理 → README + AI 快速理解 → 本地改造 → 推回 GitHub
                  ↑                                    ↑
             Vibe Coding                          你的二次创作
              灵感来源
```

码盒的核心用户是 **Vibe Coder**——用自然语言驱动 AI 写代码的人。典型流程：

1. 在 GitHub 上发现一个有意思的项目
2. 克隆到码盒，点开 README（有中文版则默认显示中文）
3. 用内置终端跑 `claude` / `npm run dev`，文件树会自动跟上变更
4. AI 助手翻译或解释，本地改一版、提交、推回

---

## 功能概览

### 灵感收纳

- **一键克隆** — 粘贴 GitHub 链接，自动 clone 到本地工作区（云端仓库）
- **本地 / 云端双模式** — 本地=纯文件夹（无需 Git）；云端=Git 仓库；新建时可选择类型
- **工作区自动扫描** — 启动与刷新时自动识别工作区内的 Git 项目与本地文件夹
- **拖放添加** — 拖放文件夹到顶部栏添加本地仓库；详情页拖放可更换路径
- **分类整理** — 默认「个人 / 工作」一级分类，Skill、AI Agent 等二三级子分类
- **三种视图** — 网格、列表、紧凑（侧边栏 + 详情）
- **外部启动** — Codex、Cursor、Edge 一键打开当前仓库
### 理解代码

- **README 富文本预览** — GFM、代码高亮、图片
- **中文版 README 优先** — 自动识别根目录常见中文文件名（见下表），有则默认显示中文，可切换原文
- **AI 一键翻译** — 无中文版时可翻译；结果写入 `README-CN.md`（若已有 `README_CN.md` 等则写入对应文件）
- **文件浏览器** — 目录树 + 代码/Markdown 预览；**目录变更自动刷新**（监听 + 手动刷新）
- **AI 对话助手** — 多模型厂商，仓库上下文，中文解释代码

### 本地改造

- **Git 管理面板** — stage、commit、push、pull、分支切换
- **内置终端** — xterm，按仓库复用会话；**文档 / 终端** 分标签，不互相挤压布局
- **终端配色** — 设置 → 通用 → 终端配色（默认暖色）

### 安装与快捷方式

- **向导式安装包** — NSIS 安装，可选目录，自动创建桌面与开始菜单快捷方式
- **应用内管理** — 设置 → 通用 → 应用安装与快捷方式：创建快捷方式、打开安装目录
### GitHub 探索

- 在线搜索、Cookie 登录态、搜索结果一键入库

---

## README 文件约定

| 类型 | 识别规则 |
|------|----------|
| **原文** | `README.md`、`readme.md`、`Readme.md`、`README.MD`、`README` |
| **中文版** | `README-CN.md`、`README_CN.md`、`readme-cn.md`、`README.zh-CN.md`、`README_ZH.md` 等；亦匹配根目录下 `readme*zh*` / `readme*cn*` 的 `.md` |
| **展示** | 同时存在原文与中文版时，**默认显示中文**；工具栏可切换「显示原文」 |
| **AI 翻译输出** | 若仓库已有中文版文件则覆盖该文件，否则新建 `README-CN.md` |

---

## 迭代计划

### v0.2 — 灵感 feed 流

- GitHub Trending、语言订阅、星标批量克隆、本地评分

### v0.3 — 更强 AI 能力

- 代码解释链路、跨仓库语义搜索、项目对比、自动生成 README

### v0.4 / v0.5

- 仓库笔记、灵感合集、macOS/Linux、可选云端同步

详见 [CHANGELOG.md](./CHANGELOG.md)（当前最新 **v0.1.1**）。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端 | React 18 + TypeScript 5 |
| 终端 | @xterm/xterm + node-pty |
| 状态管理 | Zustand 5 |
| 构建 | Vite 6 + vite-plugin-electron |
| 样式 | Tailwind CSS 3 |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| 本地存储 | electron-store 10 |
| 打包 | electron-builder (NSIS) |

---

## 环境要求

- Windows 10/11（当前主要适配平台）
- Node.js 18+
- Git（克隆、扫描、Git 面板必需）

## 开发

```bash
npm install
npm run dev
```

请使用 **`npm run dev` 弹出的 Electron 桌面窗口**，不要仅用浏览器打开 localhost（否则无 `electronAPI`）。

可选：

```bash
# 终端原生模块异常时
npm run rebuild:pty

# 打开 DevTools
set CODEBOX_DEVTOOLS=1
npm run dev
```

## 打包

```bash
npm run electron:build
# 安装包 → release/码盒 Setup x.x.x.exe
```

安装包为**向导式 NSIS**，安装后自动创建桌面快捷方式。发布时请将 `.exe` 上传至 [GitHub Releases](https://github.com/lovewold/codebox/releases)。

---

## 数据说明

- 仓库列表、分类、AI 模型、终端配色等：`electron-store`（本地 JSON）
- 聊天记录：浏览器 `localStorage`
- README 翻译缓存：按仓库路径 + 原文 hash
- 默认克隆路径：`文档/码盒/repos`
- API Key 仅存本地，不上传远程

**提交 Git 时请勿包含**（已写入 `.gitignore`，提交前请 `git status` 核对）：

| 类型 | 说明 |
|------|------|
| 克隆的仓库代码 | 工作区目录（默认 `文档/码盒/repos`）；若设在项目内，对应 `repos/`、`码盒/` 等 |
| 应用配置与密钥 | `mahe-data.json`（electron-store）、`.env`、模型 API Key |
| 本地助手配置 | 项目内 `.claude/`、`settings.local.json` 等 |
| 构建产物 | `dist/`、`release/`、`node_modules/` |

若工作区用了自定义文件夹名，请在 `.gitignore` 末尾追加该目录。

---

## 文档

| 文件 | 说明 |
|------|------|
| [CHANGELOG.md](./CHANGELOG.md) | 版本变更记录 |
| [docs/RELEASE_v0.1.1.md](./docs/RELEASE_v0.1.1.md) | **v0.1.1 发布声明**（安装、亮点） |
| [docs/GITHUB_RELEASE_v0.1.1.md](./docs/GITHUB_RELEASE_v0.1.1.md) | GitHub Release 页面正文 |
| [docs/RELEASE_v0.1.0.md](./docs/RELEASE_v0.1.0.md) | v0.1.0 发布声明 |
| [docs/CODE_REVIEW.md](./docs/CODE_REVIEW.md) | 代码审查备忘与提交前检查清单 |
