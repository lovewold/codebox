# 码盒 v0.1.1 发布声明

**发布日期**：2026-05-28  
**版本号**：v0.1.1  
**适用平台**：Windows 10 / 11（64 位）  
**项目仓库**：https://github.com/lovewold/codebox

---

## 发布摘要

v0.1.1 在 0.1.0 基础上补齐**仓库管理闭环**：本地/云端双模式、工作区自动扫描、分类整理、安装包与桌面快捷方式，更适合日常长期使用。

---

## 下载与安装

### 推荐：安装包

1. 在 [GitHub Releases](https://github.com/lovewold/codebox/releases/tag/v0.1.1) 下载 **`码盒 Setup 0.1.1.exe`**
2. **双击 Setup 安装程序**（不要直接运行 `win-unpacked` 里的 exe）
3. 按向导完成安装，会自动创建**桌面快捷方式**与开始菜单项
4. 也可在应用内 **设置 → 通用 → 应用安装与快捷方式** 手动创建

### 自行构建

```bash
git clone https://github.com/lovewold/codebox.git
cd codebox
npm install
npm run electron:build
# → release/码盒 Setup x.x.x.exe
```

---

## 本版亮点

| 功能 | 说明 |
|------|------|
| 本地 / 云端仓库 | 本地=纯文件夹；云端=Git/克隆仓库；新建时可选择 |
| 工作区扫描 | 启动时自动识别工作区内的 Git 与本地项目 |
| 分类 | 默认「个人 / 工作」及多级子分类 |
| 拖放与路径 | 拖放添加仓库、详情页拖放更换本地路径 |
| 外部启动 | Codex / Cursor / Edge 一键打开 |
| 安装体验 | 向导式安装 + 桌面快捷方式 |

---

## 环境要求

- Windows 10 / 11（64 位）
- Git（克隆与 Git 面板）
- Node.js 18+（仅开发构建时需要）

---

## 已知限制

- Windows 目录监听对大仓库可能产生多余刷新（已防抖）
- 安装包需通过 Setup 安装以获得最佳快捷方式体验
