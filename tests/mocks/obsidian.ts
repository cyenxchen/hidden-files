/**
 * "obsidian" 模块的测试 mock。
 * 官方 obsidian 包只提供类型声明,没有可在 Node 中运行的实现,
 * 这里只提供 src 代码运行期真正用到的最小集合(TFolder 的 instanceof 检查等)。
 */

export class TAbstractFile {
  name = "";
  path = "";
  parent: TFolder | null = null;
}

export class TFile extends TAbstractFile {}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];

  isRoot(): boolean {
    return this.parent === null;
  }
}

/**
 * 事件引用(与真实 Obsidian 一致,作为不透明句柄使用)
 */
export interface EventRef {
  name: string;
  cb: (...args: unknown[]) => unknown;
}

/**
 * App 仅作类型占位,测试里用 FakeApp 结构性替代
 */
export class App {}
