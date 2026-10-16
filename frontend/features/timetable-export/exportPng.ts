import { toPng } from "html-to-image";

// ใส่ attribute นี้ให้ element ที่ไม่ต้องการให้อยู่ในภาพ เช่น ปุ่มต่าง ๆ
export const EXPORT_IGNORE_ATTR = "data-export-ignore";

// ชื่อไฟล์ใช้ภาษาอังกฤษล้วน เช่น timetable-2569-2.png
export const buildExportFileName = (academicYear: number, semester: number) =>
  `timetable-${academicYear}-${semester}.png`;

// ตัด element ที่มี data-export-ignore ออก (text node ไม่มี hasAttribute จึงเก็บไว้)
export const shouldIncludeInExport = (node: HTMLElement) =>
  typeof node.hasAttribute !== "function" || !node.hasAttribute(EXPORT_IGNORE_ATTR);

// ความกว้างของ grid ที่ถูกซ่อนอยู่ใน element ลูกที่เลื่อนแนวนอนได้ (จอแคบ)
const getHiddenWidth = (element: HTMLElement) =>
  Math.max(
    0,
    ...Array.from(element.querySelectorAll<HTMLElement>("*")).map(
      (child) => child.scrollWidth - child.clientWidth,
    ),
  );

// ขยายกล่องบนหน้าจอชั่วคราวให้กว้างพอแสดง grid ทั้งหมด แล้วคืนฟังก์ชันสำหรับคืนค่าเดิม
// html-to-image คัดลอก style ที่คำนวณจากหน้าจอจริง ถ้าไม่ขยายกล่องจริง จอแคบจะได้ภาพที่ตารางถูกตัด
const expandToFullWidth = (element: HTMLElement) => {
  const hiddenWidth = getHiddenWidth(element);
  const originalWidth = element.style.width;

  if (hiddenWidth > 0) {
    element.style.width = `${element.offsetWidth + hiddenWidth}px`;
  }

  return () => {
    element.style.width = originalWidth;
  };
};

// สร้างลิงก์ดาวน์โหลดชั่วคราวแล้วคลิกให้ browser บันทึกไฟล์
const triggerDownload = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
};

// ถ่าย element เป็น PNG แล้วดาวน์โหลด ถ้าสร้างภาพไม่ได้จะ throw ให้ปุ่มแสดง error
export const exportElementToPng = async (element: HTMLElement, fileName: string) => {
  // รอฟอนต์โหลดครบก่อน ไม่งั้นตัวอักษรไทยในภาพอาจหายหรือเป็นฟอนต์สำรอง
  await document.fonts?.ready;

  const restoreWidth = expandToFullWidth(element);

  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: element.scrollWidth,
      height: element.scrollHeight,
      filter: shouldIncludeInExport,
    });

    triggerDownload(dataUrl, fileName);
  } finally {
    restoreWidth();
  }
};
