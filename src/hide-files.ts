import { TFolder } from "obsidian";
import type { App, EventRef, TAbstractFile } from "obsidian";
import { around } from "monkey-around";
import type { Settings } from "./settings-data.js";
import type {
  FileExplorerItem,
  FileExplorerViewPrivate,
  WorkspaceLeafPrivate,
} from "./types.js";

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
 * 在已校验的 File Explorer 视图原型上应用 Patch
 *
 * 调用方必须先确认原型链上存在真实的 getSortedFolderItems（排除 DeferredView 占位）。
 * 注意：monkey-around 对"原型上不存在的方法"也会静默安装包装并返回卸载函数，
 * 所以真实性校验必须在调用本函数之前完成，不能依赖本函数报错。
 */
function applyFileExplorerPatch(
  proto: FileExplorerViewPrivate,
  getSettings: () => Settings
): (() => void) | null {
  const { shouldHide } = createHiddenChecker(getSettings);

  try {
    // Patch getSortedFolderItems - 核心过滤逻辑
    const unpatch = around(proto, {
      getSortedFolderItems(old) {
        return function (this: FileExplorerViewPrivate, folder: TFolder) {
          const items = old.call(this, folder) as FileExplorerItem[];

          try {
            // 过滤隐藏的文件/目录；结构异常（无 .file）的 item 一律保留，避免误伤渲染
            return items.filter((item) => !item?.file || !shouldHide(item.file));
          } catch (error) {
            // 过滤逻辑出错时退回未过滤列表，保证 File Explorer 仍可用
            console.error(
              "[Hide Files] 过滤时发生异常，本次返回未过滤列表:",
              error
            );
            return items;
          }
        };
      },

      // Patch onFileOpen - 防止自动定位到隐藏文件
      // 已知限制：Obsidian 在视图加载时把 onFileOpen 的函数引用注册进 workspace
      // 的 file-open 事件，晚于视图加载的 patch 拦不住该事件路径（仅影响
      // "自动定位到隐藏文件"这一次要行为，不影响核心隐藏功能）
      onFileOpen(old) {
        return function (this: FileExplorerViewPrivate, file: TAbstractFile | null) {
          if (file && shouldHide(file)) {
            return; // 短路：不定位到隐藏文件
          }
          return old?.call(this, file);
        };
      },

      // Patch revealInFolder - 阻止"在文件夹中显示"隐藏文件
      revealInFolder(old) {
        return function (this: FileExplorerViewPrivate, file: TAbstractFile) {
          if (shouldHide(file)) {
            return; // 短路：不显示隐藏文件
          }
          return old?.call(this, file);
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
export function createHideFilesHandle(
  app: App,
  getSettings: () => Settings,
  saveSettings: () => Promise<void>
): HideFilesHandle {
  const disposers: Array<() => void> = [];
  // patch 是原型级的，一次成功即对本会话内所有（含后续新建的）视图实例生效
  let patchApplied = false;
  // 防止 async 流程并发重入导致重复 patch
  let patching = false;
  // 句柄已销毁标志：阻断 dispose 之后仍在途/后续触发的 async patch 流程
  // （onLayoutReady 回调在插件卸载后仍会被 Obsidian 触发；loadIfDeferred
  //  的 await 悬挂期间插件也可能被卸载——两种路径都不得再动原型）
  let disposed = false;

  /**
   * 尝试应用 File Explorer Patch
   *
   * Obsidian 1.7.2+ 启动时视图以 DeferredView 占位，layout-ready 触发时
   * leaf.view 可能还不是真实的 FileExplorerView。若此时直接对其原型打补丁，
   * 补丁会落在 DeferredView.prototype 上且"看似成功"，真实视图换入后过滤
   * 永不执行（本插件曾因此静默失效）。因此这里：
   * 1. 先用 loadIfDeferred() 主动实体化视图（老版本无此方法则跳过）；
   * 2. 校验 getSortedFolderItems 真实存在后才 patch；
   * 3. 失败返回 false，由调用方通过 layout-change 重试。
   */
  const tryApplyFileExplorerPatch = async (): Promise<boolean> => {
    if (disposed) return false;
    if (patchApplied) return true;
    if (patching) return false;
    patching = true;

    try {
      const leaf = app.workspace.getLeavesOfType("file-explorer")[0] as
        | WorkspaceLeafPrivate
        | undefined;
      if (!leaf) {
        return false;
      }

      // 视图可能是 DeferredView 占位，先主动实体化
      if (typeof leaf.loadIfDeferred === "function") {
        await leaf.loadIfDeferred();
        // await 悬挂期间插件可能已被卸载，此后不得再动原型
        if (disposed) return false;
      }

      const view = leaf.view as FileExplorerViewPrivate;

      // 关键守卫：原型链上必须有真实的 getSortedFolderItems 才允许 patch
      if (typeof view?.getSortedFolderItems !== "function") {
        console.log(
          "[Hide Files] File Explorer 视图尚未实体化（deferred view），等待重试"
        );
        return false;
      }

      const unpatch = applyFileExplorerPatch(
        Object.getPrototypeOf(view) as FileExplorerViewPrivate,
        getSettings
      );
      if (!unpatch) return false;

      patchApplied = true;
      disposers.push(unpatch);
      console.log("[Hide Files] File Explorer patch 已生效");
      refreshFileExplorer(app);
      return true;
    } finally {
      patching = false;
    }
  };

  // 添加隐藏名称的函数
  async function addHiddenName(name: string): Promise<void> {
    const settings = getSettings();
    const trimmedName = name.trim();

    // 检查是否已存在
    if (settings.hiddenNames.includes(trimmedName)) {
      return;
    }

    // 添加到列表
    settings.hiddenNames = [...settings.hiddenNames, trimmedName];

    // 保存并刷新
    await saveSettings();
    refreshFileExplorer(app);
  }

  // 设置右键菜单
  const cleanupMenu = setupContextMenu(app, getSettings, addHiddenName);
  disposers.push(cleanupMenu);

  // 使用 onLayoutReady 确保在 layout 准备好后执行 patch
  app.workspace.onLayoutReady(() => {
    void (async () => {
      if (await tryApplyFileExplorerPatch()) return;

      // await 悬挂期间插件可能已被卸载，不得再注册监听器
      if (disposed) return;

      // 首次未成功（File Explorer 未创建，或视图仍为 deferred 占位），
      // 注册 layout-change 常驻重试，直到 patch 真正生效才卸载监听
      let layoutChangeRef: EventRef | null = null;
      const clearLayoutListener = (): void => {
        if (!layoutChangeRef) return;
        app.workspace.offref(layoutChangeRef);
        layoutChangeRef = null;
      };

      layoutChangeRef = app.workspace.on("layout-change", () => {
        tryApplyFileExplorerPatch()
          .then((ok) => {
            if (ok) clearLayoutListener();
          })
          .catch((error) => {
            console.error("[Hide Files] layout-change 重试 patch 失败:", error);
          });
      });

      disposers.push(clearLayoutListener);
    })().catch((error) => {
      console.error("[Hide Files] 初始化 File Explorer patch 失败:", error);
    });
  });

  // 返回句柄
  return {
    refresh() {
      refreshFileExplorer(app);
    },

    dispose() {
      // 先置销毁标志，阻断在途的 async patch 流程（见 tryApplyFileExplorerPatch）
      disposed = true;
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
