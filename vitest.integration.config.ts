import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.integration.test.ts"],
    env: { DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused" },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
