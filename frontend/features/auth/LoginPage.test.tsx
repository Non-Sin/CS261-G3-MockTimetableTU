import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { userApi } from "../users/api";
import { authApi } from "./api";
import { AUTH_TOKEN_KEY } from "./session";
import LoginPage from "./LoginPage";
import type { LoginResponse } from "./types";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./api", () => ({ authApi: { login: vi.fn() }, isAuthDemo: () => false }));
vi.mock("../users/api", () => ({ userApi: { getCurrentUser: vi.fn() } }));

const username = () => screen.getByLabelText("ชื่อผู้ใช้งาน (Username)");
const password = () => screen.getByLabelText("รหัสผ่าน (Password)");
const loginButton = () => screen.getByRole("button", { name: "เข้าสู่ระบบ (Login)" });
const invalid = () => new ApiError({ status: 401, code: "INVALID_CREDENTIALS" });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

async function fill(user = userEvent.setup(), name = "6809610000", pass = "demo-password") {
  await user.type(username(), name);
  await user.type(password(), pass);
  return user;
}

beforeEach(() => {
  sessionStorage.clear();
  router.replace.mockReset();
  vi.mocked(authApi.login).mockReset().mockResolvedValue({ token: "test-token" });
  vi.mocked(userApi.getCurrentUser).mockReset();
});
afterEach(() => { vi.useRealTimers(); });

describe("US3-T07: ฟอร์ม login (T11 และข้อสรุปล่าสุด T13)", () => {
  it("UT-01 แสดงช่องกรอก ปุ่ม คำแนะนำ REG-TU และคำเตือนระบบจำลอง", () => {
    render(<LoginPage />);
    expect(username()).toHaveAttribute("placeholder", "เช่น 6809610000");
    expect(password()).toHaveAttribute("placeholder", "กรอกรหัสผ่านของคุณ");
    expect(loginButton()).toBeEnabled();
    expect(screen.getByText(/เดียวกับที่เข้าใช้งานระบบ/)).toBeInTheDocument();
    expect(screen.getByText("ไม่สามารถใช้ลงทะเบียนเรียนจริงได้")).toBeInTheDocument();
  });

  it("UT-02 ซ่อนรหัสผ่านเป็นค่าเริ่มต้น", async () => {
    render(<LoginPage />);
    await userEvent.type(password(), "secret");
    expect(password()).toHaveAttribute("type", "password");
  });

  it("UT-03 แสดงและซ่อนรหัสผ่านได้โดยไม่เปลี่ยนค่าที่กรอก", async () => {
    render(<LoginPage />);
    await userEvent.type(password(), "secret");
    await userEvent.click(screen.getByRole("button", { name: "แสดงรหัสผ่าน" }));
    expect(password()).toHaveAttribute("type", "text");
    expect(password()).toHaveValue("secret");
    await userEvent.click(screen.getByRole("button", { name: "ซ่อนรหัสผ่าน" }));
    expect(password()).toHaveAttribute("type", "password");
  });

  it.each([
    ["UT-04", "", "password", ["กรุณากรอกชื่อผู้ใช้งาน"]],
    ["UT-05", "6809610000", "", ["กรุณากรอกรหัสผ่าน"]],
    ["UT-06", "", "", ["กรุณากรอกชื่อผู้ใช้งาน", "กรุณากรอกรหัสผ่าน"]],
    ["UT-07", "   ", "password", ["กรุณากรอกชื่อผู้ใช้งาน"]],
  ])("%s ช่องว่างแสดงข้อความและไม่ส่ง API", async (_id, name, pass, messages) => {
    render(<LoginPage />);
    if (name) await userEvent.type(username(), name);
    if (pass) await userEvent.type(password(), pass);
    await userEvent.click(loginButton());
    for (const message of messages) expect(screen.getByText(message)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("UT-08 พิมพ์แล้วล้างข้อความเฉพาะช่องนั้น", async () => {
    render(<LoginPage />);
    await userEvent.click(loginButton());
    await userEvent.type(username(), "6809610000");
    expect(screen.queryByText("กรุณากรอกชื่อผู้ใช้งาน")).not.toBeInTheDocument();
    expect(screen.getByText("กรุณากรอกรหัสผ่าน")).toBeInTheDocument();
  });

  it("UT-09 ส่ง username/password จากฟอร์ม ตัดช่องว่างเฉพาะ username", async () => {
    render(<LoginPage />);
    await fill(undefined, " 6809610000 ", " pass word ");
    await userEvent.click(loginButton());
    expect(authApi.login).toHaveBeenCalledExactlyOnceWith({ username: "6809610000", password: " pass word " });
  });

  it("UT-10 ระหว่างส่ง ปุ่มกดไม่ได้และไม่ส่งซ้ำ", async () => {
    const request = deferred<LoginResponse>();
    vi.mocked(authApi.login).mockReturnValue(request.promise);
    render(<LoginPage />);
    const user = await fill();
    await user.click(loginButton());
    const waiting = screen.getByRole("button", { name: "กำลังเข้าสู่ระบบ…" });
    expect(waiting).toBeDisabled();
    await user.click(waiting);
    expect(authApi.login).toHaveBeenCalledTimes(1);
    await act(async () => { request.resolve({ token: "test-token" }); });
  });

  it("UT-11 รหัสผิดแสดงกล่องแดงและขอบแดง เก็บค่าทั้งสองช่องและไม่เปลี่ยนหน้า", async () => {
    vi.mocked(authApi.login).mockRejectedValue(invalid());
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("alert")).toHaveTextContent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง");
    expect(username()).toHaveAttribute("aria-invalid", "true");
    expect(password()).toHaveAttribute("aria-invalid", "true");
    expect(username()).toHaveValue("6809610000");
    expect(password()).toHaveValue("demo-password");
    expect(router.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("UT-12 ล้าง error เก่าระหว่างลองส่งใหม่", async () => {
    const request = deferred<LoginResponse>();
    vi.mocked(authApi.login).mockRejectedValueOnce(invalid()).mockReturnValueOnce(request.promise);
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(loginButton());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => { request.resolve({ token: "test-token" }); });
    expect(router.replace).toHaveBeenCalledWith("/");
  });

  it("UT-13 ไม่ใช่ CS ภาคปกติแสดง Access Denied ไม่เก็บ token และไม่โหลด profile", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 403, code: "NOT_CS_STUDENT" }));
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("heading", { name: "ไม่สามารถเข้าใช้งานระบบได้" })).toBeInTheDocument();
    expect(screen.getByText(/เฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ/)).toBeInTheDocument();
    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "ไม่สามารถเข้าใช้งานระบบได้" })).getByRole("link", { name: /^ไปยัง REG-TU/ })).toHaveAttribute("href", "https://vnweb68.reg.tu.ac.th/registrar/home");
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(userApi.getCurrentUser).not.toHaveBeenCalled();
  });

  it("UT-14 กลับจาก Access Denied แล้วช่องกรอกว่างทั้งคู่", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 403, code: "NOT_CS_STUDENT" }));
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    await userEvent.click(screen.getByRole("button", { name: "กลับสู่หน้าเข้าสู่ระบบ" }));
    expect(username()).toHaveValue("");
    expect(password()).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("UT-15 บัญชีไม่ active แสดงเหมือนรหัสผิดทุกประการตาม T13", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 403, code: "ACCOUNT_INACTIVE" }));
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("alert")).toHaveTextContent("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    expect(screen.queryByText("Access Denied")).not.toBeInTheDocument();
    expect(password()).toHaveValue("demo-password");
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(userApi.getCurrentUser).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it.each([new TypeError("Failed to fetch"), new ApiError({ status: 500 })])("UT-22 error ทั่วไปแสดงข้อความและส่งใหม่ได้ (%s)", async (cause) => {
    vi.mocked(authApi.login).mockRejectedValue(cause);
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("alert")).toHaveTextContent("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    expect(loginButton()).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("US3-T10 TU Login API ใช้งานไม่ได้ (503) แจ้งเชื่อมต่อไม่ได้ ไม่ใช่รหัสผิด และเก็บค่าที่กรอกไว้", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 503, code: "TU_API_UNAVAILABLE" }));
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(screen.getByRole("alert")).toHaveTextContent("ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง");
    expect(username()).not.toHaveAttribute("aria-invalid", "true");
    expect(password()).not.toHaveAttribute("aria-invalid", "true");
    expect(username()).toHaveValue("6809610000");
    expect(password()).toHaveValue("demo-password");
    expect(loginButton()).toBeEnabled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("UT-23 สำเร็จเก็บเฉพาะ token ใน sessionStorage", async () => {
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe("test-token");
    expect(sessionStorage.length).toBe(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(password()).toHaveValue("");
  });

  it.each([["ครั้งแรก", false], ["ครั้งถัดไป", true]] as const)("UT-24 login %s ไปหน้าจัดตารางเสมอ ไม่มีหน้าประวัติคั่น", async (_name, returning) => {
    if (returning) sessionStorage.setItem(AUTH_TOKEN_KEY, "previous-session-token");
    render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    expect(router.replace).toHaveBeenCalledExactlyOnceWith("/");
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe("test-token");
  });

  it("ผล login ที่ตอบหลังออกจากหน้าไม่เก็บ token หรือเปลี่ยนหน้า", async () => {
    const request = deferred<LoginResponse>();
    vi.mocked(authApi.login).mockReturnValue(request.promise);
    const { unmount } = render(<LoginPage />);
    await fill();
    await userEvent.click(loginButton());
    unmount();
    await act(async () => { request.resolve({ token: "late-token" }); });
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("US3-T07: หน้าระงับบัญชีและ countdown", () => {
  async function locked(seconds?: number) {
    render(<LoginPage />);
    await fill();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T10:00:00Z"));
    vi.mocked(authApi.login).mockRejectedValue(new ApiError({ status: 429, code: "ACCOUNT_LOCKED", retryAfterSeconds: seconds }));
    // ช่องกรอกทดสอบด้วย userEvent แล้ว; ใช้ click ปกติเพื่อแยก timer ของ userEvent ออกจาก countdown
    await act(async () => { fireEvent.click(loginButton()); });
  }

  it("UT-16 ตอบ 429 แสดงหน้าระงับและเริ่ม 15:00", async () => {
    await locked(900);
    expect(screen.getByRole("heading", { name: "ระงับการเข้าสู่ระบบชั่วคราว" })).toBeInTheDocument();
    expect(screen.getByText(/ผิดพลาด 5 ครั้ง/)).toBeInTheDocument();
    const timer = within(screen.getByRole("timer"));
    expect(timer.getByText("15")).toBeInTheDocument();
    expect(timer.getByText("00")).toBeInTheDocument();
  });

  it("UT-17 ผ่าน 1 วินาทีเป็น 14:59 แล้วอีก 60 วินาทีเป็น 13:59", async () => {
    await locked(900);
    act(() => vi.advanceTimersByTime(1000));
    expect(within(screen.getByRole("timer")).getByText("14")).toBeInTheDocument();
    expect(within(screen.getByRole("timer")).getByText("59")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(within(screen.getByRole("timer")).getByText("13")).toBeInTheDocument();
    expect(within(screen.getByRole("timer")).getByText("59")).toBeInTheDocument();
  });

  it("UT-18 ใช้เวลาที่ API ส่งมา 125 วินาทีเป็น 02:05", async () => {
    await locked(125);
    expect(within(screen.getByRole("timer")).getByText("02")).toBeInTheDocument();
    expect(within(screen.getByRole("timer")).getByText("05")).toBeInTheDocument();
  });

  it("UT-19 ครบเวลาแล้วแสดงหน้าปลดระงับพร้อมฟอร์ม โดยไม่ส่ง API เอง", async () => {
    await locked(1);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "ปลดการระงับการเข้าสู่ระบบแล้ว" })).toBeInTheDocument();
    expect(username()).toHaveValue("");
    expect(password()).toHaveValue("");
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(authApi.login).toHaveBeenCalledTimes(1);
  });

  it("UT-20 ไม่มีฟอร์มหรือปุ่ม login ระหว่างถูกระงับ", async () => {
    await locked(900);
    expect(screen.queryByLabelText("ชื่อผู้ใช้งาน (Username)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เข้าสู่ระบบ (Login)" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it("UT-21 ไม่ส่ง retryAfterSeconds ใช้สำรอง 900 วินาที", async () => {
    await locked();
    expect(within(screen.getByRole("timer")).getByText("15")).toBeInTheDocument();
    expect(within(screen.getByRole("timer")).getByText("00")).toBeInTheDocument();
  });

  it("เวลาที่ browser พักไปถูกนับด้วย และไม่ติดลบ", async () => {
    await locked(10);
    vi.setSystemTime(Date.now() + 60_000);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole("heading", { name: "ปลดการระงับการเข้าสู่ระบบแล้ว" })).toBeInTheDocument();
  });
});
