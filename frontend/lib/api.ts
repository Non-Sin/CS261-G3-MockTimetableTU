import { SessionProvider } from "@/features/auth/session";

// กำหนดฐาน URL ให้ทุก service ใช้ร่วมกัน: ค่าว่างจะเรียก /api/... ผ่าน rewrite
// ใน next.config.ts; ตั้ง NEXT_PUBLIC_API_URL เมื่อต้องการชี้ตรงไปยัง backend
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// รูปแบบ error response ที่ backend ส่งตาม Problem Details/API Spec
export type ProblemDetail = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  retryAfterSeconds?: number;
  instance?: string;
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfterSeconds?: number;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: ProblemDetail) {
    // แปลง error response ให้เป็น Error มาตรฐาน พร้อมเก็บ status/code/field errors
    // เพื่อให้หน้าจอเลือกแสดงข้อความหรือจัดการกรณีเฉพาะได้
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.retryAfterSeconds = problem.retryAfterSeconds;
    this.fieldErrors = problem.errors ?? {};
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = !path.startsWith("/api/auth/login") ? SessionProvider.getToken() : null;
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  // ทุก feature service เรียกผ่านจุดนี้ เพื่อรวม base URL, JSON header และการแปลง error
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeader, ...init?.headers },
  });

  if (!res.ok) {
    if (res.status === 401) {
      if (path.startsWith("/api/auth/logout")) {
        SessionProvider.clearSession();
      } else if (!path.startsWith("/api/auth/login")) {
        SessionProvider.expireSession();
      }
    }
    // พยายามอ่าน ProblemDetail; ถ้า response ไม่ใช่ JSON ก็ยังเก็บ HTTP status ไว้
    const problem: ProblemDetail = await res
      .json()
      .catch(() => ({ status: res.status }));
    throw new ApiError({ ...problem, status: res.status });
  }
  // รองรับ endpoint ที่ตอบสำเร็จโดยไม่มี body (204); กรณีอื่นคืน JSON ตามชนิด T
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}
