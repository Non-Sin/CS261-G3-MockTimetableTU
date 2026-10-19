// สัญญาของระบบเรา: หน้าเว็บไม่ต้องรู้รูปแบบ request ของ TU หรือ Application-Key
export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = { token: string };

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_INACTIVE"
  | "NOT_CS_STUDENT"
  | "ACCOUNT_LOCKED";

export type AuthErrorDetail = {
  status: number;
  title: string;
  detail: string;
  code: AuthErrorCode;
  retryAfterSeconds?: number;
};
