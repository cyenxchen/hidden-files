/**
 * 复现与回归测试:File Explorer patch 的启动时机
 *
 * 背景(2026-07-16 诊断结论):
 * Obsidian 1.7.2+ 启动时所有视图先以 DeferredView 占位,layout-ready 触发时
 * 文件浏览器视图可能尚未实体化。插件若此时直接对 leaf.view 的原型打补丁,
 * 补丁会落在 DeferredView.prototype 上并"静默成功"(monkey-around 对不存在的
 * 方法照样返回卸载函数),真实 FileExplorerView 换入后过滤永不执行。
 *
 * 本文件用假工作区完整模拟该启动时序。
 */
import { describe, it, expect } from "vitest";
import { TFolder } from "obsidian";
import type { App, EventRef, TAbstractFile } from "obsidian";
import { createHideFilesHandle } from "../src/hide-files.js";
import type { Settings } from "../src/settings-data.js";

/** 等待微任务与 0ms 定时器全部执行完(让插件内部的 async 流程跑完) */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** 构造一个含指定子目录的文件夹 */
function makeFolder(name: string, childNames: string[]): TFolder {
  const folder = new TFolder();
  folder.name = name;
  folder.path = name;
  folder.children = childNames.map((n) => {
    const child = new TFolder();
    child.name = n;
    child.path = `${name}/${n}`;
    child.parent = folder;
    return child;
  });
  return folder;
}

/** 每个测试用独立的视图类,避免原型补丁在测试间串扰 */
function makeViewClasses() {
  /** 模拟 Obsidian 的 DeferredView 占位视图:原型上没有任何 File Explorer 方法 */
  class FakeDeferredView {}

  /** 模拟真实 FileExplorerView:方法在原型上,requestSort 是实例属性(与真实结构一致) */
  class FakeFileExplorerView {
    sortCallCount = 0;
    requestSort: () => void;

    constructor() {
      // 真实 Obsidian 中 requestSort 是构造器里赋值的实例级 debounce 闭包
      this.requestSort = () => {
        this.sortCallCount++;
      };
    }

    getSortedFolderItems(folder: TFolder): Array<{ file: TAbstractFile }> {
      return folder.children.map((f) => ({ file: f }));
    }

    onFileOpen(_file: TAbstractFile | null): void {}

    revealInFolder(_file: TAbstractFile): void {}
  }

  return { FakeDeferredView, FakeFileExplorerView };
}

type ViewClasses = ReturnType<typeof makeViewClasses>;

/** 模拟 WorkspaceLeaf:可从 deferred 状态实体化为真实视图 */
class FakeLeaf {
  view: object;
  loadIfDeferred?: () => Promise<void>;
  private hydrated: boolean;

  constructor(
    private classes: ViewClasses,
    options: { startDeferred: boolean; supportsLoadIfDeferred: boolean }
  ) {
    if (options.startDeferred) {
      this.view = new classes.FakeDeferredView();
      this.hydrated = false;
    } else {
      this.view = new classes.FakeFileExplorerView();
      this.hydrated = true;
    }
    if (options.supportsLoadIfDeferred) {
      // Obsidian 1.7.2+ 的公开 API:按需实体化 deferred 视图
      this.loadIfDeferred = async () => {
        this.hydrate();
      };
    }
  }

  /** 模拟 Obsidian 把占位视图换成真实视图 */
  hydrate(): void {
    if (this.hydrated) return;
    this.view = new this.classes.FakeFileExplorerView();
    this.hydrated = true;
  }

  get realView(): InstanceType<ViewClasses["FakeFileExplorerView"]> {
    return this.view as InstanceType<ViewClasses["FakeFileExplorerView"]>;
  }
}

/** 模拟 Workspace:还原 onLayoutReady 的排队/立即执行语义与事件系统 */
class FakeWorkspace {
  private layoutReadyQueue: Array<() => void> | null = [];
  private refs = new Set<EventRef>();
  leaves: FakeLeaf[] = [];

  onLayoutReady(cb: () => void): void {
    // 与真实实现一致:布局已就绪则立即执行,否则排队
    if (this.layoutReadyQueue === null) {
      cb();
    } else {
      this.layoutReadyQueue.push(cb);
    }
  }

  /** 模拟启动完成:触发 layout-ready,清空回调队列 */
  flushLayoutReady(): void {
    const queue = this.layoutReadyQueue ?? [];
    this.layoutReadyQueue = null;
    for (const cb of queue) cb();
  }

  /** 模拟"布局早已就绪"(插件中途启用的场景) */
  markLayoutReady(): void {
    this.layoutReadyQueue = null;
  }

  getLeavesOfType(type: string): FakeLeaf[] {
    return type === "file-explorer" ? this.leaves : [];
  }

  on(name: string, cb: (...args: unknown[]) => unknown): EventRef {
    const ref: EventRef = { name, cb };
    this.refs.add(ref);
    return ref;
  }

  offref(ref: EventRef): void {
    this.refs.delete(ref);
  }

  trigger(name: string, ...args: unknown[]): void {
    for (const ref of [...this.refs]) {
      if (ref.name === name) ref.cb(...args);
    }
  }

  /** 当前挂在某事件上的监听器数量(用于断言无泄漏) */
  listenerCount(name: string): number {
    return [...this.refs].filter((ref) => ref.name === name).length;
  }
}

function makeApp(leaves: FakeLeaf[]): { app: App; workspace: FakeWorkspace } {
  const workspace = new FakeWorkspace();
  workspace.leaves = leaves;
  const app = { workspace } as unknown as App;
  return { app, workspace };
}

const SETTINGS: Settings = { enabled: true, hiddenNames: ["assets"] };
const getSettings = () => SETTINGS;
const saveSettings = async () => {};

describe("File Explorer patch 启动时机", () => {
  it("复现①:启动时视图为 DeferredView(无 loadIfDeferred),实体化后必须仍能隐藏", async () => {
    const classes = makeViewClasses();
    const leaf = new FakeLeaf(classes, {
      startDeferred: true,
      supportsLoadIfDeferred: false,
    });
    const { app, workspace } = makeApp([leaf]);

    createHideFilesHandle(app, getSettings, saveSettings);

    // 模拟启动:layout-ready 触发时视图仍是占位
    workspace.flushLayoutReady();
    await tick();

    // 模拟 Obsidian 稍后把视图实体化,并产生一次 layout-change
    leaf.hydrate();
    workspace.trigger("layout-change");
    await tick();

    // 真实视图上的过滤必须生效:assets 不应出现在列表里
    const folder = makeFolder("个人", ["assets", "notes"]);
    const names = leaf.realView
      .getSortedFolderItems(folder)
      .map((item) => item.file.name);
    expect(names).not.toContain("assets");
    expect(names).toContain("notes");
  });

  it("复现②:leaf 提供 loadIfDeferred 时,插件应主动实体化视图并完成 patch", async () => {
    const classes = makeViewClasses();
    const leaf = new FakeLeaf(classes, {
      startDeferred: true,
      supportsLoadIfDeferred: true,
    });
    const { app, workspace } = makeApp([leaf]);

    createHideFilesHandle(app, getSettings, saveSettings);
    workspace.flushLayoutReady();
    await tick();

    // 插件应已通过 loadIfDeferred 把视图实体化
    expect(leaf.view).toBeInstanceOf(classes.FakeFileExplorerView);

    const folder = makeFolder("个人", ["assets", "notes"]);
    const names = leaf.realView
      .getSortedFolderItems(folder)
      .map((item) => item.file.name);
    expect(names).not.toContain("assets");
  });

  it("复现③:补丁绝不允许装到 DeferredView 的原型上(防污染)", async () => {
    const classes = makeViewClasses();
    const leaf = new FakeLeaf(classes, {
      startDeferred: true,
      supportsLoadIfDeferred: false,
    });
    const { app, workspace } = makeApp([leaf]);

    createHideFilesHandle(app, getSettings, saveSettings);
    workspace.flushLayoutReady();
    await tick();

    // DeferredView 原型上不应凭空多出 getSortedFolderItems
    expect(
      Object.prototype.hasOwnProperty.call(
        classes.FakeDeferredView.prototype,
        "getSortedFolderItems"
      )
    ).toBe(false);
  });

  it("回归①:中途启用(视图已实体化)时立即生效并触发刷新", async () => {
    const classes = makeViewClasses();
    const leaf = new FakeLeaf(classes, {
      startDeferred: false,
      supportsLoadIfDeferred: true,
    });
    const { app, workspace } = makeApp([leaf]);
    workspace.markLayoutReady(); // 布局早已就绪,onLayoutReady 立即回调

    createHideFilesHandle(app, getSettings, saveSettings);
    await tick();

    const folder = makeFolder("个人", ["assets", "notes"]);
    const names = leaf.realView
      .getSortedFolderItems(folder)
      .map((item) => item.file.name);
    expect(names).not.toContain("assets");
    // patch 成功后应调用 requestSort 刷新列表
    expect(leaf.realView.sortCallCount).toBeGreaterThan(0);
  });

  it("回归②:多次 layout-change 不重复叠加补丁,dispose 后完整还原原型", async () => {
    const classes = makeViewClasses();
    const original = classes.FakeFileExplorerView.prototype.getSortedFolderItems;
    const leaf = new FakeLeaf(classes, {
      startDeferred: false,
      supportsLoadIfDeferred: true,
    });
    const { app, workspace } = makeApp([leaf]);
    workspace.markLayoutReady();

    const handle = createHideFilesHandle(app, getSettings, saveSettings);
    await tick();

    // patch 成功后再来几次 layout-change,不应重复叠加
    workspace.trigger("layout-change");
    workspace.trigger("layout-change");
    workspace.trigger("layout-change");
    await tick();

    handle.dispose();

    // 卸载后原型方法必须恢复为最初的实现(若重复叠加,这里会残留外层 wrapper)
    expect(classes.FakeFileExplorerView.prototype.getSortedFolderItems).toBe(
      original
    );
  });

  it("回归③:dispose 发生在 loadIfDeferred 悬挂期间时,补丁与监听器都不得残留", async () => {
    const classes = makeViewClasses();
    const original = classes.FakeFileExplorerView.prototype.getSortedFolderItems;
    const leaf = new FakeLeaf(classes, {
      startDeferred: true,
      supportsLoadIfDeferred: false,
    });

    // loadIfDeferred 挂起,resolve 时机由测试控制(模拟真实的异步实体化)
    let resolveLoad!: () => void;
    leaf.loadIfDeferred = () =>
      new Promise<void>((resolve) => {
        resolveLoad = () => {
          leaf.hydrate();
          resolve();
        };
      });

    const { app, workspace } = makeApp([leaf]);
    const handle = createHideFilesHandle(app, getSettings, saveSettings);

    // 启动:patch 流程悬挂在 loadIfDeferred 上
    workspace.flushLayoutReady();

    // 悬挂期间插件被卸载(用户禁用/重载插件)
    handle.dispose();

    // 视图稍后才实体化完成
    resolveLoad();
    await tick();

    // 原型必须干净:插件已卸载,不得残留任何 wrapper
    expect(classes.FakeFileExplorerView.prototype.getSortedFolderItems).toBe(
      original
    );
    // 也不得在卸载后再注册 layout-change 监听
    expect(workspace.listenerCount("layout-change")).toBe(0);
  });
});
