# US2-T17 ผลการทดสอบ Integration Test ระหว่าง UI กับ API

Oct 31, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| Vitest IT-01–06, IT-08–18 (`TimetableDeleteUiApiIntegration.test.tsx`) | **ผ่าน 18/18** · ทั้ง frontend (`npx vitest run`) ผ่าน 139/139 ใน 13 ไฟล์ |
| Postman (newman) IT-19–30 36 item (39 HTTP request) | **ผ่าน 36/36 assertion** ไม่มี request ล้ม · รันซ้ำรอบที่ 2 ผ่าน 36/36 เช่นกัน |
| IT-07 | **ตัดออกจาก scope** ทีมตัดสินใจไม่ตรวจการแสดง `updatedAt` บนหน้าจอ (ดู "ส่วนที่ต่างจาก US2-T13" ข้อ 1) |

**User story:** US2 ลบวิชาออกจากตารางเรียนจำลอง · branch `test/US2-T17-run-it-ui-api` · test case ตาม [US2-T13 Integration Test Cases](../US2-T13-Integration-Test-Cases.md)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-31 |
| Commit ฐาน | `96bf27e` (develop `240db7d` + ไฟล์ Vitest ของ task นี้) |
| Frontend test | Vitest 3.2.7 · jsdom · React Testing Library · Node 24.21.0 |
| Postman | newman 6.2.3 (`npx -y newman@6`) |
| Backend ตอนรัน Postman | container `backend` ของ `docker compose` ที่ `http://localhost:8080` · `SPRING_PROFILES_ACTIVE=stub-tu` · ไม่มี commit ที่แก้ `backend/` หลังจาก build container นี้ |
| DB | SQL Server ของ `docker compose` มี seed `V20261014_2010__seed_courses_2568_1.sql` |
| บัญชีทดสอบ | ผู้ใช้หลัก `6609000001` · ผู้ใช้อีกคน (ชุดข้อมูล C) `6609000004` · รหัสผ่าน `Passw0rd!` (บัญชีใน `StubTuApiClient`) ไม่ใช้บัญชี demo `6609000000` เพราะ collection ลบตารางของผู้ใช้ทั้งหมด และไม่ใช้ `6609000002` เป็นชุด C เพราะเป็นนักศึกษาสาขาอื่น login ไม่ผ่าน |

## Vitest: IT-01–06, IT-08–18 (UI ↔ API)

ไฟล์ [`frontend/features/timetable-delete/TimetableDeleteUiApiIntegration.test.tsx`](../../../frontend/features/timetable-delete/TimetableDeleteUiApiIntegration.test.tsx)

ต่างจาก `TimetableDeleteIntegration.test.tsx` (US2-T10) ที่ mock `api.ts` ทั้งโมดูล ไฟล์นี้ดัก `fetch` ของ browser แทน (`vi.stubGlobal`) แบบเดียวกับ US1-T17 จึงทดสอบครบทาง `Timetable` → `useTimetable` → `timetableDeleteApi` → `apiFetch` → HTTP request

`fetch` ที่จำลองตอบเหมือน backend:
- `GET /api/timetable` คืนตารางล่าสุดบน "server"
- `DELETE` ลบแบบ all-or-nothing คำนวณ `totalCredits` และ `conflicts` ใหม่ และ id ที่ไม่มีอยู่ได้ 404 ข้อความเดียวกับ `TimetableDeleteService`

case 404 (IT-13, IT-14) จึงจำลองว่า "อีกแท็บลบไปก่อน" โดยแก้ตารางบน server ก่อนกดลบ ไม่ได้บังคับให้ตอบ 404 ตรง ๆ

ทุก case ที่มี request ตรวจ URL, method `DELETE`, ไม่มี body และ header `Authorization: Bearer <token>` ตาม US2-T13 หัวข้อ 1

ข้อมูลทดสอบ:
- **ชุด A:** 7 วิชา 21 หน่วยกิต (CS180, MA211, CS111, LAS101, TU101, TU106, TU109) TU109 ชนกับ LAS101 วันพุธ 09:30–12:30
- **ชุด B:** `entries: []`, `updatedAt: null`

```bash
cd frontend
npx vitest run features/timetable-delete/TimetableDeleteUiApiIntegration.test.tsx
```

| ID | UAT | วิธีจำลอง | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| IT-01 | TC1 | ชุด A กด "ลบวิชา" ของ LAS101 | `DELETE /api/timetable/entries/{entryId}` 1 ครั้ง ไม่มี body · LAS101 หายจากรายการและ grid · การ์ด CS111 แสดงกลุ่ม วัน เวลา ห้องเดิม · หน่วยกิตตรงกับ `totalCredits` | PASS |
| IT-02 | TC1 | ติ๊ก LAS101 → "ลบที่เลือก (1)" | ใช้ endpoint 2 `?entryIds={id}` · ผลบนหน้าจอเหมือน IT-01 | PASS |
| IT-03 | TC2 | ติ๊ก TU109 และ LAS101 → "ลบที่เลือก (2)" | request เดียว `?entryIds=7,4` (join ด้วย comma ตามลำดับที่ติ๊ก) · เหลือ 5 วิชา 15 หน่วยกิต ตรงกับ response | PASS |
| IT-04 | TC3 | "ลบทั้งหมด" → "ยืนยันลบทั้งหมด" | request เดียวพร้อม entryId ทั้ง 7 ตัว · แสดง "ยังไม่มีวิชาในตาราง" · "หน่วยกิต 0 / 22" · ไม่มีบล็อกบน grid · กล่องยืนยันปิด · `updatedAt` บน server ไม่เป็น `null` | PASS |
| IT-04 (เพิ่ม) | TC3 | "ลบทั้งหมด" → "ยกเลิก" | กล่องยืนยันปิด ไม่มี DELETE ออกไป ตารางเหมือนเดิม | PASS |
| IT-05 | - | ชุด A กดลบ LAS101 | ก่อนลบมีแถบ "ตรวจพบเวลาเรียนซ้อนทับกัน" ป้าย "⚠ ชนกัน" และกรอบ "เวลาชนกัน" บน grid · หลังลบหายทั้งหมด · `conflicts: []` และ `conflictWith` ของ TU109 ว่าง · TU109 ยังอยู่บน grid | PASS |
| IT-06 | TC1 | ติ๊ก CS180, MA211 แล้วลบ | ไม่มี `GET /api/timetable` ซ้ำ (เรียกครั้งเดียวตอนเปิดหน้า) · checkbox ถูกล้าง · ปุ่มลบรายวิชาและ checkbox กดได้ (สถานะกลับเป็น `idle`) · ตัวนับหน่วยกิตและแถบสรุป "วิชาในตารางเรียน: 5 วิชา (15.0 หน่วยกิต)" ถูกต้อง | PASS |
| IT-08 | TC3 | ลบทั้งหมดจากชุด A แล้วเปิดหน้าใหม่ด้วยชุด B | ทั้งสองกรณีแสดง empty state เหมือนกัน ปุ่มลบกดไม่ได้ "หน่วยกิต 0 / 22" · `updatedAt` บน server เป็นเวลาที่ลบ และเป็น `null` ในชุด B (ส่วนที่ตรวจการแสดงเวลาบนหน้าจอตัดออกจาก scope ดูข้อ 1 ของส่วนที่ต่าง) | PASS |
| IT-09 | TC4 | ชุด B | "ลบที่เลือก" และ "ลบทั้งหมด" disabled ไม่มี checkbox กดแล้วไม่มี request | PASS |
| IT-10 | - | ชุด A ไม่ติ๊กอะไร | "ลบที่เลือก" disabled กดแล้วไม่มี request | PASS |
| IT-11 | - | ติ๊ก CS111, TU101 แล้วเอาติ๊กออก | ปุ่มกลับเป็น "ลบที่เลือก" และ disabled ไม่มี request | PASS |
| IT-12 | - | DELETE ไม่ตอบจนกว่า test จะสั่ง แล้วกด "ลบที่เลือก (1)" 2 ครั้งและกดลบ MA211 | มี DELETE ออกไปครั้งเดียว · ระหว่างรอ ปุ่มลบทุกปุ่มและ checkbox disabled · ได้ response แล้วกลับมากดได้ ตารางตรงกับ response | PASS |
| IT-13 | - | ลบ CS180 บน server ก่อน แล้วกดลบ CS180 บนหน้าจอ | ได้ 404 แสดง "ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง" · `GET /api/timetable` ครั้งที่ 2 · รายการเหลือ 6 วิชาตรงกับ server · checkbox ที่ติ๊กไว้ถูกล้าง | PASS |
| IT-14 | TC2 | ลบ CS180 บน server ก่อน แล้วติ๊ก CS180, MA211 กดลบ | ได้ 404 · MA211 ยังอยู่บน server (all-or-nothing) · หลังโหลดใหม่แสดง 6 วิชาครบ · checkbox ถูกล้าง | PASS |
| IT-15 | - | DELETE ตอบ `400` ProblemDetail | แสดง "ลบวิชาไม่สำเร็จ กรุณาลองใหม่" ไม่แสดง `detail` จาก backend · ไม่ GET ใหม่ · ตารางเหมือนเดิม · checkbox ยังติ๊กอยู่และกดลบซ้ำได้ | PASS |
| IT-16 | - | DELETE ตอบ `500` | ผลเหมือน IT-15 ไม่ค้างที่ `deleting` | PASS |
| IT-17 | - | `fetch` reject ด้วย `TypeError("Failed to fetch")` | แสดงข้อความ error ตารางเหมือนเดิม ไม่ค้างที่ "กำลังโหลดตารางเรียน…" · กดลบซ้ำแล้วส่ง DELETE ใหม่ (รวม 2 ครั้ง) | PASS |
| IT-18 | - | ครั้งแรกตอบ `500` แล้วกลับมาตอบเหมือน backend | ครั้งที่ 2 ลบสำเร็จ ข้อความ error หาย LAS101 หายจากตาราง ปุ่มกดได้ | PASS |

```
 ✓ features/timetable-delete/TimetableDeleteUiApiIntegration.test.tsx (18 tests)

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

## Postman: IT-19–30 (สัญญา API)

- [`US2-T17.postman_collection.json`](./US2-T17.postman_collection.json) เป็น collection v2.1 import เข้า Postman ได้
  - ตัวแปร `baseUrl` ค่าเริ่มต้น `http://localhost:8080`
  - `username` ค่าเริ่มต้น `6609000001`
  - `otherUsername` ค่าเริ่มต้น `6609000004`
- ต้องรันทั้ง collection ตามลำดับ เพราะ request ถัดไปใช้ token, `sectionId` และ `entryId` ที่ request ก่อนหน้าสร้างไว้
- ไม่ใส่ `sectionId` หรือ `entryId` ตายตัว:
  - request 01 อ่าน `sectionId` จาก `GET /api/courses` เก็บเป็นตัวแปร `sec_<รหัสวิชา>_<กลุ่ม>`
  - request 03–05 เก็บ `entryId` จาก response ของ `POST /api/timetable/entries` เพราะทั้งสองค่าเป็น IDENTITY
- ทุก case ที่ได้ error ตรวจว่า `Content-Type` เป็น `application/problem+json` และ `status` ใน body ตรงกับ HTTP status
- หลัง error ทุกครั้ง มี GET ตามไปเช็กว่าไม่มีอะไรถูกลบจริง
- ผลรันเต็มอยู่ใน [`US2-T17-newman-cli.txt`](./US2-T17-newman-cli.txt)

ข้อมูลทดสอบ (US2-T13 หัวข้อ 2):
- **ชุด A:** ตาราง 2568/1 ของ `6609000001` มี CS111 030001 (`e1`), MA211 (`e2`), CS180 (`e3`), LAS101 (`e4`)
- **ชุด C:** `6609000004` เพิ่ม CS111 030001 (`entryC`)
- **ชุด D:** `6609000001` เพิ่ม CS223 ของ 2568/2 จาก seed (`entryD2`) จึงมี entry 2 ภาคเรียน

```bash
# backend ใช้ TU API stub (ใส่ SPRING_PROFILES_ACTIVE=stub-tu ใน .env)
docker compose up -d --build

npx -y newman@6 run .doc/US2/T17/US2-T17.postman_collection.json
```

| # | Request | Case | ผลที่คาดหวัง | ผล |
| --- | --- | --- | --- | --- |
| 00a, 00b | POST login `6609000001`, `6609000004` | Setup | 200 ได้ token ทั้งสองบัญชี | PASS |
| 01a | GET courses 2568/1 | Setup | 200 ได้ 9 วิชา เก็บ `sectionId` ทุกกลุ่ม | PASS |
| 01b | GET courses 2568/2 | Setup | 200 มี CS223 เก็บ `sectionId` | PASS |
| 02a–02c | GET timetable แล้ว DELETE ทุก entry | Setup | ตาราง 2568/1, 2568/2 ของผู้ใช้หลัก และ 2568/1 ของผู้ใช้อีกคนว่าง | PASS |
| 03a–03d | POST CS111 030001, MA211, CS180, LAS101 | Setup ชุดข้อมูล A | 201 ทุกตัว เก็บ `e1`–`e4` | PASS |
| IT-19 | DELETE `/entries/abc` | IT-19 | 400 ProblemDetail | PASS |
| IT-20 | DELETE `/entries` (ไม่ส่ง `entryIds`) | IT-20 | 400 ProblemDetail | PASS |
| IT-21 | DELETE `/entries?entryIds=` | IT-21 | 400 `detail: "ต้องระบุ entryIds อย่างน้อย 1 ตัว"` | PASS |
| IT-22 | DELETE `/entries?entryIds={e1},abc` | IT-22 | 400 ProblemDetail | PASS |
| — | GET timetable | IT-19–22 | ยังมี `e1`–`e4` ครบ 4 วิชา | PASS |
| IT-23 | DELETE `?entryIds={e1},{e1}` | IT-23 | 200 เหลือ `e2`, `e3`, `e4` `totalCredits: 9` (เหมือนส่ง `e1` ตัวเดียว) | PASS |
| IT-24 | DELETE `?entryIds={e2}&entryIds={e3}` | IT-24 | 200 เหลือ `e4` `totalCredits: 3` | PASS |
| 04 | `6609000004` POST CS111 030001 | Setup ชุดข้อมูล C | 201 เก็บ `entryC` | PASS |
| IT-25 | ผู้ใช้หลัก DELETE `/entries/{entryC}` | IT-25 | 404 `detail: "ไม่พบวิชาในตารางเรียนของคุณ: entryId {entryC}"` | PASS |
| — | `6609000004` GET timetable | IT-25 | `entryC` ยังอยู่ | PASS |
| 05 | POST CS223 2568/2 | Setup ชุดข้อมูล D | 201 เก็บ `entryD2` | PASS |
| IT-26 | DELETE `?entryIds={e4},{entryD2}` | IT-26 | 400 `detail: "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"` | PASS |
| — | GET timetable 2568/1 และ 2568/2 | IT-26 | `e4` และ `entryD2` ยังอยู่ | PASS |
| IT-27 | DELETE `?entryIds={e4},{entryD2},{entryC}` | IT-27 | 404 `detail` บอกเฉพาะ `entryC` ไม่บอก `e4`, `entryD2` (ตรวจความเป็นเจ้าของก่อนตรวจภาคเรียน) | PASS |
| — | GET timetable 2568/1, 2568/2 และของ `6609000004` | IT-27 | `e4`, `entryD2`, `entryC` ยังอยู่ครบ | PASS |
| IT-28 | DELETE `/entries/{e1}` (ลบไปแล้วใน IT-23) | IT-28 | 404 `detail: "ไม่พบวิชาในตารางเรียนของคุณ: entryId {e1}"` | PASS |
| IT-29 | DELETE `/entries/?entryIds={e4}` | IT-29 | 404 | PASS |
| — | GET timetable | IT-29 | `e4` ยังอยู่ | PASS |
| IT-30a | DELETE `?entryIds={e4}` (entry สุดท้าย) | IT-30 | 200 `entries: []`, `totalCredits: 0` | PASS |
| IT-30b | GET timetable | IT-30 | `entries: []`, `conflicts: []`, `totalCredits: 0`, `updatedAt` เป็น string ไม่เป็น `null` | PASS |
| 99a, 99b | GET timetable แล้ว DELETE ทุก entry | Cleanup | ตาราง 2568/2 ของผู้ใช้หลัก และ 2568/1 ของผู้ใช้อีกคนว่าง (ตาราง 2568/1 ของผู้ใช้หลักว่างแล้วจาก IT-30) | PASS |

```
┌─────────────────────────┬────────────────────┬───────────────────┐
│                         │           executed │            failed │
├─────────────────────────┼────────────────────┼───────────────────┤
│              iterations │                  1 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│                requests │                 39 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│            test-scripts │                 36 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│      prerequest-scripts │                  0 │                 0 │
├─────────────────────────┼────────────────────┼───────────────────┤
│              assertions │                 36 │                 0 │
└─────────────────────────┴────────────────────┴───────────────────┘
```

> request 39 ตัวมาจาก 36 item ใน collection รวมกับ DELETE ที่ script ส่งเองใน request 99a, 99b (และ 02a–02c เมื่อตารางไม่ว่าง)

## การจับคู่กับ US2-T13 และ UAT (US2-T16)

| Integration Test Case | UAT | ทดสอบด้วย | ผล |
| --- | --- | --- | --- |
| IT-01, IT-02, IT-05, IT-06 | TC1 | Vitest | PASS |
| IT-03, IT-14 | TC2 | Vitest | PASS |
| IT-04, IT-08 | TC3 | Vitest | PASS |
| IT-30 | TC3 | Postman | PASS |
| IT-09 | TC4 | Vitest | PASS |
| IT-10–13, IT-15–18 | - | Vitest | PASS |
| IT-19–29 | - | Postman | PASS |
| IT-07 | - | — | ตัดออกจาก scope |

## ส่วนที่ต่างจาก US2-T13

ไม่ได้แก้เอกสาร US2-T13 เพราะเป็นเอกสารออกแบบที่ทำเสร็จแล้ว บันทึกส่วนที่ต่างไว้ที่นี่แทน

1. **ตัดการตรวจ `updatedAt` บนหน้าจอออกจาก scope:** หน้าตารางเรียนไม่มีข้อความ "บันทึกตารางร่างล่าสุดเมื่อสักครู่" แม้ข้อความนี้จะอยู่ใน Figma frame 1:1057 และ [US1 API Spec](../../US1/T05/US1-DTO%20&%20API%20Spec.md) ทีมตัดสินใจ (2026-10-31) ไม่ตรวจส่วนนี้ใน US2
   - ตัด IT-07 ทั้งข้อ
   - ตัดส่วนที่ตรวจข้อความ "บันทึก…เมื่อสักครู่" ใน IT-04 และส่วนที่ตรวจการแสดงเวลาใน IT-08
   - ยังตรวจ `updatedAt` ที่ระดับข้อมูล: Vitest ตรวจค่าบน server ใน IT-04, IT-08 และ Postman IT-30 ยืนยันว่าตารางที่ลบจนว่างมี `updatedAt` ไม่เป็น `null`
   - UAT (US2-T16) ไม่ต้องแก้ เพราะไม่ได้อ้างถึง `updatedAt` หรือข้อความบันทึก
   - การแก้ US2-T13 และการแจ้งเจ้าของ US1 ทำแยกจาก task นี้
2. **เลข `entryId` ในตัวอย่าง:** T13 เขียน TU109 = 7 และ LAS101 = 8
   - Vitest ได้ LAS101 = 4 และ TU109 = 7 ตามลำดับใน fixture
   - Postman ได้เลขจาก IDENTITY ซึ่งต่างกันทุกครั้งที่รัน
   - ไม่กระทบผล เพราะ test ทุกตัวอ่าน `entryId` จากข้อมูลจริง
3. **ไอคอนลบบนการ์ดมีแล้ว:** ปุ่ม "ลบวิชา" บนการ์ดในส่วน "วิชาที่เพิ่มแล้ว" IT-01 จึงทดสอบผ่าน UI ได้ ไม่ต้องย้ายไป Postman ตามข้อสังเกตข้อ 2 ของ T13
4. **มีกล่องยืนยันก่อน "ลบทั้งหมด":** เพิ่ม case "IT-04 (เพิ่ม)" กดยกเลิกแล้วไม่มี request ตามข้อสังเกตข้อ 4 ของ T13 การลบรายวิชาเดียวและลบที่เลือกไม่มีกล่องยืนยัน
5. **ข้อความ error ที่ UI ใช้จริง:**
   - 404: "ตารางเรียนมีการเปลี่ยนแปลงจากที่อื่น กรุณาตรวจตารางล่าสุดแล้วเลือกวิชาที่จะลบอีกครั้ง"
   - 400, 500 และเครือข่ายล่ม: "ลบวิชาไม่สำเร็จ กรุณาลองใหม่"
   - ยังไม่ได้เทียบกับ Figma frame 1:256 และ 1:1810 ตามข้อสังเกตข้อ 3 ของ T13
6. **ตรวจบล็อกบน grid ได้แค่ว่ามีหรือไม่มี:** วิชาที่เวลาชนถูกวาดซ้ำในกรอบ "เวลาชนกัน" จำนวน `<strong>` ของวิชาจึงไม่เท่ากับจำนวนคาบ
7. **ไม่ได้ตรวจ `DeleteStatus` ตรง ๆ:** ค่านี้ไม่แสดงบนหน้าจอ จึงตรวจจากพฤติกรรมแทน
   - `deleting`: ปุ่มลบและ checkbox disabled
   - `idle`: กลับมากดได้ checkbox ถูกล้าง
   - `error`: มีข้อความ error checkbox ยังติ๊กอยู่และกดลบซ้ำได้
8. **ชุดข้อมูล C:** ใช้บัญชี `6609000004` แทน `6609000002` เพราะ `6609000002` เป็นนักศึกษาสาขาอื่น login ได้ 403 `NOT_CS_STUDENT` จึงสร้างตารางไม่ได้
9. **ชุดข้อมูล D:** ใช้ CS223 กลุ่ม 030001 ของ 2568/2 ที่มีอยู่ใน seed จึงไม่ต้องเพิ่มข้อมูลใน DB เอง

## ข้อจำกัด

- **Vitest ไม่ได้ต่อ backend จริง:** IT-01–18 รันใน jsdom โดยจำลอง response จึงยืนยันว่า UI ส่ง request ถูกและจัดการ response ได้ตามเอกสาร แต่ไม่ได้ยืนยันว่า backend ตอบแบบเดียวกัน ส่วนนั้นยืนยันด้วย Postman IT-19–30 ซึ่งได้ status และ `detail` ตรงกับที่ fetch จำลองไว้
- **IT-13 และ IT-14 ไม่ได้เปิดสองแท็บจริง:** จำลองด้วยการแก้ตารางบน "server" ก่อนกดลบ ยังไม่ได้รันผ่านหน้าเว็บจริงด้วยสองแท็บ
- **Postman ใช้ TU API stub (`stub-tu`) แค่สำหรับ login:** API ของรายวิชาและตารางเรียนเป็นของจริงทั้งหมด
- **Collection ลบข้อมูลจริง:** ลบตาราง 2568/1 และ 2568/2 ของ `username` และตาราง 2568/1 ของ `otherUsername` ทั้งตอนเริ่มและตอนจบ ห้ามตั้งเป็นบัญชีที่มีข้อมูลที่ต้องการเก็บไว้
