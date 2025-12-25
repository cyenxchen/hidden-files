/**
 * 插件设置数据结构
 */
export interface Settings {
  /**
   * 是否启用文件隐藏功能
   */
  enabled: boolean;

  /**
   * 要隐藏的文件/目录名称列表
   * - 对于文件：匹配 name（含扩展名）
   * - 对于目录：匹配 name
   */
  hiddenNames: string[];
}

/**
 * 默认设置
 */
export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  hiddenNames: [],
};

/**
 * 克隆设置对象（避免污染默认值）
 */
export function cloneSettings(settings: Settings): Settings {
  return {
    enabled: settings.enabled,
    hiddenNames: [...settings.hiddenNames],
  };
}

/**
 * 验证和修复设置数据
 * 确保从 data.json 加载的数据符合规范
 */
export function fixSettings(value: unknown): Settings {
  // 处理 null/undefined 或非对象类型
  if (!value || typeof value !== "object") {
    return cloneSettings(DEFAULT_SETTINGS);
  }

  const obj = value as Record<string, unknown>;

  // 修复 enabled 字段
  const enabled =
    typeof obj.enabled === "boolean" ? obj.enabled : DEFAULT_SETTINGS.enabled;

  // 修复 hiddenNames 字段
  const rawNames = Array.isArray(obj.hiddenNames) ? obj.hiddenNames : [];
  const hiddenNames: string[] = [];
  const seen = new Set<string>();

  for (const item of rawNames) {
    // 只接受字符串类型
    if (typeof item !== "string") continue;

    // Trim 并过滤空字符串
    const trimmed = item.trim();
    if (!trimmed) continue;

    // 去重
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);

    hiddenNames.push(trimmed);
  }

  return { enabled, hiddenNames };
}
