import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import MainMenuPage from "../auth/MainMenuPage";
import { SessionProvider } from "../auth/session";
import { fetchCourses } from "../courses/api";
import { addTimetableEntry, fetchTimetable } from "../timetable/api";
import { userApi } from "../users/api";
import { fetchElectiveDetail, fetchElectives } from "./api";
import {
  emptyTimetable,
  frenchDetail,
  frenchSummary,
  installDialogMock,
  psychologySummary,
  timetableWithCourse,
} from "./testFixtures";
import type { Timetable } from "../timetable/types";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../users/api", () => ({ userApi: { getCurrentUser: vi.fn() } }));
vi.mock("../courses/api", () => ({ fetchCourses: vi.fn() }));
vi.mock("../timetable/api", () => ({
  fetchTimetable: vi.fn(),
  addTimetableEntry: vi.fn(),
}));
vi.mock("./api", () => ({
  fetchElectives: vi.fn(),
  fetchElectiveDetail: vi.fn(),
}));

beforeAll(installDialogMock);
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  SessionProvider.saveToken("workspace-test-token");
  router.replace.mockReset();
  vi.mocked(userApi.getCurrentUser)
    .mockReset()
    .mockResolvedValue({
      studentId: "6609000001",
      firstName: "Somchai",
      lastName: "Jaidee",
    });
  vi.mocked(fetchCourses).mockReset().mockResolvedValue([]);
  vi.mocked(fetchTimetable)
    .mockReset()
    .mockImplementation(async ({ academicYear, semester }) => ({
      ...emptyTimetable,
      academicYear,
      semester,
    }));
  vi.mocked(addTimetableEntry)
    .mockReset()
    .mockResolvedValue(timetableWithCourse(frenchDetail, 601));
  vi.mocked(fetchElectives)
    .mockReset()
    .mockResolvedValue([frenchSummary, psychologySummary]);
  vi.mocked(fetchElectiveDetail).mockReset().mockResolvedValue(frenchDetail);
});

async function openElectives() {
  await userEvent.click(
    await screen.findByRole("button", { name: "ดูวิชาเสรีแนะนำ" }),
  );
  await screen.findByRole("button", { name: "อ่านรีวิว FR205" });
}

async function openFrenchDetail() {
  await userEvent.click(screen.getByRole("button", { name: "อ่านรีวิว FR205" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "รายละเอียดวิชาเสรี" }),
  );
  await dialog.findByRole("radio", { name: "Sec 260001 ภาคเรียนที่ 1" });
  return dialog;
}

describe("US6 ใช้ state ตารางร่วมกับเมนูเดิม (mock API boundary)", () => {
  it("เริ่มที่หน้าตาราง เมนูเดิมเปิดหน้าแนะนำ และเพิ่มแล้วกลับมาพบตาราง/หน่วยกิตที่อัปเดต", async () => {
    render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" });
    expect(fetchElectives).not.toHaveBeenCalled();
    await openElectives();
    expect(
      screen.getByRole("button", { name: "ดูวิชาเสรีแนะนำ" }),
    ).toHaveAttribute("aria-current", "page");
    const dialog = await openFrenchDetail();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    await screen.findByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว");
    expect(addTimetableEntry).toHaveBeenCalledTimes(1);
    expect(addTimetableEntry).toHaveBeenCalledWith({ sectionId: 601 });
    await userEvent.click(
      screen.getByRole("button", { name: "จัดตารางเรียนจำลอง" }),
    );
    const grid = within(
      screen
        .getByRole("heading", { name: "ตารางเรียนจำลอง" })
        .closest("section")!,
    );
    expect(grid.getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(grid.getAllByText("FR205", { selector: "strong" })).toHaveLength(2);
    // ไม่มี hook ตารางตัวที่สอง และไม่ต้อง reload GET เพื่อให้เห็นผล POST
    expect(fetchTimetable).toHaveBeenCalledTimes(1);
  });

  it("ภาคที่เลือกในหน้าตารางถูกส่งเป็น currentSemester แม้ตัวกรองหน้าแนะนำเป็นอีกภาค", async () => {
    render(<MainMenuPage />);
    await screen.findByRole("heading", { name: "จัดตารางเรียนจำลอง" });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "ภาคเรียน" }),
      "2",
    );
    await openElectives();
    expect(fetchElectives).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentSemester: 2 }),
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "ภาคเรียนที่ต้องการค้นหา" }),
      "1",
    );
    await waitFor(() =>
      expect(fetchElectives).toHaveBeenLastCalledWith(
        expect.objectContaining({ currentSemester: 2, semester: 1 }),
      ),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "จัดตารางเรียนจำลอง" }),
    );
    expect(screen.getByRole("combobox", { name: "ภาคเรียน" })).toHaveValue("2");
  });

  it("เพิ่มจากหน้าแนะนำแล้วเปิดรายละเอียดซ้ำ ปุ่มเพิ่มปิดจาก state ตารางใหม่", async () => {
    render(<MainMenuPage />);
    await openElectives();
    let dialog = await openFrenchDetail();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    await screen.findByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว");
    await screen.findByRole("button", { name: "อ่านรีวิว FR205" });
    dialog = await openFrenchDetail();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeDisabled();
    expect(dialog.getByText("อยู่ในตารางแล้ว")).toBeInTheDocument();
  });

  it("เปลี่ยนเมนูขณะรอเพิ่ม ผล POST ยังเข้าตารางและไม่เปิดข้อความจากหน้าเก่า", async () => {
    let resolve!: (value: Timetable) => void;
    vi.mocked(addTimetableEntry).mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    render(<MainMenuPage />);
    await openElectives();
    const dialog = await openFrenchDetail();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    await userEvent.click(
      dialog.getByRole("button", { name: "ปิดรายละเอียดวิชา" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "จัดตารางเรียนจำลอง" }),
    );
    await act(async () => {
      resolve(timetableWithCourse(frenchDetail, 601));
    });
    expect(screen.getByText("หน่วยกิต 3 / 22")).toBeInTheDocument();
    expect(
      screen.queryByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว"),
    ).not.toBeInTheDocument();
  });

  it("ปุ่มขอโควตาจากรายละเอียดเปลี่ยนเมนู header ไป quota", async () => {
    render(<MainMenuPage />);
    await openElectives();
    const dialog = await openFrenchDetail();
    await userEvent.click(
      dialog.getByRole("button", { name: /ค้นหาช่องทางขอโควตา/ }),
    );
    expect(
      screen.getByRole("button", { name: "ค้นหาช่องทางขอโควตา" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("dialog", { name: "รายละเอียดวิชาเสรี" }),
    ).not.toBeInTheDocument();
  });

  it("ไม่มี token ไม่โหลดตารางหรือวิชาเสรี และกลับ Login", async () => {
    SessionProvider.clearSession();
    render(<MainMenuPage />);
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(fetchTimetable).not.toHaveBeenCalled();
    expect(fetchElectives).not.toHaveBeenCalled();
  });
});
