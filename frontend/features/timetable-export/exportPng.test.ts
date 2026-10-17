import { toPng } from "html-to-image";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildExportFileName,
  EXPORT_IGNORE_ATTR,
  exportElementToPng,
  shouldIncludeInExport,
} from "./exportPng";

vi.mock("html-to-image", () => ({ toPng: vi.fn() }));

const DATA_URL = "data:image/png;base64,TEST";

// jsdom ไม่คำนวณ layout จึงกำหนดขนาดเองใน test
const setSize = (element: HTMLElement, size: Partial<Record<"scrollWidth" | "clientWidth" | "scrollHeight", number>>) => {
  Object.entries(size).forEach(([key, value]) =>
    Object.defineProperty(element, key, { configurable: true, value }),
  );
};

describe("[UT-UI-01] buildExportFileName", () => {
  it.each([
    [2568, 1, "timetable-2568-1.png"],
    [2568, 2, "timetable-2568-2.png"],
    [2567, 1, "timetable-2567-1.png"],
  ])("(%i, %i) ได้ %s", (academicYear, semester, expected) => {
    const fileName = buildExportFileName(academicYear, semester);

    expect(fileName).toBe(expected);
    expect(fileName).toMatch(/^[a-z0-9-]+\.png$/);
  });
});

describe("shouldIncludeInExport", () => {
  it("ตัด element ที่มี data-export-ignore และเก็บ element อื่นกับ text node", () => {
    const ignored = document.createElement("button");
    ignored.setAttribute(EXPORT_IGNORE_ATTR, "");
    const kept = document.createElement("h2");
    const text = document.createTextNode("CS180") as unknown as HTMLElement;

    expect(shouldIncludeInExport(ignored)).toBe(false);
    expect(shouldIncludeInExport(kept)).toBe(true);
    expect(shouldIncludeInExport(text)).toBe(true);
  });
});

describe("exportElementToPng", () => {
  let clickedLinks: HTMLAnchorElement[];

  beforeEach(() => {
    vi.mocked(toPng).mockReset().mockResolvedValue(DATA_URL);
    clickedLinks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(document, "fonts");
  });

  it("ถ่ายกล่องด้วย option ตามสเปก แล้วดาวน์โหลดตามชื่อไฟล์", async () => {
    const box = document.createElement("section");
    setSize(box, { scrollWidth: 1600, scrollHeight: 720 });

    await exportElementToPng(box, "timetable-2568-1.png");

    expect(toPng).toHaveBeenCalledTimes(1);
    expect(toPng).toHaveBeenCalledWith(box, expect.objectContaining({
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: 1600,
      height: 720,
      filter: shouldIncludeInExport,
    }));
    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].download).toBe("timetable-2568-1.png");
    expect(clickedLinks[0].href).toBe(DATA_URL);
  });

  it("จอแคบ: ขยายกล่องให้เห็น grid ที่ถูกซ่อนระหว่างถ่าย แล้วคืนความกว้างเดิม", async () => {
    const box = document.createElement("section");
    const scroller = document.createElement("div");
    box.append(scroller);
    box.style.width = "50%";
    Object.defineProperty(box, "offsetWidth", { configurable: true, value: 360 });
    setSize(scroller, { scrollWidth: 800, clientWidth: 320 });
    let widthWhileCapturing = "";
    vi.mocked(toPng).mockImplementation(async (node) => {
      widthWhileCapturing = node.style.width;
      return DATA_URL;
    });

    await exportElementToPng(box, "timetable-2568-1.png");

    expect(widthWhileCapturing).toBe(`${360 + 480}px`);
    expect(box.style.width).toBe("50%");
  });

  it("จอกว้าง: ไม่มีส่วนที่ถูกซ่อน จึงไม่เปลี่ยนความกว้างกล่อง", async () => {
    const box = document.createElement("section");
    let widthWhileCapturing = "unchanged";
    vi.mocked(toPng).mockImplementation(async (node) => {
      widthWhileCapturing = node.style.width;
      return DATA_URL;
    });

    await exportElementToPng(box, "timetable-2568-1.png");

    expect(widthWhileCapturing).toBe("");
  });

  it("[UT-UI-07] รอฟอนต์โหลดครบก่อนเรียก toPng", async () => {
    let fontsLoaded!: () => void;
    const ready = new Promise<void>((resolve) => { fontsLoaded = resolve; });
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });

    const exporting = exportElementToPng(document.createElement("section"), "timetable-2568-1.png");
    await Promise.resolve();
    expect(toPng).not.toHaveBeenCalled();

    fontsLoaded();
    await exporting;
    expect(toPng).toHaveBeenCalledTimes(1);
  });

  it("toPng throw แล้วส่ง error ต่อ ไม่ดาวน์โหลด และคืนความกว้างเดิม", async () => {
    vi.mocked(toPng).mockRejectedValue(new Error("render failed"));
    const box = document.createElement("section");
    const scroller = document.createElement("div");
    box.append(scroller);
    setSize(scroller, { scrollWidth: 800, clientWidth: 320 });

    await expect(exportElementToPng(box, "timetable-2568-1.png")).rejects.toThrow("render failed");
    expect(clickedLinks).toHaveLength(0);
    expect(box.style.width).toBe("");
  });
});
