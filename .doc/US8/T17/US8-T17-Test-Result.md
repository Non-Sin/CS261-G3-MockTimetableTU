# US8-T17 ผลการทดสอบ Integration Test ระหว่าง UI กับ API

17 พ.ย. 2569 · WJ (jvongsakorn)

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| API จริง (docker compose, seed จริง) ทุก endpoint และทุกเส้นทางที่ T13 ใช้ | ได้ status และ body ตาม Spec ครบ 40 request · [US8-T17-real-api-log.md](./US8-T17-real-api-log.md) |
| Vitest IT-US8-01–34 (`CurriculumPlanUiApiIntegration.test.tsx`) | รันครบ 34/34 · **Pass 24 · Fail 10** (เทียบผลที่คาดหวังใน T13) |
| Frontend ทั้งหมด | Vitest 237/237 ใน 20 ไฟล์ · `npm run lint` และ `npx tsc --noEmit` 0 error |

**User story:** US8 จัดตารางเรียนจำลองตามแผนในเล่มหลักสูตร · branch `test/US8-T17-run-it-ui-api` · test case ตาม [US8-T13 Integration Test Cases (UI & API)](../T13/US8-T13-Integration-Test-Cases.md)

ฝั่ง API ทำงานตาม Spec ทุกเส้นทาง เคสที่ Fail ทั้ง 10 เคสเป็นเรื่องที่หน้าเว็บแสดงไม่ตรงกับที่ T13 กำหนด (Bug-T17-01, Bug-T17-02)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-11-17 |
| Commit ฐาน | `develop` `aea7b98` + ไฟล์เทสต์ใหม่ |
| Frontend test | Vitest · jsdom · React Testing Library · Node 20 (แบบ CI) |
| Backend ที่บันทึก response | `docker compose` profile `stub-tu` · seed จริง (`V20261114_2100__seed_study_plans.sql`) · บัญชี `6609000004` |

## วิธีทดสอบ

T13 ตรวจ 3 ชั้นต่อเคส คือสิ่งที่ UI ส่ง, สิ่งที่ API ตอบ และสิ่งที่ UI แสดง ทำ 2 ขั้นแบบเดียวกับ US1-T17

1. **API จริง:** ยิงทุกเส้นทางที่ T13 ใช้ไปที่ backend ใน Docker (ดูแผน ทุกชั้นปี, preview, ยืนยัน, วิชาซ้ำ, เวลาชน, หน่วยกิตเกิน, ไม่มี section, ยืนยันซ้ำ, ตารางถูกแก้จากอีกแท็บ, 400 / 401 / 404) บันทึก status และ body ไว้ใน [US8-T17-real-api-log.md](./US8-T17-real-api-log.md) และไฟล์ข้อมูลของเทสต์ `frontend/features/curriculum-plan/testdata/us8-t17-api-responses.json`
   - เคส "greedy พลาด" (IT-13) ไม่มีในแผนจริง ใช้แผนทดสอบ `หลักสูตรทดสอบ T17-GREEDY` = CS111 + CS102 จากรายวิชาจริง (CS111 Sec 030001 กับ CS102 Sec 030001 เวลาเดียวกัน) ใส่เฉพาะใน DB ของ Docker
   - เคสหลายหลักสูตร (IT-34) ใช้ response ที่มีแผนทดสอบ `หลักสูตรทดสอบ ST-` ของ US8-T19 ปนอยู่ ส่วนเคสอื่นตัดแผนทดสอบออกเหลือแต่หลักสูตรจริง
2. **UI ↔ API ([`CurriculumPlanUiApiIntegration.test.tsx`](../../../frontend/features/curriculum-plan/CurriculumPlanUiApiIntegration.test.tsx)):** render หน้า `Timetable` จริง ไม่ mock `api.ts` แต่ดัก `fetch` (`vi.stubGlobal`) แล้วตอบด้วย response จริงจากข้อ 1 จึงทดสอบครบทาง `CurriculumPlanLauncher` → `useCurriculumPlan` → `getPlans` / `applyPlan` → `apiFetch` → HTTP ตรวจ URL, body, header `Authorization` และข้อความบนจอ
   - กรณีที่ T13 ให้ดัก/จำลอง (minors ว่าง, 500, network offline, 404 ของผู้ใช้, preview ตอบช้า) ใช้ response จำลองในรูปแบบเดียวกับ ProblemDetail จริงของ backend (500 = `detail: "Internal server error"` ตาม `GlobalExceptionHandler`)
   - เทสต์ตรวจพฤติกรรมจริงเพื่อให้ CI ผ่าน เคสที่ต่างจาก T13 มีป้าย `[ต่างจาก T13]` ในชื่อเทสต์

```bash
cd frontend
npx vitest run features/curriculum-plan/CurriculumPlanUiApiIntegration.test.tsx
```

## ผลแต่ละเคส

### 3.1 โหลดแผนการเรียน

| ID | สิ่งที่ UI ส่ง / API ตอบ | สิ่งที่ UI แสดง | ผล |
| --- | --- | --- | --- |
| IT-US8-01 | `GET /api/study-plans?studyYear=2&semester=1` + `Bearer` · 200 แผนเดียว `planType: null`, `minors: []` | หัวรายการ "วิชาแนะนำสำหรับ: ชั้นปีที่ 2 ภาคเรียนที่ 1" ไม่มีปุ่มแผนและวิชาโท preview อัตโนมัติ 1 ครั้ง (ข้อความหัวต่างจาก "แผนการเรียนชั้นปีที่ 2" ใน T13 แต่เนื้อหาตรง) | Pass |
| IT-US8-02 | 200 `SPECIAL_PROJECT` ก่อน `CO_OP` วิชาโทครบ 4 แขนง | แผนยังไม่เลือก + "กรุณาเลือกแผนการศึกษา…" · วิชาโทเริ่มที่ "ไม่เรียนวิชาโท" · เลือกแผนแล้ว preview `planId: 6` อัตโนมัติ | Pass |
| IT-US8-03 | ปี 4 ภาค 2 → 200 `plans: []` | "ยังไม่มีแผนการเรียนสำหรับชั้นปีนี้" ไม่มีปุ่มเพิ่ม ไม่มี error ไม่เรียก preview | Pass |
| IT-US8-04 | (จำลอง) ปี 3 ภาค 1 `minors: []` | ซ่อนกลุ่ม "เลือกวิชาโท" เลือกแผนและดูสรุปได้ | Pass |
| IT-US8-05 | GET ใหม่ทุกครั้งที่เปลี่ยนภาค/ชั้นปี | เปลี่ยนเป็นภาค 2 (ไม่มีวิชาโทเดิม) แผนสหกิจยังเลือกอยู่ วิชาโทกลับเป็น "ไม่เรียนวิชาโท" · เปลี่ยนเป็นปี 2 ล้างแผนและวิชาโท | Pass |
| IT-US8-34 | 200 แผนจาก 3 หลักสูตร | แสดงตัวเลือก "หลักสูตร" เลือกหลักสูตรจริงแล้ว preview ด้วย `planId: 3` | Pass |

### 3.2 ดูสรุป (`dryRun: true`)

| ID | สิ่งที่ UI ส่ง / API ตอบ | สิ่งที่ UI แสดง | ผล |
| --- | --- | --- | --- |
| IT-US8-06 | body `{ planId: 3, academicYear: 2568, dryRun: true }` + `Bearer` · added 6 วิชา `skipped: []` `timetable: null` | "วิชาที่จะเพิ่มลงตาราง (6 วิชา)" ครบพร้อม Sec และ 3.0 หน่วยกิต ไม่มีรายการข้าม ปุ่มกดได้ ตารางยัง 0 / 22 | Pass |
| IT-US8-07 | `minorId: 1` · CS345, CS346 `source: MINOR` | หัวรายการ "(แผนทำหัวข้อพิเศษ · วิชาโทวิทยาการข้อมูล)" ป้าย "วิชาโท" ที่ CS345, CS346 | Pass |
| IT-US8-08 | ตารางมี TU100 820001 · TU100 `COURSE_ALREADY_IN_TIMETABLE` | "TU100 อยู่ในตารางแล้ว (Sec 820001)" อยู่ในรายการข้ามเท่านั้น | Pass |
| IT-US8-09 | ปี 3 ภาค 2 หัวข้อพิเศษ + วิทยาการข้อมูล · CS246 `TIME_CONFLICT` `MINOR` `conflictWith: ["CS332", "CS314"]` | "CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314" CS314 ยังอยู่ในรายการที่จะเพิ่ม (T13 เขียนว่าชนแค่ CS314 แต่ข้อมูลจริง CS246 ชนกับ CS332 ด้วย หน้าเว็บแสดงตาม API) | Pass |
| IT-US8-10 | ตารางมี CS301, CS180 · EL295 `CREDIT_LIMIT_EXCEEDED` | ข้อความตาม `message` ของ API | Pass |
| IT-US8-11 | CS287 `NO_SECTION_AVAILABLE` | "CS287 ไม่เปิดสอนในภาคเรียนนี้" CS384 ยังจะเพิ่ม | Pass |
| IT-US8-12 | ทุกวิชาอยู่ในตารางแล้ว `added: []` | "(0 วิชา)" + "ไม่มีวิชาที่เพิ่มลงตารางได้ในแผนนี้" รายการข้าม 6 วิชา ปุ่มยังกดได้ | Pass |
| IT-US8-13 | แผน CS111 + CS102 · added CS111 **030002**, CS102 030001 `skipped: []` | แสดง Sec ที่ API เลือก ไม่มีเวลาชน | Pass |
| IT-US8-14 | ไม่เรียนวิชาโท: body ไม่มี `minorId` (T13 ยอมรับ null/ไม่ส่ง) · เดฟออปส์: `minorId: 4` | รายการเปลี่ยนตาม response ล่าสุด (CS224 ขึ้นหลังเลือกเดฟออปส์) | Pass |
| IT-US8-15 | (จำลองตอบช้า) 1 request ต่อ 1 selection | "กำลังคำนวณรายวิชาและกลุ่มเรียน…" · response เก่าที่ตอบทีหลังไม่ทับผลล่าสุด | Pass |

### 3.3 ยืนยันจัดตาราง (`dryRun: false`)

| ID | สิ่งที่ UI ส่ง / API ตอบ | สิ่งที่ UI แสดง | ผล |
| --- | --- | --- | --- |
| IT-US8-16 | body `dryRun: false` · 200 `timetable` 6 วิชา | ปิด modal วาดตารางจาก response ไม่ `GET /api/timetable` ซ้ำ หน่วยกิต 18 / 22 | Pass |
| IT-US8-17 | CS246 `TIME_CONFLICT` | ตารางมีวิชาที่เพิ่มได้ dialog "ตรวจพบเวลาเรียนซ้อนทับกัน" แสดง "CS246 ทุกกลุ่มเรียนเวลาชนกับ CS332, CS314" CS246 ไม่อยู่ในตาราง (หมายเหตุ: เป็นแผนภาค 2 จึงเจอ Bug-01 ของ US8-T19 ร่วมด้วย) | Pass |
| IT-US8-18 | skipped 3 เหตุผล (CS301 อยู่แล้ว, TU108 ชน, CS287 ไม่มี section) | ตารางบันทึกเฉพาะ added · หน้าสรุปก่อนยืนยันแสดงครบ แต่**หลังยืนยันแจ้งเฉพาะ TU108 (เวลาชน)** ไม่แสดง CS301 และ CS287 | **Fail** (Bug-T17-02) |
| IT-US8-19 | `added: []` · API คืน `updatedAt` เดิม (22:35:43 ทั้งก่อนและหลัง) | ไม่มี error ตารางเท่าเดิม 18 / 22 | Pass |
| IT-US8-20 | ยังไม่มีตาราง (`updatedAt: null`) · API คืน `timetable` ใหม่ | แสดงตารางใหม่ 18 / 22 | Pass |
| IT-US8-21 | ยืนยันรอบสอง ทุกวิชา `COURSE_ALREADY_IN_TIMETABLE` | ข้อความ "… อยู่ในตารางแล้ว (Sec …)" ครบ ตารางไม่ซ้ำ | Pass |
| IT-US8-22 | preview มี CS221 ใน added · ยืนยันหลังเพิ่ม CS221 จากอีกแท็บ ได้ CS221 ใน skipped | แสดงตาม response ของการยืนยัน ตารางมี CS221 ครั้งเดียว | Pass |

### 3.4 API ตอบ error

| ID | สิ่งที่ API ตอบ (จริง) | สิ่งที่ UI แสดงจริง | ที่ T13 คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| IT-US8-23 | 400 `MINOR_NOT_ALLOWED` `detail: "ชั้นปีที่ 2 เลือกวิชาโทไม่ได้"` | "ชั้นปีที่ 2 เลือกวิชาโทไม่ได้" | "แผนการเรียนชั้นปีที่ 1–2 ไม่สามารถเลือกวิชาโทได้" | **Fail** |
| IT-US8-24 | 400 `MINOR_PLAN_MISMATCH` | "วิชาโทเดฟออปส์ ไม่ได้อยู่ในหลักสูตรเดียวกับแผนการเรียนที่เลือก" (เลือกวิชาโทใหม่ได้) | "วิชาโทที่เลือกไม่ตรงกับหลักสูตรของแผนการเรียน" | **Fail** |
| IT-US8-25 | 400 `detail: "Validation failed"` + `errors` | **"Validation failed"** (อังกฤษ) | "ข้อมูลที่ส่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" | **Fail** |
| IT-US8-26 | 404 `"Study plan not found with id: 99999"` / `"Study minor not found with id: 99999"` | **"Study plan not found with id: 99999"** (อังกฤษ) | "ไม่พบแผนการเรียนหรือวิชาโทที่เลือก กรุณาเลือกใหม่อีกครั้ง" | **Fail** |
| IT-US8-27 | (จำลอง) 404 `"User not found with id: …"` | **"User not found with id: …"** ไม่ค้างที่ Loading | "ไม่สามารถโหลดแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง" | **Fail** |
| IT-US8-28 | 400 ทุกค่าที่ผิด (ไม่ใช่ 500) `"Validation failure"` | **"Validation failure"** (อังกฤษ) | "ข้อมูลที่ส่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" | **Fail** (ฝั่ง API ผ่าน) |
| IT-US8-29 | 401 | ลบ token และตั้ง flag session หมดอายุ (กลับหน้า Login ตาม US4) | ตาม US4 | Pass |
| IT-US8-30 | 401 ทั้ง preview และยืนยัน | session หมดอายุ ตารางไม่ถูกแก้ | ตาม US4 | Pass |
| IT-US8-31 | (จำลอง) 500 แล้ว 200 | **"Internal server error"** มีปุ่ม "ลองใหม่" กดแล้วโหลดแผนได้ | "ไม่สามารถโหลดแผนการเรียนได้ กรุณาลองใหม่อีกครั้ง" | **Fail** |
| IT-US8-32 | (จำลอง) preview 500 | **"Internal server error"** ไม่แสดงรายการค้าง ไม่ค้างที่ Loading ปุ่มเพิ่มกดไม่ได้ | "ไม่สามารถจัดตารางเรียนได้ กรุณาลองใหม่อีกครั้ง" | **Fail** |
| IT-US8-33 | (จำลอง) ยืนยันได้ 500 / network error แล้วสำเร็จ | 500: **"Internal server error"** · offline: "เพิ่มวิชาตามแผนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" · อยู่ที่ modal ตารางไม่เปลี่ยน ลองใหม่บันทึกครั้งเดียว | "ไม่สามารถจัดตารางเรียนได้ กรุณาลองใหม่อีกครั้ง" | **Fail** |

## Bug ที่พบ

### Bug-T17-01 ข้อความ error ใน modal จัดตามแผนไม่ตรงกับที่ทีมตกลงใน US8-T13 และบางกรณีเป็นภาษาอังกฤษ

| รายการ | รายละเอียด |
| --- | --- |
| Test case | IT-US8-23 ถึง 28, 31 ถึง 33 |
| สาเหตุ | `toUserErrorMessage` ใน `frontend/features/curriculum-plan/hooks/useCurriculumPlan.ts` แสดง `detail` ของ backend ตรง ๆ ถ้ามี ซึ่ง 400 validation, 404 และ 500 เป็นภาษาอังกฤษ ("Validation failed", "Study plan not found with id: …", "Internal server error") และข้อความสำรอง 3 ข้อความ ("โหลดแผนการเรียนไม่สำเร็จ…", "ไม่สามารถคำนวณวิชาแนะนำได้…", "เพิ่มวิชาตามแผนไม่สำเร็จ…") ไม่ตรงกับข้อความใน T13 หัวข้อ 5 ข้อ 1 |
| ผลที่คาดหวัง | แปลง error ตาม status / `code` เป็นข้อความไทยตาม T13 (แบบเดียวกับ US1 ที่ไม่แสดง detail ภาษาอังกฤษจาก backend) |
| ความรุนแรง | ปานกลาง ระบบไม่พัง ผู้ใช้ยังลองใหม่ได้ แต่เห็นข้อความภาษาอังกฤษที่ไม่เป็นมิตร |

### Bug-T17-02 หลังยืนยันแจ้งเฉพาะวิชาที่เวลาชน

| รายการ | รายละเอียด |
| --- | --- |
| Test case | IT-US8-18 |
| สาเหตุ | `useCurriculumPlan` กรอง `response.skipped` เหลือเฉพาะ `TIME_CONFLICT` ก่อนเปิด `PlanConflictDialog` วิชาที่ข้ามเพราะอยู่ในตารางแล้ว / ไม่มี section / หน่วยกิตเกิน ไม่ถูกแจ้งหลังยืนยัน (ยังเห็นได้ในหน้าสรุปก่อนกด) |
| ผลที่คาดหวัง | หลังยืนยันแสดงรายการข้ามครบทุกวิชาพร้อม `message` ตาม T13 IT-18 |
| ความรุนแรง | ต่ำ |

ต้องสร้างการ์ด fix (label Maintenance) ของทั้งสอง bug และแจ้งเจ้าของงาน US8-T07 / US8-T10

## ข้อสังเกต

- `department` ที่ API ส่งจริงคือ `ภาควิชาวิทยาการคอมพิวเตอร์` (T13 หัวข้อ 2 และ IT-01 เขียน `วิทยาการคอมพิวเตอร์`)
- ชุดข้อมูลเวลาชนใน T13 ระบุว่า CS246 ชนกับ CS314 อย่างเดียว ข้อมูลจริงชนกับ CS332 ด้วย ควรอัปเดต T13 ถ้าจะรันซ้ำ
- ไม่มีเทอมของชั้นปี 3–4 ในข้อมูลจริงที่ `minors` ว่าง IT-04 จึงใช้ response จำลองตามที่ T13 อนุญาต
