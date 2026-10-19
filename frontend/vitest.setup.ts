import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ล้างหน้าจอและ mock ทุกตัวหลังจบแต่ละ test
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
