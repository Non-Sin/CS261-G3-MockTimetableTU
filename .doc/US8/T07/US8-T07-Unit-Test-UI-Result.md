# US8-T07 ผลการทดสอบ Unit Test ส่วน UI

Nov 14, 2026

## สรุปผล

รัน Unit Test ฝั่ง Frontend ของ **US8 (จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร)** ตามเอกสารออกแบบ [US8-T11 Design Unit Test Cases ส่วน UI](../T11/US8-T11-Unit-Test-UI.md), [US8-T05 DTO & API Spec](../T05/US8-DTO-API-Spec.md) และ [US8-T06 Sequence Diagrams](../T06/US8-T06-Sequence-Diagram-Preview.md) ด้วย Vitest และ React Testing Library **ผ่านครบ 16/16 กรณีใหม่ของ US8** (และเมื่อรันรวมทั้งโปรเจกต์ `npm test` **ผ่านครบ 158/158 กรณี** จาก 16 ไฟล์ทดสอบ)

| ชุดทดสอบ | ไฟล์ | จำนวน Test | ผล |
| --- | --- | :---: | :---: |
| Unit Test ของ UI จัดตารางตามแผนหลักสูตร (`UT-UI-01` – `UT-UI-13`) | `frontend/features/curriculum-plan/CurriculumPlan.test.tsx` | 13 | **ผ่าน 13/13** |
| Unit Test ของ API adapters (`getPlans`, `applyPlan`, `ProblemDetail`) | `frontend/features/curriculum-plan/api.test.ts` | 3 | **ผ่าน 3/3** |
| ชุดทดสอบเดิมของโปรเจกต์ (US1, US2, US3, US4, US5) | 14 ไฟล์ทดสอบเดิม | 142 | **ผ่าน 142/142** |
| **รวมทั้งหมด** | **16 ไฟล์ทดสอบ** | **158** | **ผ่าน 158/158** |

**User Story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร · **Branch:** `feature/US8-T07-develop-ui`

---

## สภาพแวดล้อมการทดสอบ

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-14 |
| คำสั่งที่ใช้รัน | `cd frontend && npm test` (`vitest run`) |
| ตรวจสอบคุณภาพโค้ด | `npm run lint` (`eslint` ผ่าน 0 error) และ `npx tsc --noEmit` (TypeScript ผ่าน 0 error) |
| Test Runner & Libraries | Vitest 3.2.7 · `@testing-library/react` · `@testing-library/user-event` · `jsdom` |

---

## สิ่งที่พัฒนาในส่วน UI (US8-T07)

1. **Types & API Client (`frontend/features/curriculum-plan/types.ts`, `frontend/features/curriculum-plan/api.ts`)**
   - กำหนด TypeScript types (`StudyPlanList`, `StudyPlan`, `StudyMinor`, `PlanType`, `ApplyPlanRequest`, `ApplyPlanResponse`, `AddedPlanCourse`, `SkippedPlanCourse`, `PlanSkipReason`) ตรงตาม US8-T05
   - พัฒนา `getPlans()` (`GET /api/study-plans`) และ `applyPlan()` (`POST /api/timetable/apply-plan`) ผ่าน `apiFetch`
2. **State & Flow Management (`frontend/features/curriculum-plan/hooks/useCurriculumPlan.ts`)**
   - โหลดแผนอัตโนมัติเมื่อเลือกชั้นปีและภาคเรียนครบ พร้อมป้องกัน stale response และรองรับการกด `ลองใหม่`
   - ชั้นปี 3–4 รองรับการเลือกแผนการศึกษา (`ทำหัวข้อพิเศษ` / `สหกิจศึกษา`) และวิชาโท (ค่าเริ่มต้น `ไม่เรียนวิชาโท`); เปลี่ยนเป็นปี 1–2 จะล้างและซ่อนตัวเลือกทั้งสอง; เปลี่ยนภาคเรียนจะคง `planType` และคง/ล้าง `minorId` ตามรายการวิชาโทในภาคใหม่
   - เรียก preview (`dryRun: true`) อัตโนมัติเมื่อเลือกค่าที่จำเป็นครบ โดยไม่ส่งซ้ำเมื่อเลือกค่าเดิม
   - ยืนยันด้วย `dryRun: false` พร้อมป้องกันการกดซ้ำระหว่างรอผล อัปเดตตารางเรียนด้วย `response.timetable` และเปิด dialog แจ้งเตือนหากมีวิชาที่ถูกข้ามเพราะ `TIME_CONFLICT`
3. **UI Components (`frontend/features/curriculum-plan/components/` & `frontend/features/timetable/`)**
   - ปุ่ม `จัดตามแผนหลักสูตร` บนหัวกล่อง `ตารางเรียนจำลอง` ใน `TimetableGrid` (ใส่ `data-export-ignore` เพื่อไม่ให้ติดไปในภาพ PNG)
   - `CurriculumPlanModal.tsx`: หน้าต่างเลือกชั้นปี/ภาคเรียน/แผน/วิชาโท, สรุปรายการ `added` (พร้อม section, หน่วยกิต, ป้าย `วิชาโท`) และ `skipped` (พร้อมเหตุผลทั้ง 4 แบบ), ปุ่ม `เพิ่มลงตารางเรียน`, `ยกเลิก` และ `X`
   - `PlanConflictDialog.tsx`: หน้าต่างแจ้งเตือน `ตรวจพบเวลาเรียนซ้อนทับกัน ไม่สามารถเพิ่มได้` พร้อมรายละเอียดวิชาที่ชนและปุ่ม `ตกลง`

---

## ผลการทดสอบรายกรณี

### 1. `CurriculumPlan.test.tsx` (13 กรณี — ตรงตาม US8-T11 ครบทุกข้อ)

| ลำดับ | อ้างอิง US8-T11 | ชื่อกรณีทดสอบ | ผล | เวลา |
| :---: | :---: | --- | :---: | :---: |
| 1 | **UT-UI-01** | เปิดหน้าต่างจัดตารางตามแผน มีตัวเลือกชั้นปี ภาคเรียน ปุ่มยกเลิก และปุ่ม X | **PASS** | 94 ms |
| 2 | **UT-UI-02** | เลือกชั้นปี/ภาคเรียนแล้วโหลดแผนและ preview อัตโนมัติ แสดง loading และไม่ส่งซ้ำ | **PASS** | 78 ms |
| 3 | **UT-UI-03** | ไม่มีแผนการเรียนที่ตรงกับตัวเลือก แสดงข้อความว่างและไม่เรียก preview | **PASS** | 49 ms |
| 4 | **UT-UI-04** | ชั้นปีที่ 3–4 เลือกแผนการศึกษาและวิชาโทได้ และเปลี่ยนกลับเป็นปี 2 จะซ่อนและล้างตัวเลือก | **PASS** | 98 ms |
| 5 | **UT-UI-05** | แสดง preview ครบทั้งรายการ added, skipped ครบ 4 เหตุผล, ป้ายวิชาโท และยังไม่เปลี่ยนตาราง | **PASS** | 81 ms |
| 6 | **UT-UI-06** | วิชาที่อยู่ในตารางแล้วไม่ถูกเพิ่มซ้ำทั้งใน preview และหลังยืนยัน | **PASS** | 65 ms |
| 7 | **UT-UI-07** | แสดงหน้าต่างเตือนเวลาชนหลังยืนยันและปิดได้ด้วยปุ่มตกลง | **PASS** | 67 ms |
| 8 | **UT-UI-08** | ปิดหน้าต่างได้ทั้งปุ่มยกเลิกและปุ่ม X โดยไม่บันทึก | **PASS** | 98 ms |
| 9 | **UT-UI-09** | แสดงผลเมื่อไม่มีวิชาเพิ่มได้ (added ว่าง) พร้อมเหตุผลที่ข้ามและไม่ขึ้น error | **PASS** | 43 ms |
| 10 | **UT-UI-10** | กดเพิ่มลงตารางเรียน ปิดปุ่มระหว่างรอ กันกดซ้ำ และอัปเดตตารางจาก confirm response | **PASS** | 69 ms |
| 11 | **UT-UI-11** | จัดการ error ขณะโหลดแผนหรือขอ preview และ retry สำเร็จ | **PASS** | 68 ms |
| 12 | **UT-UI-12** | จัดการ error ขณะเพิ่มวิชาลงตาราง คงตารางเดิม และ retry สำเร็จ | **PASS** | 74 ms |
| 13 | **UT-UI-13** | เปลี่ยนภาคเรียนแล้วคง planType และคง/ล้าง minorId ตามวิชาโทของภาคใหม่ | **PASS** | 169 ms |

### 2. `api.test.ts` (3 กรณี)

| ลำดับ | ชื่อกรณีทดสอบ | ผล | เวลา |
| :---: | --- | :---: | :---: |
| 1 | `getPlans` ส่ง `GET /api/study-plans` พร้อม `studyYear`, `semester` และ Bearer token | **PASS** | 5 ms |
| 2 | `applyPlan` ส่ง `POST /api/timetable/apply-plan` พร้อม JSON body และ Bearer token | **PASS** | 1 ms |
| 3 | เก็บ `code` จาก `ProblemDetail` เมื่อ API ตอบ 400 (เช่น `MINOR_PLAN_MISMATCH`) | **PASS** | 1 ms |

---

## เอกสารที่เกี่ยวข้อง

- [US8-T11 Design Unit Test Cases ส่วน UI](../T11/US8-T11-Unit-Test-UI.md)
- [US8-T05 DTO & API Spec](../T05/US8-DTO-API-Spec.md)
- [US8-T06 Sequence Diagrams](../T06/)
