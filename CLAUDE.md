# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Obsidian 插件:在文件浏览器中隐藏用户指定的文件/文件夹。核心靠 `monkey-around` 给 Obsidian 私有 API 打补丁。

## 命令

包管理器是 **npm**(仅 `package-lock.json`)。

- `npm run dev` — esbuild 监听模式,源码变更时重建 `main.js`
- `npm run build` — 生产构建(压缩、无 sourcemap)
- `npm run typecheck` — `tsc --noEmit`,仅类型检查
- `npm run lint` — ESLint(flat config `eslint.config.mjs`),仅检查 `src/**/*.ts`
- `npm run test` — vitest 单测(`tests/`,"obsidian" 模块由 `vitest.config.ts` alias 到 `tests/mocks/obsidian.ts`)

esbuild **不做类型检查**,改完代码必须单独跑 `npm run typecheck` 才能发现类型错误。CI 与本地发版前的顺序是:`npm ci` → `npm run typecheck` → `npm run build`。

## 代码风格

- 缩进 **2 空格**;TypeScript `strict` 模式。
- **相对 import 必须带 `.js` 扩展名**(源码是 `.ts`,但写 `import ... from "./settings-data.js"`)。这是 ESNext module + `isolatedModules` 下的要求,新增文件务必沿用。
- 注释与日志用**中文**;日志统一前缀 `[Hide Files]`。
- async 操作一律包 `try/catch` 并 `console.error` 记录,便于溯源——新增代码延续此风格。

## 测试

- 单测:`npm run test`(vitest)。`tests/hide-files.test.ts` 用假 Workspace/DeferredView 完整模拟 Obsidian 启动时序——改动 patch 时机相关代码必须跑它。
- 修 bug 流程:先写测试复现(3 次稳定红)→ 改业务代码 → 3 次稳定绿 + typecheck/lint/build 回归。
- 手动验证:`npm run build` 后把 `main.js` + `manifest.json` 拷到 `<vault>/.obsidian/plugins/hide-specified-files/`(目录名须等于 `manifest.json` 的 `id`),重载 Obsidian 并启用插件。

## 关键坑点

- **依赖 Obsidian 未公开的私有 API**(`getSortedFolderItems`、`onFileOpen`、`revealInFolder`、`requestSort`),在 `src/hide-files.ts` 用 `monkey-around` 的 `around()` 打补丁,类型在 `src/types.ts` 自行声明并 `as unknown as` 强转。Obsidian 升级可能破坏这些补丁点。
- **Deferred Views(Obsidian 1.7.2+)是最大的坑**:启动时 `leaf.view` 是 DeferredView 占位,`onLayoutReady` 触发时文件浏览器即使可见也可能尚未实体化。patch 前必须先 `leaf.loadIfDeferred()` 并校验 `getSortedFolderItems` 真实存在——`monkey-around` 对不存在的方法会"静默成功"(包装 undefined 且返回卸载函数),曾导致补丁落在 DeferredView.prototype 上整体静默失效(2026-07 修复,见 tests/hide-files.test.ts 的复现用例)。
- patch 失败后靠 `layout-change` 常驻重试直到成功;patch 是原型级的,一次成功即覆盖本会话所有视图实例。
- **没有 `styles.css`**:CSS 在 `src/settings.ts` 用 JS 注入(style 元素 id `hide-files-styles`),`onunload` 时手动移除。发布物只有 `main.js` + `manifest.json`,不含 styles.css。
- **`main.js` 是构建产物,不入版本控制**(已 gitignore)。分发通过 GitHub Release,CI 会重新 build 生成它。

## 发版

无 `versions.json` / `version-bump.mjs`,靠推 tag 触发 `.github/workflows/release.yml`:

1. 改 `manifest.json` 的 `version`
2. `npm run build`
3. 提交
4. 打并推同名 tag(格式 `X.Y.Z`,**必须等于 manifest version**,否则 CI `exit 1`)

CI 校验版本一致后,自动把 `main.js` + `manifest.json` 打包成 zip 并建 GitHub Release。

## 仓库约定

- 直接提交到主分支,不走 PR。
- commit message 用英文 Conventional Commits(`feat:` / `fix:` / `docs:` / `ci:`)。
