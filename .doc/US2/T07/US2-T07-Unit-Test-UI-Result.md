# US2-T07 ผลการทดสอบ Unit Test ส่วน UI

Oct 19, 2026

## สรุปผล

รัน Unit Test ฝั่ง Frontend ของ **US2 (ลบวิชาจากตารางเรียนจำลอง)** ตามเอกสารออกแบบ [US2-T11 Unit Test Cases (UI Component)](../US2-T11-test-case-ui.md) และ [US2-T05 DTO & API Spec](../T05/US2-DTO-API-Spec.md) ด้วย Vitest และ React Testing Library **ผ่านครบ 15/15 กรณี** (และเมื่อรันรวมทั้งโปรเจกต์ `npm test` **ผ่านครบ 53/53 กรณี** จาก 6 ไฟล์ทดสอบ)

| ชุดทดสอบ | ไฟล์ | จำนวน Test | ผล |
| --- | --- | :---: | :---: |
| Unit Test ของ `AddedCoursesList` (ปุ่มลบ, Checkbox, กล่องยืนยันก่อนลบทั้งหมด, Disabled State) | `frontend/features/timetable-delete/AddedCoursesList.test.tsx` | 7 | **ผ่าน 7/7** |
| Unit Test หน้าตารางเรียนจำลอง (`Timetable` + `useTimetable` + `timetableDeleteApi`) | `frontend/features/timetable-delete/TimetableDelete.test.tsx` | 8 | **ผ่าน 8/8** |
| ชุดทดสอบเดิมของโปรเจกต์ (US1 + US5) | `Timetable.test.tsx`, `ExportPngButton.test.tsx`, `TimetableExport.test.tsx`, `exportPng.test.ts` | 38 | **ผ่าน 38/38** |
| **รวมทั้งหมด** | **6 ไฟล์ทดสอบ** | **53** | **ผ่าน 53/53** |

**User Story:** US2 ลบวิชาจากตารางเรียนจำลอง · **Branch:** `feature/US2-T07-develop-ui`

---

## สภาพแวดล้อมการทดสอบ

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-19 |
| คำสั่งที่ใช้รัน | `cd frontend && npm test` (`vitest run`) |
| ตรวจสอบคุณภาพโค้ด | `npm run lint` (ESLint ผ่าน 0 warning / 0 error) และ `npx tsc --noEmit` (TypeScript ผ่าน) |
| Test Runner & Libraries | Vitest 3.2.7 · `@testing-library/react` · `@testing-library/user-event` · `jsdom` |
| ข้อมูลจำลอง (Fixture) | รายวิชาภาคเรียน `1/2568` จาก `frontend/features/timetable/testFixtures.ts` (`CS180`, `MA211`, `CS111`, `LAS101`, `TU101`, `TU106`, `TU109`) |

---

## สิ่งที่พัฒนาในส่วน UI (US2-T07)

1. **`frontend/features/timetable/components/AddedCoursesList.tsx`**
   - **Checkbox เลือกหลายวิชา:** เพิ่ม `<input type="checkbox">` ประจำแต่ละการ์ดรายวิชาในส่วน "วิชาที่เพิ่มแล้ว" (`aria-label="เลือกวิชา <รหัสวิชา>"`)
   - **ปุ่มลบที่เลือก (`ลบที่เลือก` / `ลบที่เลือก (N)`):** อยู่บนหัวกล่อง "วิชาที่เพิ่มแล้ว" จะเป็น `disabled` เมื่อยังไม่ได้ติ๊กวิชาใด หรือตารางว่าง และเมื่อกดจะส่งรายการ `entryId` ที่ติ๊กไปยัง `onRemoveMultiple` พร้อมล้าง Checkbox หลังลบสำเร็จ
   - **ปุ่มลบทั้งหมด (`ลบทั้งหมด`) และกล่องยืนยันบนหน้าจอก่อนลบทั้งหมด:** เมื่อกดปุ่ม `ลบทั้งหมด` จะแสดงกล่องยืนยันบนหน้าจอ (`ยืนยันการลบรายวิชาทั้งหมดหรือไม่?`) ที่ระบุจำนวนและรหัสวิชาทั้งหมด พร้อมปุ่ม `ยืนยันลบทั้งหมด` และ `ยกเลิก`
   - **ปุ่มลบรายวิชา (`ลบวิชา`):** ประจำแต่ละการ์ดรายวิชาสำหรับลบ 1 วิชาทันที
   - **การปิดใช้งานปุ่ม (Disabled State):** เมื่อตารางว่าง (`entries.length === 0`) หรืออยู่ในสถานะกำลังลบ (`deleteStatus === "deleting"`) ปุ่มลบและ Checkbox จะถูกปิดใช้งาน (`disabled`) เพื่อป้องกันการกดเมื่อไม่มีวิชาและการกดซ้ำ
2. **`frontend/features/timetable/hooks/useTimetable.ts` & `Timetable.tsx`**
   - เชื่อม `removeCourse(entryId)` เข้ากับ `timetableDeleteApi.removeEntry` (`DELETE /api/timetable/entries/{entryId}`)
   - เชื่อม `removeCourses(entryIds)` เข้ากับ `timetableDeleteApi.removeEntries` (`DELETE /api/timetable/entries?entryIds=...`)
   - อัปเดต `Timetable` จาก Response ของ Backend ทันทีหลังลบ (ทั้งตาราง Grid, หน่วยกิตรวม และแถบแจ้งเตือนเวลาชน)
   - จัดการกรณี Error: หากได้ `404` (ข้อมูลบนหน้าจอเก่า) จะแจ้งเตือนและโหลดตารางล่าสุดใหม่ (`reload()`) หากเกิด Network/Server Error จะแสดงข้อความให้ลองใหม่

---

## ผลการทดสอบรายกรณี (เทียบกับ US2-T11 และ US2-T05)

### 1. `AddedCoursesList.test.tsx` (7 กรณี)

| ลำดับ | อ้างอิง US2-T11 | ชื่อกรณีทดสอบ | สิ่งที่ตรวจ | ผล | เวลา |
| :---: | :---: | --- | --- | :---: | :---: |
| 1 | **TC4** | ตารางว่างเปล่า ปุ่มลบที่เลือกและปุ่มลบทั้งหมดถูกปิดใช้งาน (`disabled`) และไม่มีปุ่มลบวิชา | เมื่อ `entries = []` แสดงข้อความ "ยังไม่มีวิชาในตาราง" ปุ่ม `ลบที่เลือก` และ `ลบทั้งหมด` เป็น `disabled` | **PASS** | 44 ms |
| 2 | **TC1** | กดปุ่มลบวิชาของรายวิชาเดียว ส่ง `entryId` ของวิชานั้นไปยัง `onRemove` | คลิกปุ่ม `ลบวิชา` ในการ์ด `CS111` แล้ว `onRemove` ถูกเรียก 1 ครั้งด้วย `entryId` ของ `CS111` | **PASS** | 21 ms |
| 3 | **TC2** | เลือก Checkbox หลายวิชาแล้วกดลบที่เลือก ส่ง `entryIds` ที่ติ๊กไปยัง `onRemoveMultiple` และล้าง Checkbox หลังลบสำเร็จ | ติ๊ก `CS111` และ `MA211` ปุ่มเปลี่ยนเป็น `ลบที่เลือก (2)` พอกดแล้วส่ง `[cs111Id, ma211Id]` และล้าง Checkbox | **PASS** | 45 ms |
| 4 | — | ติ๊ก Checkbox แล้วยกเลิกติ๊กทั้งหมด ปุ่มลบที่เลือกกลับเป็น `disabled` | ติ๊ก 1 วิชาแล้วเอาติ๊กออก ปุ่ม `ลบที่เลือก` กลับเป็น `disabled` | **PASS** | 24 ms |
| 5 | **TC3** | กดปุ่มลบทั้งหมด แสดงกล่องยืนยันบนหน้าจอ กดยกเลิกจะปิดกล่องโดยไม่ลบ และกดยืนยันจะส่ง `entryIds` ทุกวิชา | ตรวจการเปิดกล่องยืนยันบนหน้าจอ ปุ่ม `ยกเลิก` ไม่เรียก API ส่วนปุ่ม `ยืนยันลบทั้งหมด` ส่ง `entryId` ทุกวิชา | **PASS** | 50 ms |
| 6 | — | ระหว่างกำลังลบ (`deleteStatus = "deleting"`) ปุ่มลบและ Checkbox ทั้งหมดถูกปิดใช้งานกันกดซ้ำ | ปุ่ม `ลบที่เลือก`, `ลบทั้งหมด`, `ลบวิชา` และ Checkbox ทุกตัวเป็น `disabled` | **PASS** | 7 ms |
| 7 | — | แสดงข้อความแจ้งเตือนเมื่อ `deleteError` ไม่เป็นค่าว่าง | แสดง `role="alert"` พร้อมข้อความแจ้งเตือนเมื่อลบไม่สำเร็จ | **PASS** | 2 ms |

### 2. `TimetableDelete.test.tsx` (8 กรณี)

| ลำดับ | อ้างอิง US2-T11 | ชื่อกรณีทดสอบ | สิ่งที่ตรวจ | ผล | เวลา |
| :---: | :---: | --- | --- | :---: | :---: |
| 1 | **TC1** | ลบ 1 วิชาด้วยปุ่มลบวิชาของ `CS111` ออกจากตาราง โดยไม่กระทบวิชาอื่นที่เหลือ | เรียก `removeEntry` ด้วย `entryId` ของ `CS111`, หน่วยกิตลดจาก `9 / 22` เป็น `6 / 22`, `CS111` หายจาก Grid และรายการ ส่วน `CS180` และ `MA211` ยังอยู่ครบ | **PASS** | 118 ms |
| 2 | **TC2** | เลือก Checkbox มากกว่า 1 วิชา (`CS111` และ `MA211`) แล้วกดลบที่เลือก ลบพร้อมกันโดยไม่กระทบวิชาอื่น | เรียก `removeEntries([cs111Id, ma211Id])`, หน่วยกิตเหลือ `3 / 22`, เหลือเฉพาะ `CS180` บน Grid และรายการ | **PASS** | 72 ms |
| 3 | **TC3** | กดปุ่มลบทั้งหมด แสดงกล่องยืนยันบนหน้าจอ และเมื่อยืนยันจะลบทุกวิชาจนตารางว่าง พร้อมเพิ่มวิชาใหม่ได้ | กด `ลบทั้งหมด` → กด `ยืนยันลบทั้งหมด` → เรียก `removeEntries` ด้วย `entryId` ทุกวิชา → ตารางแสดง Empty State (`0 / 22` หน่วยกิต) และปุ่มลบกลายเป็น `disabled` | **PASS** | 54 ms |
| 4 | **TC4** | ตารางเรียนจำลองว่างเปล่า ปุ่มลบถูกปิดใช้งาน (`disabled`) และไม่เรียก API | เมื่อเริ่มต้นด้วยตารางว่าง ปุ่ม `ลบที่เลือก` และ `ลบทั้งหมด` เป็น `disabled` คลิกแล้วไม่มีการเรียก API ลบ | **PASS** | 34 ms |
| 5 | — | ลบวิชาที่เวลาชนกันออกแล้ว แถบแจ้งเตือนเวลาชนหายไป และปุ่ม PNG กลับมากดได้ | ตารางมี `LAS101` ชนกับ `TU109` เมื่อกดลบ `LAS101` แถบเตือนเวลาชนหายไปและปุ่ม `PNG` กลับมาเป็น `enabled` | **PASS** | 56 ms |
| 6 | — | ระหว่างรอลบวิชา ปุ่มลบทุกปุ่มเป็น `disabled` กันการกดซ้ำ | หน่วง Promise ของ `removeEntry` แล้วคลิกซ้ำ มีการเรียก API เพียง 1 ครั้ง | **PASS** | 47 ms |
| 7 | — | เมื่อ API ตอบ `404` (ข้อมูลบนหน้าจอเก่า) แสดงข้อความแจ้งเตือนและโหลดตารางล่าสุดใหม่ | แสดงข้อความแจ้งเตือนว่าตารางมีการเปลี่ยนแปลง และเรียก `fetchTimetable` โหลดข้อมูลล่าสุด | **PASS** | 34 ms |
| 8 | — | เมื่อลบวิชาไม่สำเร็จ (Network/500 Error) แสดงข้อความให้ลองใหม่ และกดลบซ้ำจนสำเร็จได้ | แสดงข้อความ `ลบวิชาไม่สำเร็จ กรุณาลองใหม่` ปุ่มกลับมากดได้ และพอกดซ้ำลบสำเร็จข้อความ Error หายไป | **PASS** | 52 ms |

---

## ความครอบคลุมเทียบกับ US2-T11 Test Cases

| Test Case ใน US2-T11 | รายละเอียด | กรณีทดสอบที่ครอบคลุม | สถานะ |
| --- | --- | --- | :---: |
| **Test Case 1** | ลบ 1 วิชาจากตารางเรียนจำลอง (`CS111 Sec 030001`) โดยไม่กระทบวิชาอื่น | `AddedCoursesList.test.tsx` (#2), `TimetableDelete.test.tsx` (#1) | **PASS** |
| **Test Case 2** | ลบมากกว่า 1 วิชาพร้อมกัน (`CS111` และ `MA211`) โดยไม่กระทบวิชาอื่น | `AddedCoursesList.test.tsx` (#3), `TimetableDelete.test.tsx` (#2) | **PASS** |
| **Test Case 3** | ลบทุกวิชาจากตารางเรียนจำลอง (ผ่านกล่องยืนยันบนหน้าจอ) จนได้ Empty State | `AddedCoursesList.test.tsx` (#5), `TimetableDelete.test.tsx` (#3) | **PASS** |
| **Test Case 4** | ตารางเรียนจำลองว่างเปล่า ปุ่มลบต้องถูกปิดใช้งาน (`Disabled`) | `AddedCoursesList.test.tsx` (#1), `TimetableDelete.test.tsx` (#4), `Timetable.test.tsx` (#17) | **PASS** |

---

## เอกสารที่เกี่ยวข้อง
- [US2-T11 Unit Test Cases (UI Component)](../US2-T11-test-case-ui.md)
- [US2-T05 DTO & API Spec](../T05/US2-DTO-API-Spec.md)
- [US2-T13 Integration Test Cases (UI ↔ API)](../US2-T13-Integration-Test-Cases.md)
- [US2-T16 User Acceptance Test (UAT)](../US2-T16-UAT.md)
