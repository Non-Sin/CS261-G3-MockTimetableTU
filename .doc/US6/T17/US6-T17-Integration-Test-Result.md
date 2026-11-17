# US6-T17 — ผล Integration Test ระหว่าง UI กับ API

ทดสอบวันที่ 17 พฤศจิกายน 2026 (Asia/Bangkok) บน branch `test/US6-T17-run-it-ui-api` โดยใช้ source commit **79df2b8ed551d6241d3da7572d2138eb79b48a91** จาก develop

## ผลรวม

- รันครบ **37 เคสหลัก: PASS 33 / FAIL 4 / BLOCKED 0** (เคส 04, 09, 10, 32, 34, 35 รวมทุก subcase)
- FAIL: **22, 26, 33, 36** จัดกลุ่มเป็นร่างการ์ด Maintenance 3 เรื่องใน [Fix Cards](./US6-T17-Fix-Cards.md)
- Backend regression ตาม CI: **535 tests ผ่าน**, 0 failures/errors/skipped; Frontend unit: **203 tests / 19 files ผ่าน**; lint และ Next typegen + TypeScript ผ่าน ดู [log](./evidence/baseline-checks.log)
- **ไม่มีการแก้ source code, automated test source, application config หรือ migration ของแอป** สิ่งส่งมอบมีเฉพาะเอกสาร/ข้อมูลผลทดสอบ/ภาพและ log ใน T17
- ผู้ใช้เลือกให้เก็บร่างการ์ด fix ไว้ในรายงานก่อน จึงไม่มีการสร้างการ์ดหรือแจ้งผ่านบริการภายนอก รอบนี้ยังต้องผ่าน PR review

## ขอบเขตและหลักฐาน

ยึด [T13 เดิม 37 เคส](../T13/US6-T13-integration-test-cases-ui-api.md), [T05](../T05/US6-DTO%20%26%20API%20Spec.md), T06 และ [รายงาน T10 PR #118](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/pull/118) (commit `5ac6bf3`) โดยรันผลใหม่ทั้งหมด ไม่คัดลอกสถานะ PASS จาก T10

T13 ใช้ตัวอย่าง 3 วิชาในหลายแถว แต่ T05/seed จริงมี 18 วิชา จึงคำนวณ expected จาก seed และกติกา T05 ก่อนเปรียบเทียบ แสดงค่าที่ปรับและเหตุผลใน [Expected Data](./US6-T17-Expected-Data.md) ไม่แก้ไฟล์ T13 เดิม ไม่ลดเงื่อนไขเรื่อง Sec/เวลาชน/HTTP error เพื่อให้ tests ผ่าน

สิ่งที่เชื่อมจริง: Chromium ใน in-app browser → transparent HTTP recorder → Next.js production build/rewrite → Spring Boot profile `stub-tu` → SQL Server + Flyway schema/seed จริง ไม่ mock ฟังก์ชัน frontend หรือ DTO สำหรับ happy path

- ทดสอบด้วยบัญชี stub `6609000001` ใน Docker project **us6t17** และ named volume **us6t17_test-data** ที่สร้างใหม่ ไม่ใช้ฐานข้อมูลเดิมของผู้พัฒนา
- URL browser `http://127.0.0.1:13006`; Next container port 13007; backend 18086; SQL Server 14337 (bind เฉพาะ loopback)
- Runtime ใช้ Dockerfiles เดิม (Java 21 / Node 20) และ source hash ข้างต้น; ตั้ง CORS ผ่าน environment เฉพาะพอร์ตทดสอบ ไม่แก้ application.yaml หรือ compose.yaml ของโปรเจกต์
- ล้าง/จัด timetable เฉพาะบัญชี stub ในฐานทดสอบระหว่างเคส ผ่าน API จริง; ค้น sectionId จาก course/term/sectionNo ไม่ hard-code ID
- ภาคปัจจุบัน 2568/1 ยกเว้น IT-20 ใช้ 2568/2; T-FULL คือ 7 วิชา 21 หน่วยกิตจาก T13

หลักฐาน 3 ชั้น:

1. [network.jsonl](./evidence/network.jsonl): method/path/query/body ที่ปิดบังข้อมูลลับ, Authorization มีหรือไม่, HTTP status, injection ที่ใช้ และ caseId
2. `*.ax.txt`: snapshot จาก DOM ของหน้าเว็บจริงหลังการทำงาน (ไม่ใช่ HTML ที่สร้างจำลอง); ภาพ JPEG เก็บใน evidence
3. [filter-oracle-checks.json](./evidence/filter-oracle-checks.json): เทียบชุดวิชาบน UI กับ oracle ที่อ่าน course/section/slot จาก DB แล้วใช้กติกา T05 แยกจาก service ผลตรง **20/20 ชุด**

HTTP recorder ไม่ได้ decode compressed transfer body ของ browser responses บางรายการ จึงไม่ส่งต่อข้อความ binary เหล่านั้นลงรายงาน และระบุข้อจำกัดในแต่ละ record เก็บ JSON จาก [API readback แยก](./evidence/api-readback.json) ซึ่งใช้ fixture เดียวกันและ API จริง ตรวจผลค้นหา **20/20 ชุด** พร้อมรายละเอียด FR205/PY250/TH291 ส่วน request/status จาก browser run และ DOM เป็นหลักฐานรอบ UI เดิม ไม่อ้างว่า readback เป็นการคลิก UI รอบเดิม

## วิธีสร้างสถานการณ์พิเศษ

| เคส | วิธี | สิ่งที่เป็นของจริง / จำลอง |
|---|---|---|
| 14 | หน่วงคำขอ FR205 ให้ตอบช้ากว่า PY250 | response ทั้งสองมาจาก backend จริง เปลี่ยนเฉพาะ timing |
| 27 | เปิด browser 2 tabs บัญชีเดียวกัน เพิ่ม Sec 260002 ในอีกแท็บก่อน | 201 และ 409 จาก backend/DB จริง |
| 28 | หน่วง POST 1.5 วินาที แล้ว double-click ปุ่มเพิ่ม | POST จริงเพียง 1 ครั้ง และ backend ตอบ 201 จริง |
| 30–31 | ถอด Authorization ที่ recorder เฉพาะ GET/POST ที่กำหนด | backend ตอบ 401 จริง ไม่ปลอม response; เทียบ flow ขาด token โดยไม่แก้ session ผ่าน JavaScript ใน browser |
| 33 | สำรอง info/tags/reviews ของ PY250 แล้วลบ info เฉพาะ DB ทดสอบ | 404 จริง จากนั้นคืนข้อมูลครบ 18 วิชาและลบตาราง backup ชั่วคราว |
| 36 | ตัด socket เฉพาะ GET /api/electives แล้วคืนการเชื่อมต่อ | จำลอง network failure; retry กลับไปใช้ backend จริง |
| 37 | ดัก POST ให้ตอบ 500 ProblemDetail | **injected response** ไม่ใช่ backend เกิด 500 เอง; ตรวจ modal/ปุ่มและยืนยันตารางไม่เปลี่ยน |

## ผลรายเคส

| เคส | เรื่อง | ผล | ผลที่ตรวจพบ | หลักฐาน |
|---|---|---|---|---|
| IT-UI-API-US6-01 | เปิดเมนูและรายการทั้งหมด | **PASS** | 18 วิชา แบ่ง 5 หมวด 3/4/5/4/2 ไม่มี EL105/CS100 | [หลักฐาน](./evidence/01-02-list.ax.txt) |
| IT-UI-API-US6-02 | ข้อมูลการ์ดและป้าย | **PASS** | FR205 ชื่อสองภาษา/3 หน่วยกิต/โควตา/tags; TH291 เปิดสองภาค; PY250 ไม่มีป้ายโควตา | [หลักฐาน](./evidence/01-02-list.ax.txt) |
| IT-UI-API-US6-03 | ค้นรหัสไม่สนตัวพิมพ์ | **PASS** | py2 ได้ PY200, PY250, PY252 | [หลักฐาน](./evidence/03-code-prefix.ax.txt) |
| IT-UI-API-US6-04 | ค้นไทย/English word prefix | **PASS** | ฝรั่งเศส → FR205; everyday → FR205, FD216; DAY → ว่าง | [หลักฐาน](./evidence/04b-english.ax.txt) |
| IT-UI-API-US6-05 | ค้นหาไม่พบ | **PASS** | SA240 ได้ 200 [] และ Empty State พร้อมปุ่มดูทั้งหมด | [หลักฐาน](./evidence/05-empty.ax.txt) |
| IT-UI-API-US6-06 | ล้างคำค้นและตัวกรองทั้งหมด | **PASS** | กลับค่าตั้งต้นครบ คำขอไม่มีตัวกรอง และแสดง 18 วิชา | [หลักฐาน](./evidence/06-reset-all.ax.txt) |
| IT-UI-API-US6-07 | หมวดจิตวิทยา | **PASS** | 4 วิชา PY200/PY250/PY252/PY320 | [หลักฐาน](./evidence/07-group.ax.txt) |
| IT-UI-API-US6-08 | กรองภาคเรียน | **PASS** | semester=2 แต่ currentSemester=1; 13 วิชา ไม่มี FR205 | [หลักฐาน](./evidence/08-semester.ax.txt) |
| IT-UI-API-US6-09 | วันและช่วงเวลา | **PASS** | อังคารเย็น FR205; พฤหัสบดีบ่าย EG214/TH291/PB317 | [หลักฐาน](./evidence/09b-afternoon.ax.txt) |
| IT-UI-API-US6-10 | หลายเงื่อนไขใน Sec เดียว | **PASS** | อังคารเช้า 4 วิชา; เพิ่ม semester=1 เหลือ EG214/AT326/IS313 ไม่รวม PY250 | [หลักฐาน](./evidence/10b-combined.ax.txt) |
| IT-UI-API-US6-11 | วันและเวลาในคาบเดียว | **PASS** | จันทร์เช้า PY200/FD216/RE468 ไม่รวม PY250 | [หลักฐาน](./evidence/11-same-slot.ax.txt) |
| IT-UI-API-US6-12 | ไม่ชนเมื่อตารางว่าง | **PASS** | 15 วิชา เฉพาะที่เปิดภาคปัจจุบัน ตัด 3 วิชาที่มีแต่ภาค 2 | [หลักฐาน](./evidence/12-empty-timetable-filter.ax.txt) |
| IT-UI-API-US6-13 | ไม่ชนร่วมกับอีกภาค | **PASS** | excludeConflicts=true และ semester=2 ขณะ currentSemester=1 ได้ [] | [หลักฐาน](./evidence/13-other-term.ax.txt) |
| IT-UI-API-US6-14 | คำขอตอบกลับสลับลำดับ | **PASS** | หน่วง FR205 ให้ตอบหลัง PY250; หน้าคงผล PY250 ไม่ย้อนกลับ | [หลักฐาน](./evidence/14-after-delayed-response.ax.txt) |
| IT-UI-API-US6-15 | กรองวิชาชน TU100 | **PASS** | 14 วิชา ตัด PY250 แต่คง FR205/TH291 | [หลักฐาน](./evidence/15-tu100-conflict-filter.ax.txt) |
| IT-UI-API-US6-16 | คาบต่อกันพอดีไม่ชน | **PASS** | 11 วิชา คง FR205 เพราะเริ่ม 16:30 เท่ากับ CS213 เลิก และตัด TH291 | [หลักฐาน](./evidence/16-adjacent-slot-not-conflict.ax.txt) |
| IT-UI-API-US6-17 | ตัดวิชาที่อยู่ในตาราง | **PASS** | 14 วิชา ไม่มี FR205 ที่เพิ่มแล้ว | [หลักฐาน](./evidence/17-existing-course-filter.ax.txt) |
| IT-UI-API-US6-18 | รายละเอียด PY250 | **PASS** | รีวิว 4 ข้อ Sec 820001 ถูกเลือก; 230001 disabled และห้องไม่ระบุ | [หลักฐาน](./evidence/18-py250-detail.ax.txt) |
| IT-UI-API-US6-19 | รายละเอียด FR205 | **PASS** | 2 Sec ภาค 1; เลือก 260001 อัตโนมัติ ปุ่มเพิ่มใช้ได้ และมีปุ่มโควตา | [หลักฐาน](./evidence/19-fr205-detail.ax.txt) |
| IT-UI-API-US6-20 | บริบทตารางภาค 2 | **PASS** | 230001 ถูกเลือกและใช้ได้; 820001 disabled; ส่ง currentSemester=2 | [หลักฐาน](./evidence/20-current-semester-two.ax.txt) |
| IT-UI-API-US6-21 | เตือนเวลาชนใน modal | **PASS** | PY250 Sec 820001 เตือนชน TU100 แต่ปุ่มเพิ่มยังใช้ได้ อีกภาคไม่มี conflict | [หลักฐาน](./evidence/21-tu100-modal.ax.txt) |
| IT-UI-API-US6-22 | วิชาที่เพิ่มแล้ว | **FAIL** | ป้องกัน POST ซ้ำและแสดงเพิ่มแล้วถูกต้อง แต่ปิด radio 260002 ด้วย ทั้งที่ T13 ระบุว่ายังเลือกได้ | [หลักฐาน](./evidence/22-disabled-alternative.ax.txt) |
| IT-UI-API-US6-23 | เพิ่ม FR205 สำเร็จ | **PASS** | POST 1 ครั้ง 201; modal ปิด; ข้อความสำเร็จ; เปิดซ้ำ inTimetable=true และตารางมีสองคาบ | [หลักฐาน](./evidence/23-timetable.ax.txt) |
| IT-UI-API-US6-24 | เพิ่มวิชาที่ชนได้ | **PASS** | 201 พร้อม TU100/PY250 conflict จันทร์ 13:30–16:30 และ UI ตารางแสดงคำเตือน | [หลักฐาน](./evidence/24-timetable.ax.txt) |
| IT-UI-API-US6-25 | โหลดรายการใหม่หลังเพิ่ม | **PASS** | 15 → 14 วิชา มี GET excludeConflicts=true ใหม่ และ FR205 หายจากรายการ | [หลักฐาน](./evidence/25-auto-refresh.ax.txt) |
| IT-UI-API-US6-26 | หน่วยกิตเกิน | **FAIL** | UI ปิดปุ่มทันทีที่ 21+3>22 ไม่มี POST/ข้อความ 409 ตาม T13; ยิง API เสริมได้ 409 ถูกต้อง | [หลักฐาน](./evidence/26-credit-limit-blocked.ax.txt) |
| IT-UI-API-US6-27 | ข้อมูลเก่าจากสองแท็บ | **PASS** | แท็บ 2 เพิ่ม Sec 260002 ได้ 201; แท็บ 1 เพิ่ม Sec 260001 ได้ 409 พร้อม detail ถูกต้อง | [หลักฐาน](./evidence/27-duplicate-conflict.ax.txt) |
| IT-UI-API-US6-28 | กันกดเพิ่มซ้ำ | **PASS** | หน่วง POST แล้ว double-click มี POST เพียง 1 ครั้ง 201 ระหว่างรอปุ่ม disabled | [หลักฐาน](./evidence/28-pending.ax.txt) |
| IT-UI-API-US6-29 | ห้ามเพิ่ม Sec อีกภาค | **PASS** | Sec 230001 disabled/ไม่ถูกเลือก ไม่มี POST และ GET ตารางภาค 2 ยังว่าง | [หลักฐาน](./evidence/29-other-term-disabled.ax.txt) |
| IT-UI-API-US6-30 | GET ไม่มีสิทธิ์ | **PASS** | ถอน Authorization ที่ proxy; backend ตอบ 401 จริง UI กลับ Login และไม่คงการ์ดเดิม | [หลักฐาน](./evidence/30-get-401-login.ax.txt) |
| IT-UI-API-US6-31 | POST ไม่มีสิทธิ์ | **PASS** | ถอน Authorization ที่ proxy; backend ตอบ 401 จริง modal หาย กลับ Login และตารางยังว่าง | [หลักฐาน](./evidence/31-post-401-login.ax.txt) |
| IT-UI-API-US6-32 | รายละเอียดไม่ใช่วิชาแนะนำ | **PASS** | EL105, CS100, SA240 ได้ 404 ProblemDetail ครบ 3 ค่า | [หลักฐาน](./evidence/api-contract-results.json) |
| IT-UI-API-US6-33 | รายละเอียดถูกลบหลังโหลดรายการ | **FAIL** | ลบข้อมูล PY250 จริงใน DB ทดสอบ ได้ 404; UI แสดง ไม่พบรายละเอียดวิชาเสรีนี้ ต่างจากข้อความทีมกำหนด | [หลักฐาน](./evidence/33-detail-404.ax.txt) |
| IT-UI-API-US6-34 | พารามิเตอร์ผิด | **PASS** | ครบ 8 subcases ได้ 400 ProblemDetail | [หลักฐาน](./evidence/api-contract-results.json) |
| IT-UI-API-US6-35 | SUNDAY และ currentSemester ผิด | **PASS** | SUNDAY ได้ 200 []; รายละเอียด currentSemester=3 ได้ 400 | [หลักฐาน](./evidence/api-contract-results.json) |
| IT-UI-API-US6-36 | เครือข่ายล่มและกลับมา | **FAIL** | ไม่มีการ์ดเก่าปน/กู้คืนได้ แต่ข้อความเป็น โหลดวิชาเสรีแนะนำไม่สำเร็จ กรุณาลองใหม่ ต่างจาก T13 | [หลักฐาน](./evidence/36-network-error.ax.txt) |
| IT-UI-API-US6-37 | POST ตอบ 500 | **PASS** | ฉีด 500 ที่ proxy; modal คงอยู่ มีข้อความผิดพลาด ปุ่มใช้ได้อีก และตารางไม่เปลี่ยน | [หลักฐาน](./evidence/37-post-error.ax.txt) |

## ข้อสรุปสำหรับส่งต่อ

1. IT-26 เป็นพฤติกรรม UI ที่ขัดกับ T13: ปิดปุ่มก่อน API และไม่มีข้อความอธิบายกรณีหน่วยกิตเกิน API แยกตอบ 409 ถูกต้อง จึงไม่รวมเป็นบั๊ก backend
2. IT-22 เป็นผลต่างด้านการเลือก Sec: การกันเพิ่มซ้ำทำงาน แต่ T13 ระบุว่ายังเลือกอีก Sec ในภาคเดียวกันได้ ต้องให้เจ้าของ UI/สเปกตัดสินใจแก้ UI หรือยืนยันปรับ expectation
3. IT-33/36 ไม่ตรงข้อความที่ทีมตกลงใน T13 หัวข้อ 6 ข้อ 3 แต่การปิด modal/กลับมาโหลดใหม่ทำงาน ไม่ใช่หน้าเว็บ crash

ไม่มีการแก้บั๊กในงาน T17 นี้ ร่างการ์ดระบุเจ้าของ US6-T07 (`sitch28-nin`, อ้างอิง PR #112) พร้อมขั้นตอนทำซ้ำและหลักฐาน ยังไม่ได้ส่งข้อความหรือสร้างการ์ดบนบริการภายนอก

หลังจบงานคืนข้อมูล PY250 ครบ จัดตารางบัญชีทดสอบกลับเป็นว่าง และปิด/นำออกเฉพาะ containers กับ network ของ Docker project `us6t17` แล้ว เก็บ named volume ของระบบทดสอบไว้ ไม่ใช้ `down -v` และไม่แตะฐานข้อมูลเดิม ตัว HTTP recorder ชั่วคราวถูกปิดแล้ว

## Definition of Done

- [x] รันครบ 37 เคสใน T13 พร้อมทุก subcase
- [x] บันทึกผ่าน/ไม่ผ่านและหลักฐาน screenshot/log
- [x] ส่งมอบร่างการ์ด fix ครบ 3 เรื่องในรายงาน ตามขอบเขตที่ผู้ใช้ยืนยัน (ยังไม่ได้สร้างบนบอร์ดจริงหรือแจ้งภายนอก)
- [x] เก็บรายงานใน .doc/US6/T17
- [ ] ผ่าน PR review
