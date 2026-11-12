# US2-T19 รายงานผล System Test

Oct 31, 2026 · @Non

## สรุปผล

| Test Case | เรื่อง | ทางที่ทดสอบ | ผล |
| --- | --- | --- | --- |
| ST-US2-01 | ลบรายวิชาเดียวสำเร็จ | UI (login ผ่านหน้าเว็บ) + DB | **Pass** |
| ST-US2-02 | ลบหลายรายวิชาสำเร็จ | UI + DB | **Pass** |
| ST-US2-03 | ส่ง Entry ID ที่ไม่ใช่ตัวเลข | API + DB | **Pass** |
| ST-US2-04 | ไม่ส่ง Entry ID | API + DB | **Pass** |
| ST-US2-05 | ส่งรายการ Entry ID ว่าง | API + DB | **Pass** |
| ST-US2-06 | ลบ Entry ID ที่ไม่มีอยู่จริง | API + UI (2 แท็บ) + DB | **Pass** |
| ST-US2-07 | ลบ Entry ID ของนักศึกษาคนอื่น | API + UI (เปลี่ยน URL คำขอ) + DB | **Pass** |
| ST-US2-08 | ลบ Entry ID จากคนละตารางเรียน | API + DB | **Pass** |
| ST-US2-09 | ส่ง Entry ID ซ้ำกัน | API + UI (เปิดหน้าดูผล) + DB | **Pass** |
| ST-US2-10 | ลบรายวิชาสุดท้ายจนตารางว่าง | UI + DB | **Pass** |
| ST-US2-11 | ลบทีละวิชาต่อเนื่อง 2 รายการ | UI + DB | **Pass** |

**ผ่าน 11 / 11** · test case จาก [US2-T15](../T15/US2-T15-design-system-test.md) · อ้างอิง [US2-T06 Sequence Diagram](../T06/US2-T06-Sequence-Diagram.md) · branch `test/US2-T19-run-system-test`

ทุกเคสตรวจครบ 3 ชั้นตาม Sequence Diagram คือ คำขอที่หน้าเว็บส่งและสถานะของหน้าเว็บ, HTTP response ของ backend, และข้อมูลใน Database ก่อน/หลัง (รวม `updated_at`) เคสที่ต้อง error ตรวจเพิ่มจาก SQL log ของ backend (`spring.jpa.show-sql`) ว่าไม่มีคำสั่ง `delete` หรือ `update` ถูกรันเลย

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-31 |
| โค้ด | `main` commit `240db7d` |
| ระบบ | `docker compose up -d --build` (SQL Server + backend :8080 + frontend :3000) · `.env` ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` |
| บัญชี | student-A = `6609000000`, student-B = `6609000001` (บัญชีของ TU API ปลอม รหัสผ่าน `Passw0rd!`) |
| ข้อมูล | seed รายวิชา 2568/1 และ 2568/2 · ก่อนแต่ละเคสสคริปต์ล้างตารางของ A/B แล้วเพิ่มวิชาผ่าน `POST /api/timetable/entries` |
| Browser | Chrome 131 headless ควบคุมด้วย puppeteer 23.11.1 จอ 1366 × 900 บน Windows 11 |
| สคริปต์ | [run-system-test.cjs](./run-system-test.cjs) · ผลดิบ [evidence/run-output.txt](./evidence/run-output.txt) · request/response/สภาพ DB ทุกเคสอยู่ใน `evidence/ST-US2-xx.json` |

รันซ้ำได้ด้วย:

```bash
docker compose up -d --build
NODE_PATH=<โฟลเดอร์ node_modules ที่มี puppeteer> node .doc/US2/T19/run-system-test.cjs            # ทุกเคส
NODE_PATH=... node .doc/US2/T19/run-system-test.cjs ST-US2-06 ST-US2-07                          # บางเคส
```

## การปรับจากเอกสาร T15

| จุด | ทำอย่างไร |
| --- | --- |
| Entry ID ในเอกสาร (`7`, `8`, `200`) เป็นตัวอย่าง | ใช้ entryId จริงจาก response ตอนเตรียมข้อมูล (แสดงในผลแต่ละเคสด้านล่าง) |
| ST-US2-06 ต้องการ Entry ID ที่ไม่มีอยู่จริง | ใช้ `MAX(entry_id) + 99999` และตรวจใน DB ก่อนว่าไม่มีจริง |
| ST-US2-06 / 07 "จำลองให้ UI ได้ 404" | 06: เปิด 2 แท็บ ลบ CS180 ในแท็บ 1 แล้วกดลบ CS180 ในแท็บ 2 ที่ยังเป็นข้อมูลเก่า จึงได้ 404 จริงจาก backend · 07: ดักคำขอลบที่ UI ส่งแล้วเปลี่ยน entryId เป็นของ B (เหมือนแก้ request ใน DevTools) |
| ST-US2-08 ต้องมีตาราง 2/2568 | seed มี CS111 030001 ภาค 2568/2 อยู่แล้ว เพิ่มผ่าน `POST /api/timetable/entries` ระบบสร้างตาราง 2/2568 ให้เอง ไม่ต้อง INSERT ตรง |
| ST-US2-09 ส่ง `7,7` | หน้าเว็บส่ง ID ซ้ำไม่ได้ จึงยิง API แล้วเปิดหน้าเว็บดูผล |
| ST-US2-02 "ข้อมูลเวลาชนที่คำนวณใหม่" | เตรียม LAS101 + TU109 (เวลาชน พุธ 09:30–12:30) แล้วลบ TU109 + CS180 เพื่อให้เห็นว่าเวลาชนหายไปจริง |
| `updatedAt` | ตรวจจาก response และ DB ไม่ตรวจบนหน้าจอ เพราะทีมตกลงว่าหน้าเว็บไม่แสดงเวลาที่บันทึก |
| สถานะ `deleting` | ชะลอคำขอ DELETE 0.8–1.5 วินาทีเพื่อจับสถานะปุ่มระหว่างรอผล |

## ผลแต่ละ Test Case

### ST-US2-01 ลบรายวิชาเดียวสำเร็จ — Pass

ข้อมูล: A มี CS180 (entry 30098), MA211, CS111 · login ผ่านหน้า `/login` แล้วกด "ลบวิชา" ที่ CS180

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| API ตอบ 200 พร้อม `TimetableResponse` | UI ส่ง `DELETE /api/timetable/entries/30098` ได้ 200 มี `entries, totalCredits, maxCredits, conflicts, updatedAt` | Pass |
| Entry ถูกลบจาก DB | entry 30098 ไม่มีใน `timetable_entry` แล้ว | Pass |
| วิชาอื่นยังอยู่ | DB เหลือ MA211, CS111 | Pass |
| `updatedAt` ถูกอัปเดต | `updated_at` 14:17:43Z → 14:17:47Z · response `2026-10-31T21:17:47+07:00` | Pass |
| หน้าเว็บแสดงตารางและหน่วยกิตใหม่ | MA211, CS111 · "หน่วยกิต 6 / 22" ([ภาพ](./evidence/ST-US2-01-after.png)) | Pass |
| Checkbox ถูกล้าง สถานะกลับเป็น `idle` | ระหว่างรอปุ่มลบทุกปุ่มถูกปิด · หลังลบไม่มี checkbox ติ๊ก ปุ่มกดได้ ไม่มี error | Pass |

### ST-US2-02 ลบหลายรายวิชาสำเร็จ — Pass

ข้อมูล: A มี LAS101, TU109 (entry 30102), CS180 (entry 30103), MA211 · ติ๊ก TU109 กับ CS180 แล้วกด "ลบที่เลือก (2)" ([ภาพก่อนลบ](./evidence/ST-US2-02-selected.png))

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| ปุ่มลบถูกปิดระหว่างประมวลผล | "ลบที่เลือก (2)", ปุ่ม "ลบวิชา" และ checkbox ทุกตัว disabled | Pass |
| API ตอบ 200 พร้อม `TimetableResponse` | UI ส่ง `DELETE /api/timetable/entries?entryIds=30102,30103` คำขอเดียว ได้ 200 | Pass |
| ทั้งสองรายการถูกลบจาก DB | TU109, CS180 ไม่มีใน DB | Pass |
| รายการที่ไม่ได้เลือกยังอยู่ | LAS101, MA211 | Pass |
| `updatedAt` ถูกอัปเดต | 14:17:49Z → 14:17:54Z | Pass |
| ตาราง หน่วยกิต และเวลาชนคำนวณใหม่ | ก่อนลบมีแถบเตือนเวลาชน หลังลบ `conflicts: []` แถบเตือนหาย · "หน่วยกิต 6 / 22" ([ภาพ](./evidence/ST-US2-02-after.png)) | Pass |
| Checkbox ถูกล้าง สถานะ `idle` | ไม่มี checkbox ติ๊ก ไม่มี error | Pass |

### ST-US2-03 ส่ง Entry ID ที่ไม่ใช่ตัวเลข — Pass

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 400 พร้อม ProblemDetail | `DELETE /api/timetable/entries/abc` → 400 `application/problem+json` `"detail": "Failed to convert 'entryId' with value: 'abc'"` | Pass |
| ถูกปฏิเสธก่อนเข้า Controller | error มาจากการแปลง path variable ของ Spring และไม่มี SQL `delete`/`update` ใน log | Pass |
| ไม่มีวิชาถูกลบ ข้อมูลไม่เปลี่ยน | DB ก่อน/หลังเหมือนกันทุกแถว (CS180, MA211 และ `updated_at` เดิม) | Pass |

### ST-US2-04 ไม่ส่ง Entry ID — Pass

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 400 พร้อม ProblemDetail | `DELETE /api/timetable/entries` → 400 `"detail": "Required parameter 'entryIds' is not present."` | Pass |
| ไม่มีวิชาถูกลบ ข้อมูลไม่เปลี่ยน | DB ก่อน/หลังเหมือนกันทุกแถว ไม่มี SQL `delete`/`update` | Pass |

### ST-US2-05 ส่งรายการ Entry ID ว่าง — Pass

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 400 พร้อม ProblemDetail | `DELETE /api/timetable/entries?entryIds=` → 400 `"detail": "ต้องระบุ entryIds อย่างน้อย 1 ตัว"` | Pass |
| ไม่มีวิชาถูกลบ ข้อมูลไม่เปลี่ยน | DB ก่อน/หลังเหมือนกันทุกแถว ไม่มี SQL `delete`/`update` | Pass |

### ST-US2-06 ลบ Entry ID ที่ไม่มีอยู่จริง — Pass

ข้อมูล: A มี CS180, MA211, CS111 · Entry ID ทดสอบ `130112` (ตรวจแล้วว่าไม่มีใน DB)

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 404 พร้อม ProblemDetail | `DELETE /api/timetable/entries/130112` → 404 `"detail": "ไม่พบวิชาในตารางเรียนของคุณ: entryId 130112"` | Pass |
| ไม่ลบหรือเปลี่ยนข้อมูล | DB ก่อน/หลังเหมือนกัน ไม่มี SQL `delete`/`update` | Pass |
| UI แจ้งว่าตารางเปลี่ยน | แท็บ 2 ได้ 404 จาก `DELETE /api/timetable/entries/30111` แสดง "ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง" ([ภาพ](./evidence/ST-US2-06-ui-404.png)) | Pass |
| UI ส่ง `GET /api/timetable` โหลดใหม่ | ลำดับคำขอ: `DELETE …/30111` → `GET /api/timetable?academicYear=2568&semester=1` | Pass |
| รายการตรงกับข้อมูลล่าสุด checkbox ถูกล้าง | จอและ DB ตรงกัน (MA211, CS111) · MA211 ที่ติ๊กไว้ก่อนถูกล้าง | Pass |

### ST-US2-07 ลบ Entry ID ของนักศึกษาคนอื่น — Pass

ข้อมูล: A มี CS180, MA211 · B มี CS111 (entry 30116), LAS101

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 404 พร้อม ProblemDetail | token ของ A ส่ง `DELETE /api/timetable/entries/30116` → 404 `"detail": "ไม่พบวิชาในตารางเรียนของคุณ: entryId 30116"` | Pass |
| ไม่ลบ entry ของ B | entry 30116 ยังอยู่ ตารางของ B ยังมี CS111, LAS101 | Pass |
| ตารางของ A ไม่เปลี่ยน | DB ของ A และ B ก่อน/หลังเหมือนกันทุกแถว รวม `updated_at` | Pass |
| ไม่เปิดเผยข้อมูลของ B | response มีแค่ entryId ที่ส่งไป ไม่มีรหัสนักศึกษา รหัสวิชา หรือ section ของ B และใช้ 404 เดียวกับกรณีไม่มีรายการ | Pass |
| UI แจ้งเตือนแล้วโหลดตารางของ A ใหม่ | แสดงข้อความแจ้งเตือน แล้วส่ง `GET /api/timetable?academicYear=2568&semester=1` · จอแสดง CS180, MA211 ของ A ไม่มีวิชาของ B ([ภาพ](./evidence/ST-US2-07-ui-404.png)) | Pass |
| Checkbox ถูกล้าง | MA211 ที่ติ๊กไว้ถูกล้าง | Pass |

### ST-US2-08 ลบ Entry ID จากคนละตารางเรียน — Pass

ข้อมูล: A มี CS180 (entry 30118), MA211 ในตาราง 1/2568 (timetable 10004) และ CS111 030001 (entry 30120) ในตาราง 2/2568 (timetable 20004)

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 400 พร้อม ProblemDetail | `DELETE /api/timetable/entries?entryIds=30118,30120` → 400 `"detail": "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"` | Pass |
| ไม่มีวิชาถูกลบจากทั้งสองตาราง | 1/2568 ยังมี CS180, MA211 · 2/2568 ยังมี CS111 ไม่มี SQL `delete` | Pass |
| หน่วยกิตทั้งสองตารางเท่าเดิม | `GET` ได้ `totalCredits` 6 และ 3 | Pass |
| ไม่อัปเดต `updatedAt` | `updated_at` ทั้งสองตารางเท่าเดิม ไม่มี SQL `update` | Pass |

### ST-US2-09 ส่ง Entry ID ซ้ำกัน — Pass

ข้อมูล: A มี CS180 (entry 30121), MA211, CS111

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| 200 พร้อม `TimetableResponse` ไม่มี error | `DELETE /api/timetable/entries?entryIds=30121,30121` → 200 | Pass |
| CS180 ถูกลบ วิชาอื่นยังอยู่ | DB เหลือ MA211, CS111 | Pass |
| `updatedAt` อัปเดต response ตรงกับที่เหลือ | `entries` = MA211, CS111 · `totalCredits` 6 · `updatedAt` `2026-10-31T21:18:23+07:00` | Pass |
| หน้าเว็บแสดงตารางใหม่ ไม่มี checkbox ค้าง | เปิดหน้าเว็บเห็น MA211, CS111 ไม่มี checkbox ติ๊ก ([ภาพ](./evidence/ST-US2-09-after.png)) | Pass |

### ST-US2-10 ลบรายวิชาสุดท้ายจนตารางว่าง — Pass

ข้อมูล: A มี CS180 วิชาเดียว

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| ระหว่างรอ สถานะ `deleting` ปุ่มลบถูกปิด | ปุ่ม "ลบวิชา", "ลบที่เลือก", "ลบทั้งหมด" และ checkbox disabled | Pass |
| 200 · `entries: []` · `totalCredits: 0` · `conflicts: []` | ตรงทั้งหมด | Pass |
| ตารางยังอยู่ใน DB แต่ไม่มีวิชา | แถว timetable 10004 (1/2568) ยังอยู่ ไม่มี entry | Pass |
| `updatedAt` อัปเดตและไม่เป็น null | 14:18:26Z → 14:18:30Z · response `2026-10-31T21:18:30+07:00` | Pass |
| UI แสดงตารางว่าง ยังมีหัววันและเวลา | "ยังไม่มีวิชาในตาราง" มีหัว จันทร์–เสาร์ และ 08:00–20:00 · "หน่วยกิต 0 / 22" ([ภาพ](./evidence/ST-US2-10-empty.png)) | Pass |
| ปุ่มลบถูกปิดเพราะไม่มีวิชา | "ลบที่เลือก" และ "ลบทั้งหมด" disabled | Pass |
| สถานะกลับเป็น `idle` | ไม่มีข้อความ error | Pass |

### ST-US2-11 ลบทีละวิชาต่อเนื่อง 2 รายการ — Pass

ข้อมูล: A มี CS180 (entry 30125), MA211 (entry 30126), CS111

| ผลที่คาดหวัง | ผลจริง | ผล |
| --- | --- | --- |
| ส่ง DELETE แยก 2 ครั้ง ได้ 200 ทั้งคู่ | `DELETE …/entries/30125` และ `DELETE …/entries/30126` ได้ 200, 200 (มี DELETE แค่ 2 ครั้ง) | Pass |
| หลังลบ CS180 เหลือ MA211, CS111 | response และจอตรงกัน "หน่วยกิต 6 / 22" ([ภาพ](./evidence/ST-US2-11-after-CS180.png)) | Pass |
| หลังลบ MA211 เหลือ CS111 | response และจอตรงกัน "หน่วยกิต 3 / 22" ([ภาพ](./evidence/ST-US2-11-after-MA211.png)) · DB เหลือ CS111 | Pass |
| ไม่มี error กลับเป็น `idle` ทุกครั้ง | ไม่มีข้อความ error ปุ่มลบกดได้หลังแต่ละคำขอ | Pass |

## ข้อสังเกต

- ไม่พบข้อบกพร่องของระบบ ทุกเส้นทางใน Sequence Diagram ของ US2-T06 ทำงานตามที่ออกแบบ
- ข้อความ 400 ของ ST-US2-03/04 เป็นข้อความภาษาอังกฤษของ Spring ส่วนเคสอื่นเป็นภาษาไทย ไม่กระทบผู้ใช้เพราะหน้าเว็บไม่ส่งคำขอแบบนี้
- หลังรันสคริปต์ ข้อมูลใน DB dev เปลี่ยน: ตาราง 1/2568 ของ student-A เหลือ CS111 (จาก ST-US2-11), 2/2568 ว่าง และตารางของ student-B ว่าง
