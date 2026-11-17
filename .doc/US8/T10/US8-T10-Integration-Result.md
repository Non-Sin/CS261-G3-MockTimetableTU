# US8-T10: ผลการเชื่อมต่อและทดสอบ UI ↔ API ↔ DAO (Integration Verification)

## ภาพรวมการเชื่อมต่อ

ตรวจสอบการเชื่อมต่อครบทั้ง 3 ชั้น (**UI ↔ API ↔ DAO/DB**) ตาม Sequence Diagram ของ **US8-T06** (`StudyPlans`, `Preview`, `Confirm`) หลังจากรวมโค้ดของ **US8-T07** (UI), **US8-T08** (API/Service/DTO) และ **US8-T09** (DAO/Entity/Flyway Migration & Seed) เข้า `develop` แล้ว

- **Branch:** `feature/US8-T10-integrate-ui-api-dao`
- **จุดเชื่อมต่อหลัก:**
  - Frontend (`frontend/features/curriculum-plan/api.ts`) เรียก `GET /api/study-plans` และ `POST /api/timetable/apply-plan` ผ่าน Next.js rewrite ไปยัง Backend จริง (ไม่มี mock data)
  - Backend (`StudyPlanController`, `ApplyPlanController`, `StudyPlanService`, `ApplyPlanService`) ทำงานร่วมกับ `StudyPlanRepository`, `StudyMinorRepository`, `SectionRepository`, `TimetableRepository`, `TimetableEntryRepository` และ SQL Server จริง

---

## ผลการทดสอบอัตโนมัติ

| ส่วน | คำสั่ง | ผลลัพธ์ |
| --- | --- | --- |
| Frontend Unit & Integration Tests | `cd frontend && npm test` | **PASS** — 19 test files / 203 tests (รวม `features/curriculum-plan/` 17 tests) |
| Frontend Lint & Type Check | `cd frontend && npm run lint && npx tsc --noEmit` | **PASS** — 0 errors |
| Backend Tests (Unit, DAO, Service, Controller) | `cd backend && sh ./mvnw test -Dtest='!BackendApplicationTests'` | **PASS** — 299 tests (0 failures, 0 errors, 0 skipped) |

---

## ผลการทดสอบทั้งชุดผ่าน `docker compose up -d --build`

รันระบบครบทั้งชุด (`sqlserver`, `db-init`, `backend` profile `stub-tu`, `frontend` บน `http://localhost:3000`) และทดสอบผ่านเบราว์เซอร์จริงกับฐานข้อมูล SQL Server:

| กรณีทดสอบ | บัญชีนักศึกษา | ขั้นตอนที่ทดสอบ | ผลที่สังเกตได้ | สถานะ |
| --- | --- | --- | --- | --- |
| 1. Preview แผนชั้นปีที่ 1/1 (มีวิชาเดิมในตาราง) | `6609000001` (มีวิชาเดิม 6 วิชา · 18.0/22 หน่วยกิต) | เปิด `จัดตามแผนหลักสูตร` → เลือกชั้นปีที่ 1 ภาคเรียนที่ 1 (`dryRun: true`) | โหลดแผนจาก API จริง: แสดง `CS100` ในรายการที่จะเพิ่ม และแสดงเหตุผลของ 6 วิชาที่ข้าม (เวลาชน / หน่วยกิตเกิน 22) | PASS |
| 2. เลือกแผนและ Confirm ชั้นปีที่ 3/1 + ตรวจวิชาเดิม | `6609000001` (วิชาเดิม `CS111`, `CS180`, `LAS101`, `MA211`, `TU101`, `TU106`) | เลือกชั้นปีที่ 3 ภาคเรียนที่ 1 → โหลดแผน (`ทำหัวข้อพิเศษ`, `สหกิจศึกษา`) และวิชาโทจาก API จริง → เลือก `ทำหัวข้อพิเศษ` → กด `เพิ่มลงตารางเรียน` (`dryRun: false`) | เพิ่ม `CS301` สำเร็จ (รวมเป็น 7 วิชา · 21.0/22 หน่วยกิต), **วิชาเดิมทั้ง 6 วิชาอยู่ครบทั้งหมด**, และแสดง dialog แจ้งเตือนเวลาชน (`CS223`, `CS241`, `CS331`) | PASS |
| 3. จัดตารางด้วยบัญชีนักศึกษาอีกคน (ตารางว่าง) | `6609000004` (ตารางเริ่มต้น 0 วิชา) | ออกจากระบบ → ล็อกอิน `6609000004` → เลือกชั้นปีที่ 2 ภาคเรียนที่ 1 → กด `เพิ่มลงตารางเรียน` | ตารางอัปเดตทันทีครบทั้ง 6 วิชา (`CS221`, `CS213`, `ST329`, `CS261`, `CS240`, `EL295` · 18.0/22 หน่วยกิต) ไม่มี error | PASS |
