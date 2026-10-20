export const AUTH_TOKEN_KEY = "mocktimetable.auth.token";
export const SESSION_EXPIRED_KEY = "mocktimetable.auth.expired";
export const SESSION_EXPIRED_MESSAGE =
  "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง";

const listeners = new Set<() => void>();
const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// อ่าน session เฉพาะใน browser และรองรับ session เก่าที่อาจยังเก็บ token ใน localStorage
export const SessionProvider = {
  getToken: () => {
    if (typeof window === "undefined") return null;
    return (
      window.sessionStorage.getItem(AUTH_TOKEN_KEY) ??
      window.localStorage.getItem(AUTH_TOKEN_KEY)
    );
  },
  saveToken: (token: string) => {
    window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    window.localStorage.removeItem(SESSION_EXPIRED_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    notifyListeners();
  },
  isAuthenticated: () => Boolean(SessionProvider.getToken()?.trim()),
  clearSession: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
      window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(SESSION_EXPIRED_KEY);
    }
    notifyListeners();
  },
  clear: () => {
    SessionProvider.clearSession();
  },
  expireSession: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(SESSION_EXPIRED_KEY);
      window.sessionStorage.setItem(SESSION_EXPIRED_KEY, "true");
    }
    notifyListeners();
  },
  isSessionExpired: () =>
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(SESSION_EXPIRED_KEY) === "true",
  clearSessionExpired: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      window.localStorage.removeItem(SESSION_EXPIRED_KEY);
    }
    notifyListeners();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const authSession = SessionProvider;
