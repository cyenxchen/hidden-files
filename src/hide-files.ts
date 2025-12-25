import { TFolder } from "obsidian";
import type { App, EventRef, TAbstractFile } from "obsidian";
import { around } from "monkey-around";
import type { Settings } from "./settings-data.js";
import type { FileExplorerItem, FileExplorerViewPrivate } from "./types.js";

/**
 * 隐藏文件处理句柄
 */
export interface HideFilesHandle {
  /**
   * 刷新 File Explorer 显示
   */
  refresh(): void;

  /**
   * 清理所有 patch 和事件监听器
   */
  dispose(): void;
}

/**
 * 获取文件/目录的匹配名称
 * - 文件：使用 name（含扩展名）
 * - 目录：使用 name
 */
function getMatchName(file: TAbstractFile): string {
  return file.name;
}

/**
 * 检查是否为根目录
 */
function isRootFolder(file: TAbstractFile): boolean {
  if (!(file instanceof TFolder)) return false;
  // 根目录的特征：parent 为 null
  return file.parent === null;
}

/**
 * 创建隐藏检查器（带缓存优化）
 */
function createHiddenChecker(getSettings: () => Settings) {
  let hiddenSet = new Set<string>();
  let lastCacheKey = "";

  /**
   * 更新缓存
   * 只在 settings 变化时重建 Set
   */
  function updateCache(): void {
    const settings = getSettings();
    const newKey = `${settings.enabled}|${settings.hiddenNames.join("\n")}`;

    if (newKey === lastCacheKey) return; // 缓存命中

    hiddenSet = new Set(settings.hiddenNames);
    lastCacheKey = newKey;
  }

  /**
   * 检查文件是否应该被隐藏
   */
  function shouldHide(file: TAbstractFile): boolean {
    updateCache();

    const settings = getSettings();
    if (!settings.enabled) return false;

    const matchName = getMatchName(file);
    return hiddenSet.has(matchName);
  }

  return { shouldHide };
}

/**
 * 应用 File Explorer Patch
 */
function applyFileExplorerPatch(
  app: App,
  getSettings: () => Settings
): (() => void) | null {
  const { shouldHide } = createHiddenChecker(getSettings);

  try {
    // 获取 File Explorer View
    const fileExplorer = app.workspace.getLeavesOfType("file-explorer")[0];
    if (!fileExplorer) {
      console.warn("[Hide Files] File Explorer not found");
      return null;
    }

    const view = fileExplorer.view as unknown as FileExplorerViewPrivate;

    // Patch getSortedFolderItems - 核心过滤逻辑
    const unpatch = around(Object.getPrototypeOf(view), {
      getSortedFolderItems(old) {
        return function (this: FileExplorerViewPrivate, folder: TFolder) {
          const items = old.call(this, folder) as FileExplorerItem[];

          // 过滤隐藏的文件/目录
          return items.filter((item) => !shouldHide(item.file));
        };
      },

      // Patch onFileOpen - 防止自动定位到隐藏文件
      onFileOpen(old) {
        return function (this: FileExplorerViewPrivate, file: TAbstractFile | null) {
          if (file && shouldHide(file)) {
            return; // 短路：不定位到隐藏文件
          }
          return old.call(this, file);
        };
      },

      // Patch revealInFolder - 阻止"在文件夹中显示"隐藏文件
      revealInFolder(old) {
        return function (this: FileExplorerViewPrivate, file: TAbstractFile) {
          if (shouldHide(file)) {
            return; // 短路：不显示隐藏文件
          }
          return old.call(this, file);
        };
      },
    });

    return unpatch;
  } catch (error) {
    console.error("[Hide Files] Failed to patch File Explorer:", error);
    return null;
  }
}

/**
 * 设置右键菜单
 */
function setupContextMenu(
  app: App,
  getSettings: () => Settings,
  addHiddenName: (name: string) => Promise<void>
): () => void {
  const { shouldHide } = createHiddenChecker(getSettings);

  // 注册右键菜单事件
  const eventRef = app.workspace.on("file-menu", (menu, file, source) => {
    // 只在 File Explorer 中显示
    if (source !== "file-explorer") return;

    // 禁止隐藏根目录
    if (isRootFolder(file)) return;

    const matchName = getMatchName(file);
    const isHidden = shouldHide(file);

    menu.addItem((item) => {
      item
        .setTitle(isHidden ? "Already hidden" : "Hide this file")
        .setIcon("eye-off")
        .setDisabled(isHidden)
        .onClick(async () => {
          if (!isHidden) {
            await addHiddenName(matchName);
          }
        });
    });
  });

  // 返回清理函数
  return () => {
    app.workspace.offref(eventRef);
  };
}

/**
 * 创建隐藏文件处理句柄
 */
export async function createHideFilesHandle(
  app: App,
  getSettings: () => Settings,
  saveSettings: () => Promise<void>
): Promise<HideFilesHandle> {
  const disposers: Array<() => void> = [];
  let fileExplorerUnpatch: (() => void) | null = null;

  // 等待 workspace 准备就绪
  if (!app.workspace.layoutReady) {
    await new Promise<void>((resolve) => {
      const ref = (app.workspace as any).on("layout-ready", () => {
        app.workspace.offref(ref);
        resolve();
      });
    });
  }

  // 应用 File Explorer Patch（首次 + 延迟创建）
  const tryApplyFileExplorerPatch = (): boolean => {
    if (fileExplorerUnpatch) return true;

    if (app.workspace.getLeavesOfType("file-explorer").length === 0) {
      return false;
    }

    const unpatch = applyFileExplorerPatch(app, getSettings);
    if (!unpatch) return false;

    fileExplorerUnpatch = unpatch;
    disposers.push(unpatch);
    refreshFileExplorer(app);
    return true;
  };

  if (!tryApplyFileExplorerPatch()) {
    let layoutChangeRef: EventRef | null = null;
    const clearLayoutListener = (): void => {
      if (!layoutChangeRef) return;
      app.workspace.offref(layoutChangeRef);
      layoutChangeRef = null;
    };

    layoutChangeRef = app.workspace.on("layout-change", () => {
      if (tryApplyFileExplorerPatch()) {
        clearLayoutListener();
      }
    });

    disposers.push(clearLayoutListener);
  }

  // 添加隐藏名称的函数
  async function addHiddenName(name: string): Promise<void> {
    const settings = getSettings();
    const trimmedName = name.trim();

    // 检查是否已存在
    if (settings.hiddenNames.includes(trimmedName)) {
      return;
    }

    // 添加到列表（创建新数组以触发 reactivity）
    settings.hiddenNames = [...settings.hiddenNames, trimmedName];

    // 保存并刷新
    await saveSettings();
    refreshFileExplorer(app);
  }

  // 设置右键菜单
  const cleanupMenu = setupContextMenu(app, getSettings, addHiddenName);
  disposers.push(cleanupMenu);

  // 返回句柄
  return {
    refresh() {
      refreshFileExplorer(app);
    },

    dispose() {
      while (disposers.length > 0) {
        const dispose = disposers.pop();
        dispose?.();
      }
    },
  };
}

/**
 * 刷新 File Explorer
 */
export function refreshFileExplorer(app: App): void {
  try {
    const fileExplorer = app.workspace.getLeavesOfType("file-explorer")[0];
    if (!fileExplorer) return;

    const view = fileExplorer.view as unknown as FileExplorerViewPrivate;
    if (typeof view.requestSort === "function") {
      view.requestSort();
    }
  } catch (error) {
    console.error("[Hide Files] Failed to refresh File Explorer:", error);
  }
}
