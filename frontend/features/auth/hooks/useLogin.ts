import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { authApi } from "../api";
import { authSession } from "../session";
import type { LoginRequest } from "../types";

export const INVALID_LOGIN_MESSAGE =
  "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง";
export const DEFAULT_LOCK_SECONDS = 900;
type FieldErrors = Partial<Record<keyof LoginRequest, string>>;

export const useLogin = () => {
  const router = useRouter();
  const [fields, setFields] = useState<LoginRequest>({ username: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"login" | "denied" | "locked">("login");
  const [lockedUntil, setLockedUntil] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // ref เปลี่ยนทันที จึงกันการส่งซ้ำได้ก่อน React วาดปุ่ม disabled รอบถัดไป
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const changeField = (field: keyof LoginRequest, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const reset = useCallback((afterLock = false) => {
    setFields({ username: "", password: "" });
    setFieldErrors({});
    setError(null);
    setUnlocked(afterLock);
    setView("login");
  }, []);

  const submit = async () => {
    if (inFlight.current || view !== "login") return;
    const errors: FieldErrors = {};
    if (!fields.username.trim()) errors.username = "กรุณากรอกชื่อผู้ใช้งาน";
    if (!fields.password) errors.password = "กรุณากรอกรหัสผ่าน";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      authSession.clear();
      // ตัดช่องว่างเฉพาะ username; password ต้องส่งตรงตามที่ผู้ใช้กรอก
      const { token } = await authApi.login({ username: fields.username.trim(), password: fields.password });
      if (!mounted.current) return;
      if (!token?.trim()) throw new Error("Missing login token");
      authSession.saveToken(token);
      setFields({ username: "", password: "" });
      router.replace("/dashboard");
    } catch (cause) {
      if (!mounted.current) return;
      if (cause instanceof ApiError) {
        switch (cause.code) {
          case "INVALID_CREDENTIALS":
          case "ACCOUNT_INACTIVE":
            // ใช้หน้าจอเดียวกันตามข้อสรุป T13 และเก็บค่าที่กรอกไว้ให้แก้ไขได้
            setError(INVALID_LOGIN_MESSAGE);
            return;
          case "NOT_CS_STUDENT":
            setFields({ username: "", password: "" });
            setView("denied");
            return;
          case "ACCOUNT_LOCKED": {
            const supplied = cause.retryAfterSeconds;
            const seconds = supplied !== undefined && Number.isFinite(supplied) && supplied >= 0
              ? supplied : DEFAULT_LOCK_SECONDS;
            setLockedUntil(Date.now() + seconds * 1000);
            setFields({ username: "", password: "" });
            setView("locked");
            return;
          }
        }
      }
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      inFlight.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return { fields, fieldErrors, error, view, lockedUntil, unlocked, submitting, changeField, reset, submit };
};
