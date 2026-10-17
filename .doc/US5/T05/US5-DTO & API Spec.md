# US5 — DTO & API Spec: บันทึกตารางเรียนส่งออกเป็นภาพ

Oct 13, 2026 · @Wongsakorn

## ภาพรวม

US5 ส่งออกตารางเรียนจำลองเป็นไฟล์ `.png` **ฝั่ง browser** จากตารางที่แสดงอยู่บนหน้าจอ จึง**ไม่มี endpoint ใหม่และไม่มี DTO ใหม่** ใช้ `GET /api/timetable` และ `TimetableResponse` ของ [US1-T05](../../US1/T05/US1-DTO%20&%20API%20Spec.md) ตามที่ US1 เขียนไว้ว่า "US5 สร้าง PNG ฝั่ง client จาก `GET /api/timetable` ได้เลย"

สิ่งที่ออกแบบในเอกสารนี้คือ**สัญญาฝั่ง frontend**: component ปุ่ม PNG รับอะไร, ส่วนไหนของหน้าถูกถ่ายเป็นภาพ, ตั้งชื่อไฟล์อย่างไร และจัดการกรณีตารางว่าง/error อย่างไร ให้ US5-T07 (Develop UI) และ US5-T11 (Unit Test UI) ใช้ต่อ

- **UI:** ปุ่ม "⬇ PNG" ที่หัวกล่อง "ตารางเรียนจำลอง" ข้างปุ่ม "ไปยัง REG-TU" ตาม UI Prototype ใน [Google Stitch](https://stitch.withgoogle.com/projects/17068207687263442838) และ Figma [frame 1:2544](https://www.figma.com/design/U0Ot2xwePE9ooeQV2CZC5V/CS261?node-id=1-2544)
- **Test case:** CoS ของ US5 ข้อ 1–2 และ [UAT ของ US5 (US5-T16)](../US5-T16-uat-test-cases.md)
- **นอกขอบเขต:** การแชร์ภาพไปที่อื่น, การเลือกชนิดไฟล์อื่น (มีแค่ PNG), การส่งออกจาก server

## API ที่ใช้ (ของ US1 ไม่เปลี่ยน)

| Method | Path | US5 ใช้ทำอะไร |
| --- | --- | --- |
| GET | `/api/timetable?academicYear=2568&semester=1` | ข้อมูลที่วาดอยู่ในกล่องตาราง, ใช้ `academicYear` / `semester` ตั้งชื่อไฟล์ และใช้ `conflicts` ตัดสินว่าบันทึกภาพได้หรือไม่ |

ตอนกดปุ่ม PNG **ไม่เรียก API ซ้ำ** เพราะ US1 โหลด `Timetable` มาวาดหน้าจอไว้แล้ว ภาพจึงตรงกับสิ่งที่ผู้ใช้เห็นตอนกด (UAT-US5-01 ขั้นที่ 4) ถ้าในอนาคตกดเพิ่ม/ลบวิชาแล้ว US1/US2 อัปเดต state ใหม่ ภาพครั้งถัดไปก็จะตามหน้าจอเอง

## DTO ที่ใช้ (ของ US1 ไม่เปลี่ยน)

ใช้ type `Timetable` จาก `frontend/features/timetable/types.ts` ของ US1 field ที่ปรากฏในภาพ:

| ส่วนในภาพ | Field |
| --- | --- |
| หัวข้อ "ตารางเรียนจำลอง" | — (ข้อความคงที่) |
| chip รหัสวิชาเหนือ grid | `entries[].courseCode` |
| หัวแถววัน / หัวคอลัมน์เวลา | จ.–ส. 08:00–21:00 คงที่ ตาม grid ของ US1 |
| บล็อกวิชา: รหัส, Sec, เวลา, ห้อง | `courseCode`, `sectionNo`, `schedules[].startTime`–`endTime`, `room` |
| "วิชาในตารางเรียน: N วิชา (X หน่วยกิต)" | `entries.length`, `totalCredits` |
| ชื่อไฟล์ | `academicYear`, `semester` |
| ปุ่ม PNG กดได้หรือไม่ | `conflicts` (ไม่ว่าง = มีเวลาชน = ไม่อนุญาตให้บันทึกภาพ) |

## สัญญาฝั่ง frontend

โค้ดอยู่ใน `frontend/features/timetable-export/` แยกจาก `features/timetable/` ของ US1 ตามหลัก "1 ฟีเจอร์ = 1 โฟลเดอร์" ใน README เพื่อไม่ให้แก้ไฟล์เดียวกับเจ้าของ US1 ส่วนที่ต้องแตะไฟล์ของ US1 มีแค่ 2 จุดในขั้น Integrate (ดูหัวข้อ "จุดเชื่อมกับ US1")

```ts
// frontend/features/timetable-export/types.ts
export type ExportStatus = "idle" | "exporting" | "error";

export type ExportPngButtonProps = {
  targetRef: React.RefObject<HTMLElement | null>; // กล่อง "ตารางเรียนจำลอง" ของ US1
  academicYear: number;                          // Timetable.academicYear
  semester: number;                              // Timetable.semester
  hasConflicts: boolean;                         // Timetable.conflicts.length > 0
};
```

```ts
// frontend/features/timetable-export/exportPng.ts
export const EXPORT_IGNORE_ATTR = "data-export-ignore";

/** timetable-2568-1.png */
export function buildExportFileName(academicYear: number, semester: number): string;

/** ถ่าย element เป็น PNG แล้วสั่ง browser ดาวน์โหลด — throw ถ้าสร้างภาพไม่ได้ */
export function exportElementToPng(element: HTMLElement, fileName: string): Promise<void>;
```

### พฤติกรรมของปุ่ม

| สถานะ | ปุ่มแสดง | กดได้ |
| --- | --- | --- |
| `idle` | "⬇ PNG" | ได้ **รวมถึงตอนตารางว่าง** (CoS ข้อ 2) |
| `idle` + `hasConflicts` | "⬇ PNG" | ไม่ได้ (disabled) ตารางที่มีเวลาชนไม่อนุญาตให้บันทึกภาพ |
| `exporting` | "⬇ PNG" (ข้อความไม่เปลี่ยน) | ไม่ได้ (disabled กันกดซ้ำแล้วได้หลายไฟล์) สร้างภาพเสร็จแล้วดาวน์โหลดทันที |
| `error` | "⬇ PNG" + ข้อความแดงใต้ปุ่ม "ส่งออกภาพไม่สำเร็จ กรุณาลองใหม่" | ได้ (กดใหม่ = ลองใหม่ และล้างข้อความ) |

### ขั้นตอนใน `exportElementToPng`

1. รอ `document.fonts.ready` ให้ฟอนต์ไทยโหลดครบก่อน ไม่งั้นภาพอาจได้ฟอนต์สำรองหรือตัวอักษรหาย (UAT-US5-01 ขั้นที่ 5)
2. ถ่ายด้วย `toPng` ของไลบรารี [`html-to-image`](https://www.npmjs.com/package/html-to-image) โดยตั้งค่า:
   - `pixelRatio: 2` ให้ภาพคมพออ่านบนมือถือ
   - `backgroundColor: "#ffffff"` กันพื้นหลังโปร่งใส
   - `width` / `height` = `element.scrollWidth` / `scrollHeight` เพราะ grid มี `min-w-[900px]` และ `overflow-x-auto` ถ้าไม่ตั้ง จอแคบจะได้ภาพแค่ส่วนที่มองเห็น (ตารางถูกตัด)
   - `filter` ตัด element ที่มี `data-export-ignore` ออก (ปุ่ม PNG และ "ไปยัง REG-TU" ไม่ควรอยู่ในภาพ)
3. สร้าง `<a download={fileName} href={dataUrl}>` แล้ว `click()` เพื่อดาวน์โหลด

**ทำไม `html-to-image` ไม่ใช่ `html2canvas`:** Tailwind 4 ที่โปรเจกต์ใช้กำหนดสีด้วย `oklch()` ซึ่ง `html2canvas` อ่านไม่ได้และ error ส่วน `html-to-image` ให้ browser วาด CSS เอง จึงได้สีและฟอนต์ตรงกับหน้าจอ (ยืนยันอีกครั้งตอน US5-T07 ถ้าเจอปัญหาให้ลอง `modern-screenshot` ซึ่งใช้ API แบบเดียวกัน) — เพิ่ม dependency ใน `package.json` เป็นไฟล์ร่วม ต้องบอกกลุ่มก่อนตาม CONTRIBUTING

### ส่วนที่อยู่ในภาพ

ภาพ = กล่อง `<section>` "ตารางเรียนจำลอง" ทั้งกล่อง ยกเว้นปุ่ม:

| อยู่ในภาพ | ไม่อยู่ในภาพ |
| --- | --- |
| หัวข้อ "ตารางเรียนจำลอง" | ปุ่ม PNG และ "ไปยัง REG-TU" (`data-export-ignore`) |
| chip รหัสวิชา | แถบเตือน "ตรวจพบเวลาเรียนซ้อนทับกัน" (อยู่นอกกล่อง) |
| grid วัน × เวลา พร้อมบล็อกวิชา | header ของเว็บ, ชื่อ/รหัสนักศึกษา, ส่วนค้นหารายวิชา |
| แถบสรุป "วิชาในตารางเรียน: …" | ข้อความสถานะการบันทึก เช่น "บันทึกตารางร่างล่าสุดเมื่อ…" ถ้ามีในกล่องตาราง ให้ใส่ `data-export-ignore` |

ตารางที่มีเวลาชน**บันทึกเป็นภาพไม่ได้** ปุ่ม PNG ยังแสดงที่หัวกล่องตารางแต่เป็น disabled ตามที่ผู้ออกแบบ UI กำหนด ผู้ใช้ต้องแก้เวลาชนก่อนจึงจะบันทึกภาพได้

แถบเตือนเวลาชนไม่อยู่ในภาพ (UI Prototype ไม่มีแถบเตือนหน่วยกิตเกินแล้ว เพราะระบบไม่ยอมให้เพิ่มวิชาจนเกินกำหนด) ถ้าภายหลังย้ายแถบเตือนเข้าไปอยู่ในกล่องตาราง ให้ใส่ `data-export-ignore` ด้วย

grid ของ US1 เป็น จ.–ส. 08:00–21:00 คงที่ ซึ่งกว้างกว่าหน้าจอจนต้องเลื่อนแนวนอน การถ่ายด้วย `scrollWidth` / `scrollHeight` ทำให้ได้ตารางครบไม่ถูกตัด

### ชื่อไฟล์

`timetable-{academicYear}-{semester}.png` เช่น `timetable-2568-1.png` หรือ `timetable-2568-2.png` ใช้ตัวอักษรอังกฤษล้วน กันปัญหาชื่อไฟล์ภาษาไทยบนบางระบบ ปีและภาคมาจาก `Timetable` ที่แสดงอยู่ (`academicYear`, `semester`) **ไม่ใช่ค่าในตัวกรองของส่วนค้นหารายวิชา** ถ้ากดหลายครั้ง browser จะเติม `(1)`, `(2)` ให้เอง ไม่รวมภาคฤดูร้อน เพราะทีมตกลงว่าจะไม่พัฒนาส่วนภาคฤดูร้อน

## Error

ไม่มี HTTP error เพราะไม่เรียก API มีแค่ error ฝั่ง browser:

| กรณี | ผล |
| --- | --- |
| `targetRef.current` เป็น `null` (กล่องตารางยังไม่ render) | สถานะ `error` แสดงข้อความแดง ไม่ดาวน์โหลด |
| `toPng` throw (เช่น browser ไม่รองรับ หรือหน่วยความจำไม่พอ) | สถานะ `error` แสดงข้อความแดง และ `console.error` ไว้ debug |
| ตารางมีเวลาชน (`conflicts` ไม่ว่าง) | **ไม่ใช่ error** ปุ่ม PNG disabled ไม่เรียก `toPng` และไม่ดาวน์โหลด |
| ตารางว่าง (`entries: []`) | **ไม่ใช่ error** ได้ภาพตารางเปล่าที่มีหัววันและหัวเวลาตาม grid ของ US1 (CoS ข้อ 2, UAT-US5-02) |

## จุดเชื่อมกับ US1 (ทำใน US5-T07 / ขั้น Integrate)

1. component ตารางของ US1 ส่ง `ref` ของ `<section>` และ `hasConflicts` ให้ `ExportPngButton` และวางปุ่มแทนปุ่ม PNG ที่เป็นแค่หน้าตาใน prototype
2. ใส่ `data-export-ignore` ที่ปุ่ม "ไปยัง REG-TU" (และข้อความสถานะการบันทึก ถ้ามี)

ทั้งสองจุดเป็นไฟล์ของ US1 ต้องคุยกับเจ้าของ US1-T07 ก่อนแก้

## สิ่งที่ US5-T11 ควรออกแบบเทสต์ (ข้อเสนอ)

- `buildExportFileName(2568, 1)` = `"timetable-2568-1.png"` และ `buildExportFileName(2568, 2)` = `"timetable-2568-2.png"`
- ปุ่มกดได้ตอน `entries: []`
- ปุ่ม disabled เมื่อ `hasConflicts` และไม่เรียก `toPng`
- ระหว่าง `exporting` ปุ่ม disabled โดยข้อความยังเป็น "PNG"
- `toPng` ถูกเรียกด้วย element จาก `targetRef` และ filter ตัด `data-export-ignore`
- `toPng` throw → แสดงข้อความ error และกดใหม่ได้
- `targetRef.current = null` → แสดงข้อความ error ไม่ดาวน์โหลด

## เอกสารที่เกี่ยวข้อง

- [DTO Class Diagram](./US5-DTO-Class-Diagram.md)
- [API Class Diagram](./US5-API-Class-Diagram.md)
- [US1 — DTO & API Spec](../../US1/T05/US1-DTO%20&%20API%20Spec.md)
- [User Acceptance Test (US5-T16)](../US5-T16-uat-test-cases.md)
