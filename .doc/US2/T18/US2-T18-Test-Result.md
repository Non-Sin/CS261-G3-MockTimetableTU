# US2-T18 ผลการทดสอบ Integration Test ระหว่าง API กับ DAO

Oct 31, 2026 · @Non

## สรุปผล

| ชุดทดสอบ | ผล |
| --- | --- |
| JUnit IT-01–06 (`TimetableDeleteApiDaoIntegrationTest`) | **ผ่าน 6/6** |
| Backend ทั้งหมด (`./mvnw test`) | **ผ่าน 192/192** ใน 32 test class ไม่มี failure/error/skip |

**User story:** US2 ลบรายวิชาออกจากตารางเรียนจำลอง · branch `test/US2-T18-run-it-api-dao` · test case ตาม [US2-T14 Integration Test Cases (API & DAO)](../T14/US2-T14-design-it-api-dao)

## สภาพแวดล้อม

| หัวข้อ | ค่า |
| --- | --- |
| วันที่รัน | 2026-10-31 |
| Commit ฐาน | `2d6dfc0` (เพิ่ม `TimetableDeleteApiDaoIntegrationTest` บน main `240db7d`) |
| Backend test | JUnit 5 · Spring Boot 4.1.1 (`@SpringBootTest` + MockMvc) · OpenJDK 21.0.10 · Maven 3.10.0 |
| DB | SQL Server 2025 (`mcr.microsoft.com/mssql/server:2025-latest`, Database version 17.0) สร้างใหม่ทุกครั้งด้วย Testcontainers · Docker 29.8.2 |
| Schema และข้อมูล | Flyway รัน `db/migration` และ `db/seed` ครบ 5 ไฟล์ ใช้รายวิชา 1/2568 และ 2/2568 จาก `V20261014_2010__seed_courses_2568_1.sql` |
| บัญชีทดสอบ | `6609000097` (เจ้าของตาราง) และ `6609000098` (อีกคน สำหรับ IT-04) สร้าง JWT ด้วย `JwtService` จริง ไม่ผ่าน login (ไม่ต้องใช้ TU API) ไม่ใช้บัญชี demo `6609000000` และไม่ซ้ำกับ `6609000099` ของ US1-T18 |

## JUnit: IT-01–06

ไฟล์ [`backend/src/test/java/.../timetable/TimetableDeleteApiDaoIntegrationTest.java`](../../../backend/src/test/java/th/ac/tu/cs261/group3/backend/timetable/TimetableDeleteApiDaoIntegrationTest.java)

ต่างจาก `TimetableDeleteControllerTest` (mock `TimetableDeleteService`), `TimetableDeleteServiceTest` (mock repository) และ `TimetableEntryDeleteRepositoryTest` (`@DataJpaTest` ไม่มี API) ไฟล์นี้ไม่ mock อะไรเลย request วิ่งครบทาง security filter (JWT) → `TimetableDeleteController` → `TimetableDeleteService` → `TimetableEntryRepository` / `TimetableService` → SQL Server

- ไม่ใส่ `@Transactional` ที่ test ให้ service commit จริง แล้วตรวจแถวใน `timetable`, `timetable_entry` และ `section` ด้วย `JdbcTemplate` ก่อนและหลังยิง request
- ไม่ใส่ `entryId` ตายตัว เพราะเป็น IDENTITY ทุกเคสเตรียมตาราง 1/2568 ผ่าน `POST /api/timetable/entries` ด้วย CS111 030001 (e1), MA211 020001 (e2), TU101 900001 (e3) ซึ่งเวลาไม่ชนกัน แล้วอ่าน `entry_id` กลับจาก DB
- ก่อนลบ ตั้ง `updated_at` ของตารางเป็น `2000-01-01T00:00:00+07:00` เพราะ `touch()` ตัดเวลาเหลือหลักวินาที ถ้าเพิ่มแล้วลบในวินาทีเดียวกันค่าจะเท่าเดิม เคสสำเร็จตรวจว่าค่าหลังลบใหม่กว่า เคสที่ล้มเหลวตรวจว่ายังเท่าเดิม
- ลบตารางของทั้งสองบัญชีทั้งก่อนและหลังทุกเคส (`timetable_entry` ลบตามด้วย `ON DELETE CASCADE`) ลำดับการรันเคสจึงไม่มีผล
- ผลรันอยู่ใน [`US2-T18-mvnw-cli.txt`](./US2-T18-mvnw-cli.txt)

```bash
# ต้องเปิด Docker ไว้ ไม่ต้อง docker compose up
cd backend
./mvnw test -Dtest=TimetableDeleteApiDaoIntegrationTest
```

| ID | Pre-condition | Request | สิ่งที่ตรวจ | ผล |
| --- | --- | --- | --- | --- |
| IT-01 | ตาราง 1/2568 มี e1, e2, e3 | `DELETE /api/timetable/entries/{e1}` | `200` · `academicYear: 2568`, `semester: 1` · `entries` 2 รายการ ไม่มี e1 · `totalCredits: 6` · `updatedAt` ไม่ว่าง · DB: เหลือ e2, e3 · `timetable` ยัง 1 แถว · `updated_at` ใหม่กว่าค่าก่อนลบ · จำนวนแถว `section` เท่าเดิม | PASS |
| IT-02 | ตาราง 1/2568 มี e1, e2, e3 | `DELETE /api/timetable/entries?entryIds=e1,e2` | `200` · `entries` 1 รายการคือ e3 (TU101) · `totalCredits: 3` · DB: เหลือ e3 · `timetable` ยัง 1 แถว · `updated_at` ใหม่กว่าค่าก่อนลบ · จำนวนแถว `section` เท่าเดิม | PASS |
| IT-03 | ตาราง 1/2568 มี e1, e2, e3 | `DELETE /api/timetable/entries?entryIds=e1,e2,e3` | `200` · `entries: []`, `conflicts: []`, `totalCredits: 0` · `updatedAt` ไม่ว่าง · DB: `timetable_entry` 0 แถว · `timetable` ยัง 1 แถว · `updated_at` ใหม่กว่าค่าก่อนลบ · จำนวนแถว `section` เท่าเดิม | PASS |
| IT-04 | ตาราง 1/2568 มี e1, e2, e3 · `6609000098` มี CS111 030001 (eB) | (ก) `DELETE /entries/{MAX(entry_id) + 1000}` (ข) `DELETE /entries/{eB}` (ค) `?entryIds=e1,eB` | `404` ProblemDetail ทั้ง 3 request `detail: "ไม่พบวิชาในตารางเรียนของคุณ: entryId <id>"` โดย (ค) บอกแค่ eB · DB: ยังมี e1, e2, e3 และ eB ครบ · `updated_at` ไม่เปลี่ยน | PASS |
| IT-05 | ตาราง 1/2568 มี e1, e2, e3 | (ก) `?entryIds=` (ข) `?entryIds=abc` (ค) `?entryIds=e1,abc` | `400` ทั้ง 3 request · DB: ยังมี e1, e2, e3 ครบ · `updated_at` ไม่เปลี่ยน | PASS |
| IT-06 | ตาราง 1/2568 มี e1, e2, e3 และตาราง 2/2568 มี CS111 030001 (e4) | `DELETE /api/timetable/entries?entryIds=e1,e4` | `400` ProblemDetail `status: 400`, `detail: "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)"` · DB: ยังมี e1–e4 ครบ · `timetable` 2 แถว · `updated_at` ของทั้งสองตารางไม่เปลี่ยน | PASS |

```
[INFO] Running th.ac.tu.cs261.group3.backend.timetable.TimetableDeleteApiDaoIntegrationTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 34.85 s -- in th.ac.tu.cs261.group3.backend.timetable.TimetableDeleteApiDaoIntegrationTest
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] BUILD SUCCESS
```

> เวลา 35 วินาทีส่วนใหญ่เป็นการเปิด SQL Server container (17.9 วินาที) และ Spring context เมื่อรันรวมกับ `./mvnw test` ทั้งหมด class นี้ใช้ container และ context ร่วมกับ class อื่นจึงใช้เวลาแค่ 12.2 วินาที

## การจับคู่กับ US2-T14 และ UAT (US2-T16)

| Integration Test Case | UAT | ทดสอบด้วย | ผล |
| --- | --- | --- | --- |
| IT-01 | UAT-US2-01 | JUnit | PASS |
| IT-02 | UAT-US2-02 | JUnit | PASS |
| IT-03 | UAT-US2-03 | JUnit | PASS |
| IT-04 | - | JUnit | PASS |
| IT-05 | - | JUnit | PASS |
| IT-06 | - | JUnit | PASS |

UAT-US2-04 (ปุ่มลบถูกปิดเมื่อตารางว่าง) เป็นพฤติกรรมฝั่ง UI ไม่มีเคสที่ตรงกันใน T14

## ส่วนที่ปรับจาก US2-T14

| ในเอกสาร T14 | ที่ทดสอบจริง | เหตุผล |
| --- | --- | --- |
| `entryId` 101, 102, 103 | e1, e2, e3 ที่อ่านจาก DB หลัง POST | `entry_id` เป็น IDENTITY กำหนดค่าตายตัวไม่ได้ |
| นักศึกษา `std68001` | `6609000097` | รหัสนักศึกษาในระบบมี 10 หลัก |
| IT-04 `entryId = 999` และ `201` | `MAX(entry_id) + 1000` และ entry จริงของ `6609000098` | ให้แน่ใจว่า id ไม่มีอยู่จริง และ entry ของอีกคนมีอยู่จริงใน DB |
| IT-04 "All-or-Nothing" | เพิ่ม request (ค) ส่ง e1 ปนกับ eB | ถ้าส่ง id ผิดตัวเดียวจะพิสูจน์ไม่ได้ว่าไม่มีการลบไปครึ่งเดียว |
| IT-05 "ไม่มีคำสั่งลบส่งไป DAO" | ตรวจว่าแถวใน DB และ `updated_at` ไม่เปลี่ยน | ใช้ repository จริงจึงนับการเรียกไม่ได้ |
| IT-05 รูปแบบ ID ไม่ถูกต้อง | เพิ่ม `e1,abc` | ตรวจว่า id ถูกที่ปนมาก็ไม่ถูกลบ |
| IT-06 คนละปีหรือคนละภาค | คนละภาค (1/2568 กับ 2/2568) | seed มีแค่ปี 2568 แต่มีทั้ง 2 ภาค |

## ข้อสังเกต

**IT-02 ตรวจ `findAllById` / `deleteAll` จากผลใน DB** เอกสาร T14 ระบุว่า API เรียก `TimetableEntryRepository.findAllById` และ `deleteAll` ใน transaction เดียวกัน test นี้ใช้ repository จริงจึงนับการเรียกไม่ได้ ตรวจได้แค่ว่า e1 และ e2 หายไปพร้อมกันและ e3 ยังอยู่ ส่วนการเรียก method ตรวจแบบ mock อยู่ใน `TimetableDeleteServiceTest` และพฤติกรรมของ DAO อยู่ใน `TimetableEntryDeleteRepositoryTest` (US2-T12)

**entry ของคนอื่นตอบ `404` เหมือน id ที่ไม่มีอยู่จริง** (IT-04 (ข)) ตรงกับ T14 และไม่บอกเป็นนัยว่า id นั้นมีอยู่ในระบบ

**ลบจนตารางว่างแล้ว `updatedAt` ไม่เป็น `null`** (IT-03) เพราะแถว `timetable` ไม่ถูกลบ จึงต่างจากตารางที่ยังไม่เคยเพิ่มวิชาซึ่งตอบ `updatedAt: null` ตรงตาม T14

## ข้อจำกัด

- ไม่ผ่าน login จริง ใช้ JWT ที่สร้างจาก `JwtService` ตัวเดียวกับที่ backend ใช้ จึงยืนยันว่า token ผ่าน `JwtAuthenticationFilter` และ studentId ไปถึง service ได้ แต่ไม่ได้ทดสอบ `POST /api/auth/login` (อยู่ใน US3)
- เตรียมข้อมูลผ่าน `POST /api/timetable/entries` ของ US1 ถ้า endpoint นั้นพัง เคสทั้งหมดจะล้มที่ขั้นเตรียมข้อมูลก่อนถึงการลบ
- DB เป็น SQL Server ใน container ที่สร้างใหม่ทุกครั้ง ไม่ใช่ DB ของ `docker compose` ข้อมูลใน DB ที่ใช้พัฒนาจึงไม่มีผลต่อผลทดสอบ
- ต้องเปิด Docker ไว้ก่อนรัน ถ้าไม่เปิด Testcontainers จะเปิด container ไม่ได้และเทสต์ทั้ง class จะ error
