import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { userApi } from "../users/api";
import type { UserProfileResponse } from "../users/types";
import { authSession, AUTH_TOKEN_KEY } from "./session";
import MainMenuPage from "./MainMenuPage";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../users/api", () => ({ userApi: { getCurrentUser: vi.fn() } }));
// แยกการตรวจ session/navbar ออกจาก API ของตารางที่มีชุดทดสอบของตัวเอง
vi.mock("../timetable/Timetable", () => ({ default: () => <section aria-label="เนื้อหาตารางเรียน">ตารางเรียน</section> }));
const profile = { studentId: "6809610000", firstName: "Alysa", lastName: "Liu" };

beforeEach(() => {
  sessionStorage.clear();
  router.replace.mockReset();
  vi.mocked(userApi.getCurrentUser).mockReset().mockResolvedValue(profile);
});

describe("US3-T07: หน้าจัดตารางเริ่มต้นและ Navbar", () => {
  it("UT-25 ไม่มี token พากลับ login และไม่โหลด profile", async () => {
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(userApi.getCurrentUser).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "จัดตารางเรียนจำลอง" })).not.toBeInTheDocument();
  });

  it("UT-26 แสดงชื่อและรหัสใน Navbar และโหลด profile ด้วย token ที่เก็บไว้", async () => {
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    const navbar = within(screen.getByLabelText("ข้อมูลนักศึกษา"));
    expect(navbar.getByText("Alysa Liu")).toBeInTheDocument();
    expect(navbar.getByText("6809610000")).toBeInTheDocument();
    expect(userApi.getCurrentUser).toHaveBeenCalledWith("test-token");
    expect(screen.getByRole("button", { name: "จัดตารางเรียนจำลอง" })).toHaveAttribute("aria-current", "page");
    for (const title of ["ดูวิชาเสรีแนะนำ", "ค้นหาช่องทางขอโควตา"]) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
  });

  it("UT-27 ระหว่างรอ profile ไม่แสดง undefined หรือ null", async () => {
    let resolve!: (value: UserProfileResponse) => void;
    vi.mocked(userApi.getCurrentUser).mockReturnValue(new Promise((res) => { resolve = res; }));
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(screen.getByLabelText("ข้อมูลนักศึกษา")).toHaveTextContent("กำลังโหลดข้อมูลนักศึกษา…");
    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
    await act(async () => { resolve(profile); });
  });

  it("UT-28 แสดงชื่อและนามสกุลภาษาไทยครบ", async () => {
    vi.mocked(userApi.getCurrentUser).mockResolvedValue({ ...profile, firstName: "สมชาย", lastName: "ใจดี" });
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(await screen.findByText("สมชาย ใจดี")).toBeInTheDocument();
  });

  it("dropdown แสดงชื่อภาษาไทยจาก API ใต้รหัสนักศึกษา และชื่ออังกฤษตัวพิมพ์ใหญ่บรรทัดล่าง", async () => {
    vi.mocked(userApi.getCurrentUser).mockResolvedValue({
      studentId: "6609000001", firstName: "Somchai", lastName: "Jaidee", firstNameTh: "สมชาย", lastNameTh: "ใจดี",
    });
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    const navbar = within(await screen.findByLabelText("ข้อมูลนักศึกษา"));
    await userEvent.click(await navbar.findByRole("button", { name: /Somchai Jaidee/ }));
    const dialog = within(navbar.getByRole("dialog", { name: "เมนูบัญชีผู้ใช้" }));
    expect(dialog.getByText("สมชาย ใจดี")).toBeInTheDocument();
    expect(dialog.getByText("SOMCHAI JAIDEE")).toBeInTheDocument();
  });

  it("UT-29 profile ตอบ 401 ล้าง token และกลับหน้า login", async () => {
    vi.mocked(userApi.getCurrentUser).mockRejectedValue(new ApiError({ status: 401 }));
    authSession.saveToken("expired-token");
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(screen.queryByRole("heading", { name: "จัดตารางเรียนจำลอง" })).not.toBeInTheDocument();
  });

  it("refresh/เปิดหน้าจัดตารางใหม่อ่าน token จาก session เดิม", async () => {
    authSession.saveToken("saved-token");
    const first = render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" });
    first.unmount();
    render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" });
    expect(userApi.getCurrentUser).toHaveBeenLastCalledWith("saved-token");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("โหลด profile ไม่สำเร็จเพราะ network กดลองใหม่แล้วแสดงเมนูได้", async () => {
    vi.mocked(userApi.getCurrentUser).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(profile);
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดข้อมูลนักศึกษาไม่สำเร็จ");
    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" })).toBeInTheDocument();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe("test-token");
  });
});
