import { App, PluginSettingTab, Setting } from "obsidian";
import type { Settings } from "./settings-data.js";
import { refreshFileExplorer } from "./hide-files.js";

/**
 * 插件引用接口（用于类型安全）
 */
interface PluginRef {
  settings: Settings;
  saveSettings(): Promise<void>;
}

/**
 * 隐藏文件设置面板
 */
export class HideFilesSettingTab extends PluginSettingTab {
  private plugin: PluginRef;

  constructor(app: App, plugin: PluginRef) {
    super(app, plugin as any);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 标题
    containerEl.createEl("h2", { text: "Hide Specified Files" });

    // Enable/Disable 开关
    new Setting(containerEl)
      .setName("Enable file hiding")
      .setDesc("Toggle file hiding on/off")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enabled).onChange(async (value) => {
          this.plugin.settings.enabled = value;
          await this.plugin.saveSettings();
          refreshFileExplorer(this.app);
        })
      );

    // 添加隐藏文件名
    const addSetting = new Setting(containerEl)
      .setName("Add file or folder name to hide")
      .setDesc("Enter the exact name (for files: include extension)");

    let inputEl: HTMLInputElement;
    addSetting.addText((text) => {
      inputEl = text.inputEl;
      text
        .setPlaceholder("e.g., README.md, drafts, .obsidian")
        .onChange(() => {
          // 清除错误状态
          inputEl.removeClass("hide-files-error");
        });
    });

    addSetting.addButton((button) =>
      button
        .setButtonText("Add")
        .setCta()
        .onClick(async () => {
          const value = inputEl.value.trim();

          // 验证输入
          if (!value) {
            inputEl.addClass("hide-files-error");
            return;
          }

          // 检查是否已存在
          if (this.plugin.settings.hiddenNames.includes(value)) {
            inputEl.addClass("hide-files-error");
            inputEl.value = "";
            inputEl.placeholder = "Already in the list!";
            setTimeout(() => {
              inputEl.placeholder = "e.g., README.md, drafts, .obsidian";
            }, 2000);
            return;
          }

          // 添加到列表
          this.plugin.settings.hiddenNames = [
            ...this.plugin.settings.hiddenNames,
            value,
          ];

          await this.plugin.saveSettings();
          refreshFileExplorer(this.app);

          // 清空输入框并重新渲染
          inputEl.value = "";
          this.display();
        })
    );

    // 显示当前隐藏列表
    if (this.plugin.settings.hiddenNames.length > 0) {
      containerEl.createEl("h3", { text: "Currently hidden:" });

      const listContainer = containerEl.createDiv("hide-files-list");

      for (const name of this.plugin.settings.hiddenNames) {
        const itemDiv = listContainer.createDiv("hide-files-item");

        // 文件名
        itemDiv.createSpan({
          text: name,
          cls: "hide-files-name",
        });

        // 删除按钮
        const deleteBtn = itemDiv.createEl("button", {
          text: "Delete",
          cls: "hide-files-delete",
        });

        deleteBtn.addEventListener("click", async () => {
          // 从列表中移除
          this.plugin.settings.hiddenNames =
            this.plugin.settings.hiddenNames.filter((n) => n !== name);

          await this.plugin.saveSettings();
          refreshFileExplorer(this.app);

          // 重新渲染
          this.display();
        });
      }
    } else {
      containerEl.createEl("p", {
        text: "No files or folders are currently hidden.",
        cls: "hide-files-empty",
      });
    }

    // 添加 CSS 样式
    this.addStyles();
  }

  private addStyles(): void {
    // 检查是否已添加样式
    if (document.getElementById("hide-files-styles")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "hide-files-styles";
    styleEl.textContent = `
      .hide-files-error {
        border-color: var(--color-red) !important;
      }

      .hide-files-list {
        margin-top: 10px;
      }

      .hide-files-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        margin-bottom: 6px;
        background-color: var(--background-secondary);
        border-radius: 4px;
      }

      .hide-files-name {
        font-family: var(--font-monospace);
        font-size: 0.9em;
      }

      .hide-files-delete {
        padding: 4px 12px;
        font-size: 0.85em;
        cursor: pointer;
        border: 1px solid var(--background-modifier-border);
        border-radius: 3px;
        background-color: var(--interactive-normal);
        color: var(--text-normal);
      }

      .hide-files-delete:hover {
        background-color: var(--interactive-hover);
      }

      .hide-files-empty {
        color: var(--text-muted);
        font-style: italic;
        margin-top: 10px;
      }
    `;

    document.head.appendChild(styleEl);
  }
}
