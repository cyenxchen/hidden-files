// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// ESLint 10 flat config。只 lint src 下的 TS 源码;main.js 是构建产物,忽略。
export default tseslint.config(
  {
    ignores: ["main.js", "node_modules/"],
  },
  {
    files: ["src/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  }
);
