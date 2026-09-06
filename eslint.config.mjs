import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    ".tmp/**",
    "tmp/**",
    "outputs/**",
    "backup-api/**",
    "next-env.d.ts",
  ]),
]);
