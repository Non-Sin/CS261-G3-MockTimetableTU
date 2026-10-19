import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit test ฝั่ง frontend: รันใน jsdom ไม่ต้องเปิด browser หรือ backend
export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
