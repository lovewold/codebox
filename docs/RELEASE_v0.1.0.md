# 码盒 v0.1.0 发布声明

**发布日期**：2026-05-28  
**版本号**：v0.1.0  
**适用平台**：Windows 10 / 11（64 位）  
**项目仓库**：https://github.com/lovewold/codebox

---

## 发布摘要

**码盒**是一款面向 Vibe Coder 的桌面应用：把 GitHub 上感兴趣的项目克隆到本地，用 README、文件树、内置终端和 AI 助手快速理解并动手改造，而不用在 IDE、浏览器和多个工具之间来回切换。

v0.1.0 为**首个公开测试版**，核心链路已打通：导入仓库 → 阅读文档 → 终端执行 → Git 管理。欢迎尝鲜反馈，后续版本将按使用体验持续迭代。

---

## 下载与安装

### 方式一：安装包（推荐）

1. 在 [GitHub Releases](https://github.com/lovewold/codebox/releases/tag/v0.1.0) 下载 **`码盒 Setup 0.1.0.exe`**（或当前 Release 页列出的 Windows 安装包）。
2. 双击运行安装程序，按向导完成安装。
3. 从开始菜单或桌面快捷方式启动 **码盒**。

### 方式二：自行构建

```bash
git clone https://github.com/lovewold/codebox.git
cd codebox
npm install
npm run electron:build
```

构建完成后，安装包位于 `release/` 目录。

### 环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 / 11 |
| 运行时 | 安装包已内置 Electron，无需单独安装 Node |
| Git | 需已安装并可在命令行使用（克隆、Git 面板） |
| 网络 | 克隆与 GitHub 探索需要联网；AI 功能需自行配置 API |

默认工作区路径：`文档/码盒/repos`（可在设置中修改）。

---

## 本版本亮点

### 灵感收纳

- 粘贴 GitHub 链接一键克隆到本地工作区  
- 自动扫描语言、README 摘要、Git 分支与未提交变更  
- 网格 / 列表 / 紧凑三种浏览视图，支持分类管理  

### 读懂项目

- README 富文本预览（GFM、代码高亮）  
- **中文版 README 优先**：自动识别 `README-CN.md`、`README_CN.md`、`README.zh-CN.md` 等，有中文版默认展示  
- 内置文件树 + 代码/Markdown 预览  
- **文件树自动刷新**：终端或外部工具生成新文件后自动更新，亦可手动刷新  

### 动手改造

- **内置终端**（xterm）：在仓库目录直接运行 `npm`、`claude` 等命令；按仓库复用会话  
- 文档区与终端 **分标签切换**，布局更稳定  
- Git 管理面板：暂存、提交、推送、拉取、切换分支  
- 终端配色可在「设置 → 通用」中调整（默认暖色主题）  

### 探索与 AI

- GitHub 搜索与一键入库  
- AI 对话助手（需配置模型 API Key）  
- README 一键翻译为中文（可写入 `README-CN.md`）  

---

## 隐私与安全说明

- 仓库列表、分类、模型配置等数据保存在**本机**（electron-store），不会上传至码盒服务器。  
- API Key 仅存储在本地，由你配置的厂商接口直接调用。  
- 克隆的第三方项目代码保存在你指定的工作区目录，请自行遵守原项目许可证。  

---

## 已知问题与限制

1. **仅正式支持 Windows**；macOS / Linux 尚未适配。  
2. 大仓库下文件监听可能对 `node_modules` 等目录产生较多刷新（已防抖，后续将优化忽略规则）。  
3. 全局 Git 代理若为 `socks5`，Git Credential Manager 登录可能失败；登录时可临时取消代理，推送时建议使用 `http://127.0.0.1:端口` 形式的 HTTP 代理。  
4. 终端在极少数布局切换场景下若出现列宽异常，可切换到「终端」标签或调整窗口大小后恢复。  
5. v0.1.0 为测试版，不建议用于生产环境或存放敏感密钥的仓库。  

---

## 反馈与支持

- **问题反馈**：[GitHub Issues](https://github.com/lovewold/codebox/issues)  
- **功能建议**：欢迎在 Issues 中标注 `enhancement`  

感谢试用码盒。若这个项目对你有帮助，欢迎在 GitHub 点个 Star。

---

**码盒团队**  
*让 Vibe Coding 的灵感，装得进一只盒子。*
