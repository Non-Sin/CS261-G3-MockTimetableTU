import { ApiError } from "@/lib/api";
import type { UserProfileResponse } from "../users/types";
import type { LoginRequest, LoginResponse } from "./types";

// ข้อมูลสมมติสำหรับลองหน้าจอใน next dev เท่านั้น ไม่ใช่บัญชีหรือรหัสผ่าน TU จริง
const DEMO_PASSWORD = "DemoPass123!";
const attempts = new Map<string, { failures: number; lockedUntil: number }>();
const previewedLocks = new Set<string>();

const lockedError = (seconds: number) => new ApiError({
  status: 429,
  code: "ACCOUNT_LOCKED",
  detail: "ระงับการเข้าสู่ระบบชั่วคราว",
  retryAfterSeconds: seconds,
});

export async function demoLogin({ username, password }: LoginRequest): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const attempt = attempts.get(username) ?? { failures: 0, lockedUntil: 0 };
  if (attempt.lockedUntil > Date.now()) {
    throw lockedError(Math.ceil((attempt.lockedUntil - Date.now()) / 1000));
  }
  if (attempt.lockedUntil) {
    attempt.failures = 0;
    attempt.lockedUntil = 0;
  }

  const knownAccount = /^680961000[0-4]$/.test(username);
  if (!knownAccount || password !== DEMO_PASSWORD) {
    attempt.failures += 1;
    if (attempt.failures >= 5) attempt.lockedUntil = Date.now() + 900_000;
    attempts.set(username, attempt);
    if (attempt.lockedUntil) throw lockedError(900);
    throw new ApiError({ status: 401, code: "INVALID_CREDENTIALS" });
  }

  attempts.delete(username);
  if (username === "6809610001") throw new ApiError({ status: 403, code: "ACCOUNT_INACTIVE" });
  if (username === "6809610002") throw new ApiError({ status: 403, code: "NOT_CS_STUDENT" });
  // บัญชี 0003 ใช้ดูหน้าปลดระงับได้ใน 5 วินาที ส่วน 0004 ใช้ตรวจตัวนับ 02:05
  if (["6809610003", "6809610004"].includes(username) && !previewedLocks.has(username)) {
    const seconds = username === "6809610003" ? 5 : 125;
    previewedLocks.add(username);
    attempts.set(username, { failures: 0, lockedUntil: Date.now() + seconds * 1000 });
    throw lockedError(seconds);
  }
  return { token: `demo-student-${username}` };
}

export async function demoCurrentUser(token: string): Promise<UserProfileResponse> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const studentId = token.replace(/^demo-student-/, "");
  if (!/^demo-student-680961000[034]$/.test(token)) throw new ApiError({ status: 401 });
  return { studentId, firstName: "สมชาย", lastName: "ใจดี" };
}

export async function demoLogout(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
