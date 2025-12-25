import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, cloneSettings, fixSettings, type Settings } from "./settings-data.js";
import { createHideFilesHandle, type HideFilesHandle } from "./hide-files.js";
import { HideFilesSettingTab } from "./settings.js";

/**
 * 隐藏指定文件插件
 */
export default class HideSpecifiedFilesPlugin extends Plugin {
  settings: Settings = cloneSettings(DEFAULT_SETTINGS);
  private hideFilesHandle: HideFilesHandle | null = null;

  async onload() {
    console.log("[Hide Files] Loading plugin...");

    try {
      // 加载配置
      await this.loadSettings();

      // 初始化隐藏逻辑
      this.hideFilesHandle = await createHideFilesHandle(
        this.app,
        () => this.settings,
        () => this.saveSettings()
      );

      // 注册设置面板
      this.addSettingTab(new HideFilesSettingTab(this.app, this));

      // 添加命令：刷新 File Explorer
      this.addCommand({
        id: "refresh-file-explorer",
        name: "Refresh File Explorer",
        callback: () => {
          this.hideFilesHandle?.refresh();
        },
      });

      // 添加命令：Toggle Enable/Disable
      this.addCommand({
        id: "toggle-hide-files",
        name: "Toggle file hiding on/off",
        callback: async () => {
          await this.setEnabled(!this.settings.enabled);
        },
      });

      console.log("[Hide Files] Plugin loaded successfully");
    } catch (error) {
      console.error("[Hide Files] Failed to load plugin:", error);
    }
  }

  async onunload() {
    console.log("[Hide Files] Unloading plugin...");

    try {
      // 清理所有 patch 和事件监听器
      this.hideFilesHandle?.dispose();
      this.hideFilesHandle = null;

      // 移除样式
      const styleEl = document.getElementById("hide-files-styles");
      styleEl?.remove();

      console.log("[Hide Files] Plugin unloaded successfully");
    } catch (error) {
      console.error("[Hide Files] Failed to unload plugin:", error);
    }
  }

  /**
   * 加载配置
   */
  async loadSettings(): Promise<void> {
    try {
      const data = await this.loadData();
      this.settings = fixSettings(data);
    } catch (error) {
      console.error("[Hide Files] Failed to load settings:", error);
      this.settings = cloneSettings(DEFAULT_SETTINGS);
    }
  }

  /**
   * 保存配置
   */
  async saveSettings(): Promise<void> {
    try {
      await this.saveData(this.settings);
    } catch (error) {
      console.error("[Hide Files] Failed to save settings:", error);
    }
  }

  /**
   * 公共 API: 添加隐藏名称
   */
  async addHiddenName(name: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // 检查是否已存在
    if (this.settings.hiddenNames.includes(trimmedName)) {
      return;
    }

    // 添加到列表
    (this.settings as { hiddenNames: string[] }).hiddenNames = [
      ...this.settings.hiddenNames,
      trimmedName,
    ];

    await this.saveSettings();
    this.hideFilesHandle?.refresh();
  }

  /**
   * 公共 API: 移除隐藏名称
   */
  async removeHiddenName(name: string): Promise<void> {
    (this.settings as { hiddenNames: string[] }).hiddenNames =
      this.settings.hiddenNames.filter((n) => n !== name);

    await this.saveSettings();
    this.hideFilesHandle?.refresh();
  }

  /**
   * 公共 API: 设置启用/禁用
   */
  async setEnabled(enabled: boolean): Promise<void> {
    (this.settings as { enabled: boolean }).enabled = enabled;
    await this.saveSettings();
    this.hideFilesHandle?.refresh();
  }
}
