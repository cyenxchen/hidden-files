import type { TAbstractFile, TFolder } from "obsidian";

/**
 * File Explorer 的文件项类型
 */
export type FileExplorerItem = { file: TAbstractFile };

/**
 * File Explorer View 的私有 API 类型定义
 * 这些是 Obsidian 的内部实现，通过 monkey-patching 访问
 */
export interface FileExplorerViewPrivate {
  /**
   * 获取排序后的文件夹内容（核心 patch 点）
   */
  getSortedFolderItems(folder: TFolder): FileExplorerItem[];

  /**
   * 文件打开时的处理（防止自动定位到隐藏文件）
   */
  onFileOpen(file: TAbstractFile | null): void;

  /**
   * 在文件夹中显示文件（防止显示隐藏文件）
   */
  revealInFolder(file: TAbstractFile): void;

  /**
   * 请求重新排序文件树
   */
  requestSort(): void;
}
