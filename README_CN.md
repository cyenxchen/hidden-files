# Obsidian 隐藏指定文件插件

**简体中文** | [English](README.md)

[![版本](https://img.shields.io/badge/版本-0.1.0-blue.svg)](https://github.com/cyenx/obsidian-hide-specified-files)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.11+-purple.svg)](https://obsidian.md/)
[![许可证](https://img.shields.io/badge/许可证-MIT-green.svg)](LICENSE)

一个 Obsidian 插件，允许您通过快速切换按钮在文件管理器中隐藏指定的文件和文件夹。

## ✨ 功能特性

- 🎯 **精确名称匹配**：通过精确名称隐藏文件和文件夹（包括文件扩展名）
- 👁️ **快速切换**：侧边栏图标按钮可即时切换隐藏/显示
  - 🙈 闭眼图标：文件已隐藏（已启用）
  - 👁️ 睁眼图标：所有文件可见（已禁用）
- 🖱️ **右键菜单**：在文件管理器中右键点击任意文件即可快速隐藏
- ⚙️ **设置界面**：通过直观的界面管理您的隐藏项列表
- ⌨️ **命令面板**：通过键盘快捷键切换隐藏功能
- 💾 **持久化**：您的隐藏文件列表会自动保存和恢复

## 📦 安装

### 手动安装

1. 从 [Releases](https://github.com/cyenx/obsidian-hide-specified-files/releases) 页面下载最新版本
2. 将 `main.js` 和 `manifest.json` 解压到您的 vault 插件文件夹中：
   ```
   <vault>/.obsidian/plugins/hide-specified-files/
   ```
3. 重新加载 Obsidian
4. 在 设置 → 第三方插件 中启用该插件

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/cyenx/obsidian-hide-specified-files.git
cd obsidian-hide-specified-files

# 安装依赖
npm install

# 构建插件
npm run build

# 复制到您的 vault
cp main.js manifest.json <vault>/.obsidian/plugins/hide-specified-files/
```

## 🚀 使用方法

### 1. 侧边栏图标（快速切换）

点击左侧边栏中的眼睛图标即可快速切换文件隐藏功能的开/关：

- **闭眼图标** 🙈：隐藏功能已启用（文件已隐藏）
- **睁眼图标** 👁️：隐藏功能已禁用（所有文件可见）

图标会自动更新以反映当前状态。

### 2. 设置界面

**设置 → Hide Specified Files**

- **启用文件隐藏**：总开关
- **添加要隐藏的文件**：输入精确的文件或文件夹名称
  - 对于文件：包含扩展名（例如：`README.md`、`notes.txt`）
  - 对于文件夹：只需文件夹名称（例如：`drafts`、`.obsidian`）
- **管理隐藏列表**：查看和删除隐藏项

### 3. 右键菜单

在文件管理器中右键点击任意文件或文件夹：

- 选择 **"隐藏此文件"** 将其添加到隐藏列表
- 已隐藏的项目会显示 **"已隐藏"**（禁用状态）

### 4. 命令面板

按 `Cmd/Ctrl + P` 并输入：

- **"Toggle file hiding on/off"**（切换文件隐藏开/关）：切换隐藏功能
- **"Refresh File Explorer"**（刷新文件管理器）：手动刷新文件树

## ⚙️ 配置

插件将配置存储在：
```
<vault>/.obsidian/plugins/hide-specified-files/data.json
```

配置结构：
```json
{
  "enabled": true,
  "hiddenNames": [
    "README.md",
    "drafts",
    ".obsidian"
  ]
}
```

## 🔧 开发

### 环境要求

- Node.js 20+
- npm 或 yarn
- Obsidian 1.4.11+

### 从源码构建

```bash
# 安装依赖
npm install

# 开发构建（监听模式）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run typecheck
```

### 技术栈

- **语言**：TypeScript（严格模式）
- **构建工具**：esbuild
- **Obsidian API**：官方 API（1.5.3+）
- **依赖**：
  - `monkey-around`：安全的 Obsidian 内部 monkey patching

### 架构

- **文件匹配**：精确名称匹配（区分大小写）
  - 文件：通过 `name`（含扩展名）匹配
  - 文件夹：通过 `name` 匹配
- **打补丁**：使用 `monkey-around` 对文件管理器方法打补丁
  - `getSortedFolderItems()`：过滤文件夹内容
  - `onFileOpen()`：防止自动定位到隐藏文件
  - `revealInFolder()`：阻止对隐藏项"在文件夹中显示"
- **性能**：使用 Set 数据结构和缓存实现 O(1) 查找

## 🎯 工作原理

该插件采用非侵入式方法：

1. **数据层过滤**：对文件管理器的 `getSortedFolderItems()` 方法打补丁
2. **不修改文件系统**：文件仍保留在磁盘上，仅在 UI 中隐藏
3. **作用范围**：仅影响文件管理器视图（搜索、快速切换器不受影响）
4. **清理卸载**：插件禁用时会正确移除所有补丁

## ⚠️ 重要说明

- **精确匹配**：不同文件夹中的同名文件都会被隐藏
- **仅限文件管理器**：隐藏的文件可能仍会出现在搜索结果和快速切换器中
- **根文件夹**：无法隐藏 vault 根文件夹（安全特性）
- **已打开的文件**：隐藏当前打开的文件不会在编辑器中关闭它

## 🤝 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 仓库
2. 创建您的功能分支（`git checkout -b feature/amazing-feature`）
3. 提交您的更改（`git commit -m 'Add some amazing feature'`）
4. 推送到分支（`git push origin feature/amazing-feature`）
5. 打开一个 Pull Request

## 📝 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

- 灵感来源于 [Show Hidden Files](https://github.com/pjeby/show-hidden-files) 插件
- 使用 [Obsidian 插件开发指南](https://marcus.se.net/obsidian-plugin-docs/) 构建

## 📧 支持

- **问题反馈**：[GitHub Issues](https://github.com/cyenx/obsidian-hide-specified-files/issues)
- **讨论交流**：[GitHub Discussions](https://github.com/cyenx/obsidian-hide-specified-files/discussions)

---

**用 ❤️ 为 Obsidian 社区制作**
