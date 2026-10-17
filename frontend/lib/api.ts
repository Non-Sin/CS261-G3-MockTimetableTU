// ค่าเริ่มต้นเป็น "" = เรียกผ่าน rewrite ใน next.config.ts (ไม่ติด CORS)
// ตั้ง NEXT_PUBLIC_API_URL เมื่อต้องการยิงตรงไปที่ backend
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type ProblemDetail = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  code?: string;
  errors?: Record<string, string>;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fieldErrors: Record<string, string>;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${problem.status}`);
    this.name = "ApiError";
    this.status = problem.status;
    this.code = problem.code;
    this.fieldErrors = problem.errors ?? {};
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const problem: ProblemDetail = await res
      .json()
      .catch(() => ({ status: res.status }));
    throw new ApiError({ ...problem, status: res.status });
  }
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}