import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { userApi } from "../users/api";
import { authApi } from "./api";
import LoginPage from "./LoginPage";
import MainMenuPage from "./MainMenuPage";
import {
  AUTH_TOKEN_KEY,
  SESSION_EXPIRED_MESSAGE,
  SessionProvider,
} from "./session";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./api", () => ({
  authApi: { login: vi.fn(), logout: vi.fn() },
  isAuthDemo: () => false,
}));
vi.mock("../users/api", () => ({ userApi: { getCurrentUser: vi.fn() } }));

const profile = { studentId: "6809610000", firstName: "Alysa", lastName: "Liu" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  router.replace.mockReset();
  vi.mocked(authApi.login).mockReset().mockResolvedValue({ token: "new-token" });
  vi.mocked(authApi.logout).mockReset().mockResolvedValue(undefined);
  vi.mocked(userApi.getCurrentUser).mockReset().mockResolvedValue(profile);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("US4-T07: ออกจากระบบ, ล้างข้อมูลฝั่งหน้าเว็บ, กันปุ่มย้อนกลับ และจับเวลาไม่ใช้งาน (US4-T11)", () => {
  it("[UT-UI-01] แสดงปุ่มออกจากระบบเมื่อเข้าสู่ระบบแล้ว และเรียกการทำงาน Logout เมื่อคลิก", async () => {
    SessionProvider.saveToken("valid-token");
    render(<MainMenuPage />);

    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    const navbar = within(screen.getByLabelText("ข้อมูลนักศึกษา"));
    await userEvent.click(navbar.getByRole("button", { name: /Alysa Liu/ }));
    const dialog = navbar.getByRole("dialog", { name: "เมนูบัญชีผู้ใช้" });
    expect(within(dialog).getByText("6809610000")).toBeInTheDocument();
    expect(within(dialog).getByText("อลิษา หลิว")).toBeInTheDocument();
    expect(within(dialog).getByText("ALYSA LIU")).toBeInTheDocument();
    const logoutBtn = within(dialog).getByRole("button", { name: "ออกจากระบบ" });
    expect(logoutBtn).toBeInTheDocument();
    expect(logoutBtn).toBeEnabled();

    await userEvent.click(logoutBtn);

    expect(authApi.logout).toHaveBeenCalledTimes(1);
    expect(authApi.logout).toHaveBeenCalledWith("valid-token");
  });

  it("[UT-UI-01] ระหว่างกำลังออกจากระบบ ปุ่มถูกปิดใช้งานและกันการคลิกซ้ำ", async () => {
    const pendingLogout = deferred<void>();
    vi.mocked(authApi.logout).mockReturnValue(pendingLogout.promise);
    SessionProvider.saveToken("valid-token");
    render(<MainMenuPage />);

    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    const logoutBtn = screen.getByRole("button", { name: "ออกจากระบบ" });

    await userEvent.click(logoutBtn);

    const waitingBtn = screen.getByRole("button", { name: "กำลังออกจากระบบ…" });
    expect(waitingBtn).toBeDisabled();
    await userEvent.click(waitingBtn);
    expect(authApi.logout).toHaveBeenCalledTimes(1);

    await act(async () => {
      pendingLogout.resolve();
    });
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("[UT-UI-02] หลัง Logout สำเร็จ ล้างข้อมูลฝั่งหน้าเว็บทั้งหมด เปลี่ยนไปหน้า Login และไม่แสดงข้อมูลเดิมหรือ banner เซสชันหมดอายุ", async () => {
    SessionProvider.saveToken("valid-token");
    localStorage.setItem(AUTH_TOKEN_KEY, "valid-token");
    const { unmount } = render(<MainMenuPage />);

    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    expect(screen.getByText("Alysa Liu")).toBeInTheDocument();
    expect(screen.getByText("6809610000")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(screen.queryByRole("heading", { name: "จัดตารางเรียนจำลอง" })).not.toBeInTheDocument();
    expect(screen.queryByText("Alysa Liu")).not.toBeInTheDocument();
    expect(screen.queryByText("6809610000")).not.toBeInTheDocument();

    unmount();
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อผู้ใช้งาน (Username)")).toBeInTheDocument();
    expect(screen.getByLabelText("รหัสผ่าน (Password)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบ (Login)" })).toBeInTheDocument();
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });

  it("[UT-UI-03] หลัง Logout เมื่อกดย้อนกลับ (Browser Back) สถานะยังเป็น Unauthenticated ไม่แสดงข้อมูลเดิมและคงอยู่ที่หน้า Login", async () => {
    SessionProvider.saveToken("valid-token");
    const { unmount } = render(<MainMenuPage />);

    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    expect(screen.getByText("Alysa Liu")).toBeInTheDocument();
    const currentUserRequestCount = vi.mocked(userApi.getCurrentUser).mock.calls.length;

    // กดปุ่มออกจากระบบจนกลับมาหน้า Login
    await userEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    unmount();

    const loginRender = render(<LoginPage />);
    router.replace.mockReset();

    // จำลองการกดปุ่มย้อนกลับของ Browser (popstate)
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(router.replace).toHaveBeenCalledWith("/login");
    loginRender.unmount();

    // จำลองกรณี Browser พยายามเปิดหน้าเมนูหลักกลับมาหลังกดย้อนกลับ
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(screen.queryByRole("heading", { name: "จัดตารางเรียนจำลอง" })).not.toBeInTheDocument();
    expect(screen.queryByText("Alysa Liu")).not.toBeInTheDocument();
    expect(screen.queryByText("6809610000")).not.toBeInTheDocument();
    expect(userApi.getCurrentUser).toHaveBeenCalledTimes(currentUserRequestCount);
  });

  it("[UT-UI-04] ไม่มีการใช้งานเกินระยะเวลาที่กำหนด ระบบจะ Logout อัตโนมัติและหน้า Login แสดง banner สีเหลืองแจ้งเซสชันหมดอายุ", async () => {
    vi.useFakeTimers();
    SessionProvider.saveToken("valid-token");
    const { unmount } = render(<MainMenuPage inactivityTimeoutMs={60_000} />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    expect(SessionProvider.isAuthenticated()).toBe(true);

    // จำลองการไม่มีการใช้งานจนครบกำหนด 60 วินาที
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(SessionProvider.isSessionExpired()).toBe(true);
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(authApi.logout).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "จัดตารางเรียนจำลอง" })).not.toBeInTheDocument();
    expect(screen.queryByText("Alysa Liu")).not.toBeInTheDocument();

    unmount();
    render(<LoginPage />);

    const banner = screen.getByTestId("session-expired-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
    expect(banner.className).toContain("bg-[#fef9c3]");
    expect(banner.className).toContain("border-[#facc15]");
  });

  it("[UT-UI-04] หากมีการใช้งานระหว่างจับเวลา ตัวจับเวลาไม่ใช้งานจะถูกรีเซ็ตและยังไม่ถูก Logout จนกว่าจะหยุดใช้งานครบเวลา", async () => {
    vi.useFakeTimers();
    SessionProvider.saveToken("valid-token");
    render(<MainMenuPage inactivityTimeoutMs={60_000} />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();

    // ผ่านไป 40 วินาทีแล้วผู้ใช้ขยับเมาส์/กดปุ่ม
    act(() => {
      vi.advanceTimersByTime(40_000);
      fireEvent.mouseMove(window);
    });

    // ผ่านไปอีก 40 วินาที (รวม 80 วินาที แต่เพิ่งหยุดใช้งาน 40 วินาที) ยังไม่ถูก Logout
    act(() => {
      vi.advanceTimersByTime(40_000);
    });
    expect(SessionProvider.isAuthenticated()).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();

    // ผ่านไปอีก 20 วินาที (ครบ 60 วินาทีหลังหยุดใช้งานครั้งล่าสุด) ระบบจึง Logout อัตโนมัติ
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("เมื่อ API ตอบ 401 ระหว่างใช้งาน (token หมดอายุ) จะล้าง session กลับหน้า Login พร้อมแสดง banner สีเหลือง และเมื่อเข้าสู่ระบบใหม่ banner จะหายไป", async () => {
    vi.mocked(userApi.getCurrentUser).mockRejectedValueOnce(new ApiError({ status: 401 }));
    SessionProvider.saveToken("expired-jwt-token");
    const { unmount } = render(<MainMenuPage />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(SessionProvider.isSessionExpired()).toBe(true);
    unmount();

    render(<LoginPage />);
    expect(screen.getByText(SESSION_EXPIRED_MESSAGE)).toBeInTheDocument();

    // เข้าสู่ระบบใหม่อีกครั้ง
    await userEvent.type(screen.getByLabelText("ชื่อผู้ใช้งาน (Username)"), "6809610000");
    await userEvent.type(screen.getByLabelText("รหัสผ่าน (Password)"), "demo-password");
    await userEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบ (Login)" }));

    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
    expect(SessionProvider.isSessionExpired()).toBe(false);
    expect(SessionProvider.getToken()).toBe("new-token");
  });

  it("เมื่อกดปุ่มออกจากระบบเองแต่เกิดข้อผิดพลาดจาก API ระบบยังล้างข้อมูลฝั่งหน้าเว็บและกลับหน้า Login โดยไม่แสดง banner เซสชันหมดอายุ", async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new ApiError({ status: 500 }));
    SessionProvider.saveToken("valid-token");
    const { unmount } = render(<MainMenuPage />);

    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(SessionProvider.isAuthenticated()).toBe(false);
    expect(SessionProvider.isSessionExpired()).toBe(false);
    unmount();

    render(<LoginPage />);
    expect(screen.queryByText(SESSION_EXPIRED_MESSAGE)).not.toBeInTheDocument();
  });
});
