import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { fetchElectiveDetail, fetchElectives } from "./api";
import ElectivesPage from "./ElectivesPage";
import {
  emptyTimetable,
  frenchDetail,
  frenchSummary,
  installDialogMock,
  psychologyDetail,
  psychologySummary,
  timetableWithCourse,
} from "./testFixtures";
import type { ElectiveSummary } from "./types";
import type { Timetable } from "../timetable/types";

vi.mock("./api", () => ({
  fetchElectives: vi.fn(),
  fetchElectiveDetail: vi.fn(),
}));

const props = {
  academicYear: 2568,
  currentSemester: 1,
  timetable: emptyTimetable,
  timetableError: false,
  addDisabled: false,
  onRetryTimetable: vi.fn(),
  onAddSection: vi.fn(),
  onTimetableChanged: vi.fn(),
  onOpenQuota: vi.fn(),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function openCourse(code = "FR205") {
  await userEvent.click(
    await screen.findByRole("button", { name: `อ่านรีวิว ${code}` }),
  );
  const dialog = await screen.findByRole("dialog", { name: "รายละเอียดวิชาเสรี" });
  await within(dialog).findByRole("group", {
    name: "กลุ่มเรียนและตารางเรียน (Sections)",
  });
  return within(dialog);
}

const searchBox = () =>
  screen.getByRole("textbox", { name: "ค้นหาด้วยรหัสวิชา หรือชื่อวิชา" });

beforeAll(installDialogMock);
beforeEach(() => {
  vi.mocked(fetchElectives)
    .mockReset()
    .mockResolvedValue([frenchSummary, psychologySummary]);
  vi.mocked(fetchElectiveDetail)
    .mockReset()
    .mockImplementation(async (code) =>
      code === "FR205" ? frenchDetail : psychologyDetail,
    );
  props.onAddSection
    .mockReset()
    .mockResolvedValue(timetableWithCourse(frenchDetail, 601));
  props.onTimetableChanged.mockReset();
  props.onOpenQuota.mockReset();
  props.onRetryTimetable.mockReset();
});

describe("US6-T07 UI ตาม US6-T11", () => {
  it("เปิดหน้าแล้วโหลดรายการทันที แบ่งหมวดและนับผลจาก response", async () => {
    render(<ElectivesPage {...props} />);
    expect(await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "หมวดภาษาและการสื่อสาร" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "หมวดจิตวิทยาและพฤติกรรมศาสตร์" }),
    ).toBeInTheDocument();
    expect(screen.getByText("อาจารย์ใจดี")).toBeInTheDocument();
    expect(screen.getByText("เปิดเฉพาะเทอม 1")).toBeInTheDocument();
    expect(fetchElectives).toHaveBeenCalledWith(
      expect.objectContaining({
        academicYear: 2568,
        currentSemester: 1,
        q: "",
      }),
    );
  });

  it.each([
    ["FR205", frenchSummary],
    ["PSYCHOLOGY", psychologySummary],
  ] as const)("UT-UI-US6-01 ค้นหา %s ผ่านปุ่มหรือ Enter", async (query, course) => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    vi.mocked(fetchElectives).mockResolvedValue([course]);
    await userEvent.type(searchBox(), query + "{Enter}");
    expect(await screen.findByText("แสดงทั้งหมด 1 วิชาแนะนำ")).toBeInTheDocument();
    expect(fetchElectives).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: query }),
    );
    expect(
      screen.getByRole("button", { name: `อ่านรีวิว ${course.courseCode}` }),
    ).toBeInTheDocument();
  });

  it.each([
    ["กรองตามวันเรียน", "MONDAY", "day"],
    ["กรองตามช่วงเวลาเรียน", "AFTERNOON", "timeSlot"],
    ["หมวดหมู่วิชา", "PSYCHOLOGY", "group"],
    ["ภาคเรียนที่ต้องการค้นหา", "2", "semester"],
  ])("UT-UI-US6-02 เปลี่ยน %s ส่งค่าตัวกรองถูกต้อง", async (name, value, field) => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name }),
      value,
    );
    await waitFor(() =>
      expect(fetchElectives).toHaveBeenLastCalledWith(
        expect.objectContaining({ [field]: field === "semester" ? 2 : value }),
      ),
    );
  });

  it("UT-UI-US6-02 ใช้ทุกตัวกรองพร้อมกันโดยไม่เปลี่ยนภาคของตารางปัจจุบัน", async () => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "กรองตามวันเรียน" }),
      "MONDAY",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "กรองตามช่วงเวลาเรียน" }),
      "AFTERNOON",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "หมวดหมู่วิชา" }),
      "PSYCHOLOGY",
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "ภาคเรียนที่ต้องการค้นหา" }),
      "2",
    );
    vi.mocked(fetchElectives).mockResolvedValue([]);
    await userEvent.click(
      screen.getByRole("checkbox", { name: "แสดงเฉพาะวิชาที่ไม่ชนกับตารางปัจจุบัน" }),
    );
    await waitFor(() =>
      expect(fetchElectives).toHaveBeenLastCalledWith({
        academicYear: 2568,
        currentSemester: 1,
        q: "",
        semester: 2,
        day: "MONDAY",
        timeSlot: "AFTERNOON",
        group: "PSYCHOLOGY",
        excludeConflicts: true,
      }),
    );
    expect(
      await screen.findByRole("heading", { name: "ไม่พบรีวิววิชานี้" }),
    ).toBeInTheDocument();
  });

  it("UT-UI-US6-03 เลือก Sec แรกที่เลือกได้แม้มีหลาย Sec และเปลี่ยนเลือกได้", async () => {
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    expect(
      dialog.getByRole("radio", { name: "Sec 260001 ภาคเรียนที่ 1" }),
    ).toBeChecked();
    expect(
      dialog.getByText("เรียนภาษาฝรั่งเศสระดับ A2 ไม่มีพื้นฐานเรียนได้"),
    ).toBeInTheDocument();
    expect(dialog.getByText("วันพฤหัสบดี 16:30 - 18:00 น.")).toBeInTheDocument();
    await userEvent.click(
      dialog.getByRole("radio", { name: "Sec 260002 ภาคเรียนที่ 1" }),
    );
    expect(
      dialog.getByRole("radio", { name: "Sec 260002 ภาคเรียนที่ 1" }),
    ).toBeChecked();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    expect(props.onAddSection).toHaveBeenCalledWith(602);
    expect(fetchElectiveDetail).toHaveBeenCalledWith("FR205", 2568, 1);
  });

  it("UT-UI-US6-03 Sec ต่างภาคเลือกไม่ได้ และข้อมูล null แสดงไม่ระบุ", async () => {
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse("PY250");
    const otherTerm = dialog.getByRole("radio", {
      name: "Sec 230001 ภาคเรียนที่ 2",
    });
    expect(otherTerm).toBeDisabled();
    await userEvent.click(otherTerm);
    expect(
      dialog.getByRole("radio", { name: "Sec 820001 ภาคเรียนที่ 1" }),
    ).toBeChecked();
    expect(
      dialog.getByText("(ตารางเรียนปัจจุบันคือภาคเรียนที่ 1)"),
    ).toBeInTheDocument();
    expect(dialog.getByText("ผู้สอน: ไม่ระบุ")).toBeInTheDocument();
    expect(dialog.getByText("ห้องเรียน: ไม่ระบุ")).toBeInTheDocument();
  });

  it.each(["close", "outside", "escape"])(
    "UT-UI-US6-03 ปิด modal ด้วย %s",
    async (method) => {
      render(<ElectivesPage {...props} />);
      const content = await openCourse();
      const dialog = screen.getByRole("dialog");
      if (method === "close")
        await userEvent.click(
          content.getByRole("button", { name: "ปิดรายละเอียดวิชา" }),
        );
      if (method === "outside") fireEvent.click(dialog);
      if (method === "escape")
        fireEvent(
          dialog,
          new Event("cancel", { bubbles: true, cancelable: true }),
        );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(document.body.style.overflow).not.toBe("hidden");
      expect(
        screen.getByRole("button", { name: "อ่านรีวิว FR205" }),
      ).toHaveFocus();
    },
  );

  it("UT-UI-US6-04 เพิ่มสำเร็จ ปิด modal แจ้งรหัส/Sec และโหลดรายการใหม่เมื่อเปิดไม่ชนตาราง", async () => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    await userEvent.click(screen.getByRole("checkbox"));
    const dialog = await openCourse();
    vi.mocked(fetchElectives)
      .mockClear()
      .mockResolvedValue([psychologySummary]);
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    expect(
      await screen.findByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fetchElectives).toHaveBeenCalledWith(
        expect.objectContaining({ excludeConflicts: true }),
      ),
    );
    expect(
      screen.queryByRole("button", { name: "อ่านรีวิว FR205" }),
    ).not.toBeInTheDocument();
  });

  it("UT-UI-US6-05 เวลาชนยังเพิ่มได้ และแสดง warning หลังเพิ่ม", async () => {
    const updated = timetableWithCourse(psychologyDetail, 611);
    updated.conflicts = [
      {
        dayOfWeek: "MONDAY",
        overlapStart: "13:30",
        overlapEnd: "16:30",
        courseCodes: ["CS111", "PY250"],
      },
    ];
    props.onAddSection.mockResolvedValue(updated);
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse("PY250");
    expect(dialog.getByText(/เวลาเรียนชนกับ CS111/)).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeEnabled();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    expect(props.onAddSection).toHaveBeenCalledWith(611);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "มีเวลาเรียนซ้อนทับกับตารางปัจจุบัน",
    );
  });

  it("UT-UI-US6-06 / IT-26 หน่วยกิต 21+3 เกิน 22 ปิดปุ่ม ไม่มีข้อความเตือน และไม่เรียก handler", async () => {
    render(
      <ElectivesPage
        {...props}
        timetable={{ ...emptyTimetable, totalCredits: 21 }}
      />,
    );
    const dialog = await openCourse();
    const button = dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" });
    expect(button).toBeDisabled();
    expect(dialog.queryByRole("alert")).not.toBeInTheDocument();
    expect(dialog.queryByText(/หน่วยกิตเกิน|เกินกำหนด/)).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(props.onAddSection).not.toHaveBeenCalled();
  });

  it("หน่วยกิต 19+3 เท่ากับ 22 ยังเพิ่มได้", async () => {
    render(
      <ElectivesPage
        {...props}
        timetable={{ ...emptyTimetable, totalCredits: 19 }}
      />,
    );
    const dialog = await openCourse();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeEnabled();
  });

  it("UT-UI-US6-07 ไม่พบ SA240 แล้วปุ่มดูทั้งหมดล้างคำค้นและตัวกรองทุกตัว", async () => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "กรองตามวันเรียน" }),
      "MONDAY",
    );
    await userEvent.click(screen.getByRole("checkbox"));
    vi.mocked(fetchElectives).mockResolvedValue([]);
    await userEvent.type(searchBox(), "SA240");
    await userEvent.click(screen.getByRole("button", { name: "ค้นหาวิชา" }));
    expect(
      await screen.findByRole("heading", { name: "ไม่พบรีวิววิชานี้" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/รายวิชา SA240/)).toBeInTheDocument();
    vi.mocked(fetchElectives).mockResolvedValue([
      frenchSummary,
      psychologySummary,
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "ดูวิชาเสรีแนะนำทั้งหมด" }),
    );
    expect(searchBox()).toHaveValue("");
    for (const select of screen.getAllByRole("combobox"))
      expect(select).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ")).toBeInTheDocument();
  });

  it("ไม่ใช้ผลคำค้นเก่าที่ตอบช้าทับผลคำค้นใหม่", async () => {
    render(<ElectivesPage {...props} />);
    await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ");
    const oldRequest = deferred<ElectiveSummary[]>();
    vi.mocked(fetchElectives)
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce([psychologySummary]);
    await userEvent.type(searchBox(), "FR205{Enter}");
    await userEvent.clear(searchBox());
    await userEvent.type(searchBox(), "PY250{Enter}");
    await screen.findByText("แสดงทั้งหมด 1 วิชาแนะนำ");
    await act(async () => {
      oldRequest.resolve([frenchSummary]);
    });
    expect(
      screen.queryByRole("button", { name: "อ่านรีวิว FR205" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "อ่านรีวิว PY250" }),
    ).toBeInTheDocument();
  });

  it("โหลดรายการ error แสดงปุ่มลองใหม่ โดยไม่แสดงว่าไม่พบวิชา", async () => {
    vi.mocked(fetchElectives).mockRejectedValueOnce(
      new TypeError("Failed to fetch"),
    );
    render(<ElectivesPage {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "โหลดวิชาเสรีแนะนำไม่สำเร็จ",
    );
    expect(
      screen.queryByRole("heading", { name: "ไม่พบรีวิววิชานี้" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "ลองใหม่" }));
    expect(await screen.findByText("แสดงทั้งหมด 2 วิชาแนะนำ")).toBeInTheDocument();
  });

  it("รายละเอียด 404 แสดง error และลองโหลดใหม่ได้", async () => {
    vi.mocked(fetchElectiveDetail).mockRejectedValueOnce(
      new ApiError({ status: 404 }),
    );
    render(<ElectivesPage {...props} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "อ่านรีวิว FR205" }),
    );
    const dialog = within(screen.getByRole("dialog"));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "ไม่พบรายละเอียดวิชาเสรีนี้",
    );
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeDisabled();
    await userEvent.click(dialog.getByRole("button", { name: "ลองใหม่" }));
    expect(
      await dialog.findByRole("radio", { name: "Sec 260001 ภาคเรียนที่ 1" }),
    ).toBeChecked();
  });

  it("กันกดเพิ่มซ้ำระหว่างรอ และ network error ลองเพิ่มใหม่ได้", async () => {
    const pending = deferred<Timetable>();
    props.onAddSection.mockReturnValueOnce(pending.promise);
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    const waiting = dialog.getByRole("button", { name: "กำลังเพิ่มวิชา…" });
    expect(waiting).toBeDisabled();
    await userEvent.click(waiting);
    expect(props.onAddSection).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(timetableWithCourse(frenchDetail, 601));
    });
    expect(
      await screen.findByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว"),
    ).toBeInTheDocument();
  });

  it("เพิ่มไม่สำเร็จเพราะ network คง modal และเลือก Sec ไว้ให้ลองใหม่", async () => {
    props.onAddSection.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "เพิ่มวิชาไม่สำเร็จ กรุณาลองใหม่",
    );
    expect(
      dialog.getByRole("radio", { name: "Sec 260001 ภาคเรียนที่ 1" }),
    ).toBeChecked();
    await userEvent.click(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }));
    expect(
      await screen.findByText("เพิ่ม FR205 Sec 260001 ลงตารางแล้ว"),
    ).toBeInTheDocument();
  });

  it.each(["CREDIT_LIMIT_EXCEEDED", "COURSE_ALREADY_IN_TIMETABLE"])(
    "409 %s จากข้อมูลเก่า แสดง detail และขอโหลดตาราง/รายละเอียดใหม่",
    async (code) => {
      props.onAddSection.mockRejectedValueOnce(
        new ApiError({
          status: 409,
          code,
          detail: "ข้อมูลตารางเปลี่ยนแล้ว กรุณาตรวจสอบ",
        }),
      );
      render(<ElectivesPage {...props} />);
      const dialog = await openCourse();
      await userEvent.click(
        dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" }),
      );
      expect(await dialog.findByRole("alert")).toHaveTextContent(
        "ข้อมูลตารางเปลี่ยนแล้ว กรุณาตรวจสอบ",
      );
      expect(props.onTimetableChanged).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(fetchElectiveDetail).toHaveBeenCalledTimes(2));
    },
  );

  it("มี Sec ใดอยู่ในตารางแล้ว ปิดเพิ่มทั้งวิชา รวมถึง Sec อื่น", async () => {
    vi.mocked(fetchElectiveDetail).mockResolvedValue({
      ...frenchDetail,
      sections: frenchDetail.sections.map((section) => ({
        ...section,
        inTimetable: section.sectionId === 602,
      })),
    });
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    expect(dialog.getByText("อยู่ในตารางแล้ว")).toBeInTheDocument();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeDisabled();
    for (const radio of dialog.getAllByRole("radio"))
      expect(radio).toBeDisabled();
  });

  it("ไม่มี Sec ที่เลือกได้ไม่ส่ง POST", async () => {
    vi.mocked(fetchElectiveDetail).mockResolvedValue({
      ...frenchDetail,
      sections: [],
    });
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeDisabled();
    expect(props.onAddSection).not.toHaveBeenCalled();
  });

  it("ระหว่างตารางยังโหลดหรือโหลดผิดพลาด ปิดเพิ่มและลองโหลดตารางใหม่ได้", async () => {
    render(
      <ElectivesPage {...props} timetable={null} timetableError addDisabled />,
    );
    const dialog = await openCourse();
    expect(dialog.getByRole("button", { name: "+ เพิ่มลงตาราง" })).toBeDisabled();
    await userEvent.click(
      dialog.getByRole("button", { name: "ปิดรายละเอียดวิชา" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "ลองโหลดตารางใหม่" }),
    );
    expect(props.onRetryTimetable).toHaveBeenCalled();
  });

  it("ข้อมูลรีวิวว่าง/ไม่มีคาบมีข้อความสำรอง", async () => {
    vi.mocked(fetchElectiveDetail).mockResolvedValue({
      ...frenchDetail,
      description: [],
      sections: [{ ...frenchDetail.sections[0], schedules: [] }],
    });
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    expect(dialog.getByText("ยังไม่มีรายละเอียดวิชา")).toBeInTheDocument();
    expect(dialog.getByText("ไม่ระบุวันและเวลาเรียน")).toBeInTheDocument();
  });

  it("ปุ่มขอโควตาปิด modal แล้วไปเมนูขอโควตา", async () => {
    render(<ElectivesPage {...props} />);
    const dialog = await openCourse();
    await userEvent.click(
      dialog.getByRole("button", { name: /ค้นหาช่องทางขอโควตา/ }),
    );
    expect(props.onOpenQuota).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
