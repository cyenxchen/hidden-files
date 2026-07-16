import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// 测试环境下 "obsidian" 包没有真实运行时(官方只发 d.ts + 空实现),
// 用本地 mock 提供 TFolder 等运行时类。
export default defineConfig({
  resolve: {
    alias: {
      obsidian: fileURLToPath(new URL("./tests/mocks/obsidian.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
