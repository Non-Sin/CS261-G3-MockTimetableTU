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
const profile = { studentId: "6809610000", firstName: "Alysa", lastName: "Liu" };

beforeEach(() => {
  sessionStorage.clear();
  router.replace.mockReset();
  vi.mocked(userApi.getCurrentUser).mockReset().mockResolvedValue(profile);
});

describe("US3-T07: เมนูหลักและ Navbar", () => {
  it("UT-25 ไม่มี token พากลับ login และไม่โหลด profile", async () => {
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(userApi.getCurrentUser).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "เมนูหลัก" })).not.toBeInTheDocument();
  });

  it("UT-26 แสดงชื่อและรหัสใน Navbar และโหลด profile ด้วย token ที่เก็บไว้", async () => {
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(await screen.findByRole("heading", { name: "เมนูหลัก" })).toBeInTheDocument();
    const navbar = within(screen.getByLabelText("ข้อมูลนักศึกษา"));
    expect(navbar.getByText("Alysa Liu")).toBeInTheDocument();
    expect(navbar.getByText("6809610000")).toBeInTheDocument();
    expect(userApi.getCurrentUser).toHaveBeenCalledWith("test-token");
    expect(screen.getByRole("link", { name: /จัดตารางเรียนจำลอง/ })).toHaveAttribute("href", "/");
    for (const title of ["ตรวจสอบเงื่อนไขรายวิชา", "บันทึกวิชาที่เคยเรียนผ่าน", "ดูวิชาเสริมแนะนำ", "ค้นหาช่องทางขอโควตา"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
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

  it("UT-29 profile ตอบ 401 ล้าง token และกลับหน้า login", async () => {
    vi.mocked(userApi.getCurrentUser).mockRejectedValue(new ApiError({ status: 401 }));
    authSession.saveToken("expired-token");
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(screen.queryByRole("heading", { name: "เมนูหลัก" })).not.toBeInTheDocument();
  });

  it("refresh/เปิดเมนูหลักใหม่อ่าน token จาก session เดิม", async () => {
    authSession.saveToken("saved-token");
    const first = render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "เมนูหลัก" });
    first.unmount();
    render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "เมนูหลัก" });
    expect(userApi.getCurrentUser).toHaveBeenLastCalledWith("saved-token");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("โหลด profile ไม่สำเร็จเพราะ network กดลองใหม่แล้วแสดงเมนูได้", async () => {
    vi.mocked(userApi.getCurrentUser).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(profile);
    authSession.saveToken("test-token");
    render(<MainMenuPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดข้อมูลนักศึกษาไม่สำเร็จ");
    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByRole("heading", { name: "เมนูหลัก" })).toBeInTheDocument();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe("test-token");
  });
});
