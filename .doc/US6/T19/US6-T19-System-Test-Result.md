# US6-T19 — ผล System Test ตาม Sequence Diagram

## ผลรวม

ทดสอบวันที่ 17 พฤศจิกายน 2026 (Asia/Bangkok) บน branch `test/US6-T19-run-system-test` จาก develop commit **aea7b980e022e4fee4ffa04daea0499f26ff3821**

| สถานะ | จำนวน | เคส |
|---|---:|---|
| PASS | 12 | 01–09, 11, 12, 14 |
| FAIL | 3 | 10, 13, 16 |
| PARTIAL | 1 | 15: ยังไม่ได้ลบ sessionStorage โดยตรง |

มีผลบันทึกครบ 16 เคส แต่ **ยังไม่ผ่านเกณฑ์ทั้งชุด** ไม่เปลี่ยนผล FAIL หรือ PARTIAL ให้เป็น PASS จากการยิง API เสริม และไม่แก้โค้ดแอปเพื่อให้ผลผ่าน

## เอกสารอ้างอิง

- [US6-T15 System Test](../T15/US6-T15-System-Test.md): เคส ขั้นตอน ข้อมูลตั้งต้น และผลคาดหวังหลัก
- US6-T06: [Search](../T06/US6-T06-Sequence-Diagram-Search.md), [Detail](../T06/US6-T06-Sequence-Diagram-Detail.md), [AddEntry](../T06/US6-T06-Sequence-Diagram-AddEntry.md)
- [US6-T05 DTO & API Spec](../T05/US6-DTO%20%26%20API%20Spec.md) และ [รายงานเชื่อมระบบ US6-T10](../T10/US6-T10-Integration-Result.md)
- [T17 PR #120](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/pull/120): ใช้เชื่อมข้อผิดพลาดเดิมเท่านั้น ผล T19 มาจากการรันใหม่ ไม่คัดลอกสถานะจาก T17

## สภาพแวดล้อมและวิธีทดสอบ

| รายการ | ค่า |
|---|---|
| ระบบจริง | Chromium → HTTP recorder → Next.js production/rewrite → Spring Boot → SQL Server/Flyway |
| Docker project | `us6t19` ใช้ Dockerfiles เดิม และ compose ชั่วคราวใน target ที่ถูก ignore |
| Profile | `stub-tu` ตาม T15; ไม่ใช้ TU API ของมหาวิทยาลัยจริง |
| URL | browser `http://127.0.0.1:13019`, Next `13020`, backend `18089`, SQL Server `14339` ผูกกับ loopback |
| บัญชี | stub `6609000001`; ไม่ส่งรหัสผ่านหรือ token ในหลักฐาน |
| ปี/ภาค | 2568/1 ยกเว้นเคส 07 ใช้ตาราง 2568/2 |
| หน่วยกิตสูงสุด | 22 |
| การเขียนไฟล์ | เฉพาะรายงาน/หลักฐานใน T19 และตัวช่วยทดสอบชั่วคราวใน `backend/target/us6-t19` |

ใช้ UI/API/DAO/DB จริง ไม่ mock ฟังก์ชัน frontend, service, repository หรือผลตอบกลับ HTTP ของเคสปกติ ตัว recorder ส่งต่อ JSON จริงและ decode compressed response ก่อนบันทึก; AX snapshots ตัดเฉพาะช่องว่างท้ายบรรทัดและใช้ LF เพื่อให้ตรงรูปแบบ repository โดยเก็บต้นฉบับไว้ใน target ที่ถูก ignore

ตรวจ seed ก่อนเริ่ม: **18 วิชาเป็น FREE_ELECTIVE ทุกวิชา มีรีวิวและ Sec ในปี 2568** แบ่งหมวด 3/4/5/4/2 ตาม T15 ดู [seed-check](./evidence/seed-check.json) และ [course/section/slot source](./evidence/source-data.json)

เตรียมตารางใหม่ก่อนแต่ละเคส โดยลบเฉพาะ timetable ของบัญชี stub ในฐานทดสอบ แล้วเพิ่มผ่าน POST จริง:

| Fixture | วิชา / Sec | หน่วยกิต |
|---|---|---:|
| T-EMPTY | ไม่มีแถว timetable | 0 |
| T-PY200 | PY200 810001 | 3 |
| T-JC217 | JC217 450001 | 3 |
| T-FR205 | FR205 260001 | 3 |
| T-FULL | PY200 810001, PY250 820001, AT326 230001, JC217 450001, AS201 900001, GE225 320001, PB317 540001 | 21 |

อ่าน sectionId จาก DB ตามรหัส/ปี/ภาค/Sec ไม่ยึดเลข ID จากฐานอื่น เคส 04 แยกเก็บสถานะฐานว่างกับฐานที่มี PY200

## ผลรายเคส

ทุกเคสมี [DB ก่อน–หลัง](./evidence/db-before-after.json) ตาม key หมายเลขเคส; เคส 04 ใช้ `04-empty` และ `04-PY200` ส่วน request/response ใช้ `caseId` ใน [network.jsonl](./evidence/network.jsonl) รวม request สำหรับเตรียม fixture ที่ขึ้นต้น `setup-` แยกจากการกระทำที่ตรวจ

| เคส | ผลคาดหวังตาม T15 / ผลจริง | ผล | หลักฐาน UI หรือ API |
|---|---|---|---|
| 01 | เปิดเมนูได้ 18 วิชา เรียงหมวด/รหัส ป้าย FR205/AN242/TH291 ถูกต้อง และ GET ไม่สร้าง timetable; ผลจริงตรง | PASS | [รายการ](./evidence/01-list.ax.txt) |
| 02 | PY2 → PY200/PY250/PY252, ค้นไทย → FR205, SA240 → 200 []; ปุ่มดูทั้งหมดคืน 18 วิชาและล้างตัวกรอง; ผลจริงตรง | PASS | [PY2](./evidence/02a-PY2.ax.txt), [ไทย](./evidence/02b-thai.ax.txt), [ว่าง](./evidence/02c-empty.ax.txt), [reset](./evidence/02d-reset.ax.txt) |
| 03 | SCIENCE 4, ภาค 2 จำนวน 13; จันทร์เช้า 3 → ภาค 2 เหลือ PY200; ศุกร์เช้า 4 → ภาค 1 เหลือ PY252; อังคารเย็น FR205, พุธเย็นว่าง; ผลจริงตรงทุกขั้น | PASS | [SCIENCE](./evidence/03a-science.ax.txt), [จันทร์ภาค 2](./evidence/03d-mon-morning-term2.ax.txt), [ศุกร์ภาค 1](./evidence/03f-fri-morning-term1.ax.txt), [เย็น](./evidence/03g-tue-evening.ax.txt) |
| 04 | ไม่ชน+ตารางว่างได้ 15; กรองภาคอื่นได้ 200 []; T-PY200 เหลือ 12 ตัด PY200/RE468/FD216 และสามวิชาเฉพาะภาค 2; DB ไม่เปลี่ยน | PASS | [ว่าง](./evidence/04a-empty-no-conflict.ax.txt), [ต่างภาค](./evidence/04b-other-term-empty.ax.txt), [PY200](./evidence/04c-PY200-no-conflict.ax.txt) |
| 05 | T-JC217 ได้ 13; FR205 เริ่ม 16:30 ต่อจาก JC217 พอดี ต้องไม่ชน; ค้น FR205 แล้วยังพบ; ผลจริงตรง | PASS | [13 วิชา](./evidence/05a-adjacent.ax.txt), [FR205](./evidence/05b-FR205-adjacent.ax.txt) |
| 06 | PY250 มีรีวิว 4 ข้อ, Sec 820001 ภาค 1 ถูกเลือก ส่วน 230001 ภาค 2 disabled; ไม่มีปุ่มโควตา; AN242 ไม่มี selection/เพิ่มไม่ได้; DB ยังไม่มี timetable | PASS | [PY250](./evidence/06b-PY250-detail.ax.txt), [AN242](./evidence/06c-AN242-no-selection.ax.txt) |
| 07 | เปลี่ยนตารางปัจจุบันเป็นภาค 2: ไม่เปิด toggle ได้ 18 เปิดแล้วได้ 13; PY250 เลือก 230001 และ disable 820001; ผลจริงตรง | PASS | [18](./evidence/07a-term2-all.ax.txt), [13](./evidence/07b-term2-no-conflict.ax.txt), [detail](./evidence/07c-term2-detail.ax.txt) |
| 08 | FR205 มีป้าย/ปุ่มโควตา เลือก 260001 ให้; POST ครั้งเดียวได้ 201, 1 entry, 3 หน่วยกิต, conflicts ว่าง; modal ปิด มีข้อความสำเร็จ และ DB สร้างตาราง/entry จริง | PASS | [ก่อนเพิ่ม](./evidence/08b-FR205-before-add.ax.txt), [สำเร็จ](./evidence/08c-add-success.ax.txt), [ตาราง](./evidence/08d-timetable.ax.txt), [ภาพ](./evidence/08-timetable.jpg) |
| 09 | T-PY200 เปิด RE468 ได้ conflictWith=[PY200] แต่ยังเพิ่มได้; POST 201, 2 entries, 6 หน่วยกิต, ชนจันทร์ 09:30–12:30; DB ใช้ timetable_id เดิมและ updated_at เพิ่มขึ้น | PASS | [เตือนก่อนเพิ่ม](./evidence/09b-conflict-before-add.ax.txt), [ตารางหลังเพิ่ม](./evidence/09d-conflict-timetable.ax.txt) |
| 10 | T15 ต้องเลือก FR205 260002 ให้อัตโนมัติ โดยปุ่มเพิ่มยัง disabled; จริงไม่มี Sec ถูกเลือกและ radios ถูก disable ทั้งคู่ ส่วน inTimetable/conflictWith ถูกต้อง ไม่มี POST และ DB ไม่เปลี่ยน | FAIL | [detail](./evidence/10b-already-added-detail.ax.txt) |
| 11 | T-PY200 เปิดไม่ชนเห็น 12 เพิ่ม FR205 แล้ว GET ใหม่ด้วยตัวกรองเดิม เหลือ 11 และ DB มี 2 entries; ผลจริงตรง | PASS | [ก่อน](./evidence/11a-before-add.ax.txt), [refresh](./evidence/11c-auto-refresh.ax.txt) |
| 12 | สอง browser tabs บัญชีเดียวกัน: อีกแท็บเพิ่ม FR205 260002 ก่อน แท็บแรกส่ง 260001 ได้ 409 COURSE_ALREADY_IN_TIMETABLE; modal คงอยู่พร้อม detail และ DB มี FR205 เพียงแถวเดียว Sec 260002 | PASS | [แท็บ 2 สำเร็จ](./evidence/12e-tab2-added.ax.txt), [แท็บ 1 ได้ 409](./evidence/12f-tab1-409.ax.txt) |
| 13 | T15 ต้องกดเพิ่ม FR205 จาก 21 หน่วยกิตได้ แล้วรับ 409 พร้อมคำอธิบายใน modal; จริงปุ่ม disabled ไม่มี POST/ข้อความหน่วยกิตเกิน DB ยังมี 7 entries และ updated_at เดิม | FAIL | [ปุ่ม disabled](./evidence/13b-credit-limit-disabled.ax.txt), [ภาพ fixture 21 หน่วยกิต](./evidence/13-fixture-21-credits.jpg) |
| 14 | พารามิเตอร์ผิด/ขาด 400, SUNDAY 200 [], PY250 ภาค 3 ได้ 400, CS111/SA240 ได้ 404, body ว่าง 400 errors.sectionId, ID ไม่มี 404; ผ่าน 14/14 subcases และไม่สร้าง timetable | PASS | [ผล API ทั้งหมด](./evidence/14-api-results.json) |
| 15 | ไม่มี token ทั้ง 3 endpoint ได้ 401; เพิ่มทดสอบ token ลงนามถูกแต่หมดอายุอีก 3 ครั้งได้ 401; UI กลับ Login เมื่อ backend ตอบ 401 สำหรับ GET/POST และไม่มีข้อมูลเพิ่ม แต่ยังไม่ได้ลบ sessionStorage ตามขั้นตอนตรงตัว | PARTIAL | [API 6 กรณี](./evidence/15-api-results.json), [GET→Login](./evidence/15b-get-401-login.ax.txt), [POST→Login](./evidence/15e-post-401-login.ax.txt) |
| 16 | T15 กำหนดข้อความ “ไม่สามารถโหลดข้อมูลวิชาได้ กรุณาลองใหม่อีกครั้ง”; จริงรายการใช้ “โหลดวิชาเสรีแนะนำไม่สำเร็จ กรุณาลองใหม่” และ detail ใช้ “โหลดรายละเอียดวิชาไม่สำเร็จ กรุณาลองใหม่”; กู้คืนได้ 18 วิชา เปิด detail/ปิด modal ได้ DB ไม่เปลี่ยน | FAIL | [รายการล้มเหลว](./evidence/16b-list-network-failure.ax.txt), [detail ล้มเหลว](./evidence/16d-detail-network-failure.ax.txt), [กู้คืน](./evidence/16c-list-recovered.ax.txt), [detail กลับมา](./evidence/16f-detail-recovered.ax.txt) |

## หลักฐานตรวจซ้ำ

- [Independent filter oracle](./evidence/filter-oracle-results.json): ชุดวิชาบน UI ตรงกับการคำนวณจาก course/section/slot ของ seed ตามกติกา T05/T06 **23/23 ชุด** ไม่ใช้ service response เป็น expected
- [DB assertions](./evidence/db-assertions.json): **17/17 จุดตรวจ** รวม updated_at เดิมเมื่อไม่เขียนข้อมูล, entry หลังเพิ่ม และการใช้ timetable_id เดิม
- [Add contracts](./evidence/add-contract-assertions.json): เคส 08 มี POST เดียว, เคส 09 ตอบ 201 แม้เวลาชน, เคส 12 กันวิชาซ้ำจริง
- [API เสริมเคส 13](./evidence/13-api-supplement.json): ยิง POST แยกได้ 409 CREDIT_LIMIT_EXCEEDED, currentCredits=21, courseCredits=3, maxCredits=22 และ DB ไม่เพิ่ม ไม่ใช้ผลนี้แทนผล UI ที่ FAIL

## ความครอบคลุมตาม Sequence Diagram

| เส้นทาง | เคสหลัก | ผลที่ยืนยัน |
|---|---|---|
| Search ปกติ / ไม่พบ / กรอง Sec เดียวกัน | 01–03 | จำนวน ลำดับ ชุดวิชา และ 200 [] |
| โหลด timetable เมื่อเปิดไม่ชน / ไม่มีหรือมีตาราง / คาบต่อกัน | 04–05 | กรองตามภาคปัจจุบัน ไม่สร้าง timetable จาก GET |
| Detail รีวิวและ Sec ทั้งปี / ภาคปัจจุบัน / ไม่มีตัวเลือก | 06–07 | description, offeredSemesters, selectable และ selection |
| Detail วิชาที่เพิ่มแล้ว / ไม่ชนตัวเอง | 10 | API ถูกต้อง แต่ selection ใน UI FAIL |
| Add สร้างตารางใหม่ / ใช้ตารางเดิม / เวลาชนยังเพิ่มได้ | 08–09 | 201, transaction บันทึกแล้ว, updated_at และ conflicts |
| Add แล้ว refresh filter | 11 | 12 → 11 และเรียก GET ใหม่ |
| Add วิชาซ้ำ / หน่วยกิตเกิน | 12–13 | 409 จริง; เคส 13 เข้าถึงจาก UI ไม่ได้จึง FAIL |
| Validation / ไม่พบ / security | 14–15 | 400/404/401 จริง; ขั้นตอน sessionStorage ใน UI ยัง PARTIAL |
| เครือข่ายล้มเหลวและกู้คืน | 16 | กู้คืนได้ แต่ข้อความ FAIL |

ตรวจ query เพิ่มด้วย API จริงแบบแยกทีละคำขอใน [sequence-probes.json](./evidence/sequence-probes.json) ผ่าน **6/6 probes**:

1. ไม่เปิด toggle: metadata → section batch ไม่มีการอ่าน timetable
2. SA240: metadata คืนว่าง ข้าม section batch
3. เปิด toggle และยังไม่มีตาราง: timetable → metadata → section batch ได้ 15 วิชา
4. currentSemester=3: 400 และไม่มี SQL
5. detail SA240: metadata แล้ว 404 ไม่อ่าน timetable/section ต่อ
6. ไม่มี Authorization: 401 และไม่มี SQL

[SQL รายช่วงเคส](./evidence/sql-case-windows.json) กู้ข้อความ query เต็มจาก Docker logs และจัดกลุ่มตามเวลาเริ่ม request ล่าสุด อาจรวม GET ของหน้าตารางที่เกิดร่วมในช่วงเดียวกัน จึงไม่ใช้จำนวน query รายช่วงตัดสินว่า request เดียวมี N+1 หรือพิสูจน์ลำดับภายในคำขอพร้อมกัน การยืนยันลำดับเฉพาะใช้หก probes ข้างต้น

## วิธีที่ต่างจากขั้นตอนต้นฉบับและข้อจำกัด

1. **เคส 15:** ฝั่ง UI ถอด Authorization ที่ HTTP recorder เฉพาะ GET/POST แล้วรับ 401 จาก backend จริง ไม่ปลอม response ไม่แก้ sessionStorage โดย JavaScript เครื่องมือเข้าถึง DevTools ของ Windows ไม่สำเร็จและ Chrome browser connector ไม่พร้อมใช้งาน จึงคง PARTIAL สำหรับขั้นตอนลบ token โดยตรง ดู [ขั้นตอนตรวจต่อ](./US6-T19-Manual-Verification.md)
2. **เคส 16:** ตัดการเชื่อมต่อเฉพาะ request ที่ recorder แทน DevTools Offline ไม่มีการฉีด HTTP 500 หรือ JSON error; แยกทดสอบรายการกับ detail โดยโหลดรายการสำเร็จใหม่ก่อน เพราะหลังรายการล้มเหลวการ์ดเดิมถูกล้าง ทำให้กดอ่านรีวิวต่อจากขั้นแรกตรง ๆ ไม่ได้ คงข้อความ/การกู้คืนที่คาดหวังเดิม
3. **ภาพ:** เก็บเฉพาะภาพที่เปิดตรวจแล้วตรงกับสิ่งที่อ้าง ภาพ modal/error บางไฟล์ได้ภาพค้างจากสถานะก่อนหน้า จึงไม่ส่งเป็นหลักฐานผลนั้น ใช้ AX snapshots, JSON response และ DB logs แทน ตาม DoD ที่อนุญาต screenshot หรือ log ดู [บันทึกตรวจภาพ](./evidence/screenshot-review.json)
4. การทดสอบใช้ source ที่ระบุ ไม่อ้างว่าผ่านโค้ดที่ merge ภายหลัง ไม่ใช้ตัวเลข unit/regression จาก T10/T17 เป็นผลรันใหม่ของ T19 และไม่มีการรัน unit suite ซ้ำในงานทดสอบระบบนี้
5. T15 บางข้อความกล่าวถึง T06/T07–T10 ว่ายังรอพัฒนา เป็นบริบทตอนเขียนแบบทดสอบ รอบนี้ใช้ implementation ที่อยู่ใน develop แล้วโดยไม่แก้เอกสาร T15

## ข้อผิดพลาดและการส่งต่อ

มีร่าง Maintenance 3 เรื่องใน [Fix Cards](./US6-T19-Fix-Cards.md): การเลือก Sec, การแจ้งหน่วยกิตเกิน และข้อความ network error เชื่อมกับร่าง T17 เดิมเพื่อหลีกเลี่ยงการสร้างบั๊กซ้ำ เสนอเจ้าของ US6-T07 PR #112 เป็นผู้รับผิดชอบ ยังไม่ได้สร้างการ์ดบนบอร์ดจริงหรือส่งข้อความภายนอก ตามแนวทางที่ผู้ใช้เลือกไว้

## การคืนสภาพระบบ

[สถานะก่อนปิดระบบ](./evidence/cleanup-state.json) ยืนยันตารางบัญชี stub ว่าง ข้อมูล course/section/slot ของวิชาเสรี 18 วิชาไม่เปลี่ยน ไม่มีการแก้ metadata ระหว่างทดสอบ นำออกเฉพาะ containers/network ของ project `us6t19` และหยุด recorder แล้ว เก็บ named volume `us6t19_test-data` ไว้ ไม่ใช้ `down -v` และไม่แตะฐานข้อมูลเดิมของผู้พัฒนา

## Definition of Done

- [ ] รันครบทุกขั้นตอนใน T15 — ยังเหลือขั้นตอนลบ sessionStorage โดยตรงของเคส 15
- [x] บันทึกผลทุกเคส รวม FAIL/PARTIAL พร้อมหลักฐาน log หรือภาพที่ตรวจแล้ว
- [x] จัดทำร่างการ์ด Maintenance 3 เรื่องในรายงาน ตามขอบเขตที่ผู้ใช้เลือก
- [x] เก็บรายงานใน `.doc/US6/T19/`
- [ ] ผ่าน PR review

งานนี้ไม่มีการแก้ source code, automated test source, application config หรือ migration ของแอป
