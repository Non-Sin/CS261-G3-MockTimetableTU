import { ApiError } from "@/lib/api";
import type { UserProfileResponse } from "../users/types";
import type { LoginRequest, LoginResponse } from "./types";

// ข้อมูลสมมติสำหรับลองหน้าจอใน next dev เท่านั้น ไม่ใช่บัญชีหรือรหัสผ่าน TU จริง
// บัญชีและรหัสผ่านตรงกับ StubTuApiClient (profile stub-tu) ของ backend ใช้ชุดเดียวกับ US3-T13
const DEMO_PASSWORD = "Passw0rd!";
const ACTIVE_CS: Record<string, Omit<UserProfileResponse, "studentId">> = {
  "6609000000": { firstName: "สมพร", lastName: "ตัวอย่าง" },
  "6609000001": { firstName: "สมชาย", lastName: "ใจดี" },
  "6609000004": { firstName: "สมใจ", lastName: "ลองดู" },
  // มีเฉพาะ demo: ดูหน้าระงับโดยไม่ต้องกรอกผิด 5 ครั้ง 0005 ปลดใน 5 วินาที ส่วน 0006 ใช้ตรวจตัวนับ 02:05
  "6609000005": { firstName: "ทดลอง", lastName: "ปลดระงับ" },
  "6609000006": { firstName: "ทดลอง", lastName: "นับถอยหลัง" },
};
const INACTIVE = new Set(["6609000003"]);
const NOT_CS = new Set(["6609000002", "6609650001"]);
const UNAVAILABLE_USERNAME = "6609000099";
const LOCK_PREVIEW_SECONDS: Record<string, number> = { "6609000005": 5, "6609000006": 125 };

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
  // เหมือน stub: TU API ใช้งานไม่ได้ตอบ 503 ก่อนตรวจรหัสผ่าน และไม่นับเป็นครั้งที่ผิด
  if (username === UNAVAILABLE_USERNAME) {
    throw new ApiError({
      status: 503,
      code: "TU_API_UNAVAILABLE",
      detail: "ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
    });
  }

  const knownAccount = Object.hasOwn(ACTIVE_CS, username) || INACTIVE.has(username) || NOT_CS.has(username);
  if (!knownAccount || password !== DEMO_PASSWORD) {
    attempt.failures += 1;
    if (attempt.failures >= 5) attempt.lockedUntil = Date.now() + 900_000;
    attempts.set(username, attempt);
    if (attempt.lockedUntil) throw lockedError(900);
    throw new ApiError({ status: 401, code: "INVALID_CREDENTIALS" });
  }

  attempts.delete(username);
  if (INACTIVE.has(username)) throw new ApiError({ status: 403, code: "ACCOUNT_INACTIVE" });
  if (NOT_CS.has(username)) throw new ApiError({ status: 403, code: "NOT_CS_STUDENT" });
  const previewSeconds = LOCK_PREVIEW_SECONDS[username];
  if (previewSeconds && !previewedLocks.has(username)) {
    previewedLocks.add(username);
    attempts.set(username, { failures: 0, lockedUntil: Date.now() + previewSeconds * 1000 });
    throw lockedError(previewSeconds);
  }
  return { token: `demo-student-${username}` };
}

export async function demoCurrentUser(token: string): Promise<UserProfileResponse> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  const studentId = token.replace(/^demo-student-/, "");
  const profile = token.startsWith("demo-student-") && Object.hasOwn(ACTIVE_CS, studentId)
    ? ACTIVE_CS[studentId] : undefined;
  if (!profile) throw new ApiError({ status: 401 });
  return { studentId, ...profile };
}

export async function demoLogout(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
