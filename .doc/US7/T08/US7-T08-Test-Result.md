# US7-T08 — ผลทดสอบ API และ DTO

- วันที่ทดสอบ: 17 พฤศจิกายน 2026
- Branch: `feature/US7-T08-develop-api-dto`
- Base: `develop` รุ่น `8ef260e`
- Runtime: JDK 21.0.12; Spring Boot 4.1.1 ตาม pom.xml
- อ้างอิง: [T05](../T05/US7-DTO-API-Spec.md), [T06 Search](../T06/US7-T06-Sequence-Diagram-Search.md), [T06 Detail](../T06/US7-T06-Sequence-Diagram-Detail.md)

## ขอบเขตของผลทดสอบ

พัฒนา T08 ก่อน T09 ตามลำดับงาน จึงยังไม่เพิ่ม schema, Entity หรือ query ของโควตา ใช้ QuotaDataReader เป็นขอบเขตอ่านข้อมูลให้ T09 implement ภายหลัง โค้ด production ไม่ใส่ข้อมูลตัวอย่าง เมื่อไม่มี reader จะตอบ 503 สำหรับคำขอที่ต้องอ่านข้อมูล

Unit tests ของ T08 ใช้ Mockito และ MockMvc ส่วน Postman ใช้ HTTP server ที่เปิดเฉพาะ Controller/Service/DTO/validation/JWT จริง โดยมีข้อมูลอ่านจาก test fixtures และ mocked timetable repositories ไม่มีฐานข้อมูล ไม่มี TU API และไม่ใช่ผลยืนยัน JPQL หรือ migration ของ T09

## ผลสรุป

| การตรวจ | คำสั่งจาก backend | ผลจริง |
|---|---|---|
| US7 unit/API tests | `./mvnw.cmd '-Dtest=Quota*Test' test` | PASS: 58 tests, 0 failures, 0 errors |
| Backend ตาม CI | `./mvnw.cmd -B test '-Dtest=!BackendApplicationTests'` | PASS: 425 tests, 0 failures, 0 errors |
| Backend ไม่ข้าม test | `./mvnw.cmd test` | FAIL: 426 tests, 0 failures, 1 error — contextLoads เดิมต่อ SQL Server localhost:1433 ไม่ได้ |
| Postman ผ่าน Newman 6 | Collection ของ T08 กับ test server localhost:18087 | PASS: 35 requests, 89 assertions, 0 failed |
| Frontend lint | `npm run lint` จาก frontend | PASS |
| Frontend TypeScript | `npx tsc --noEmit` จาก frontend | PASS |
| PowerShell launcher | Parse syntax และเปิด server ผ่าน Start-PostmanTestServer.ps1 จริง | PASS |

58 tests ของ US7 รวมอยู่ในยอด 425 ของชุด CI แล้ว ไม่ใช่ยอดที่ต้องบวกเพิ่ม

การรันทั้งโปรเจกต์ใช้ Docker และ SQL Server Testcontainers สำหรับ DAO tests เดิม ซึ่งผ่านในชุด CI แต่ BackendApplicationTests.contextLoads ไม่ได้ import TestcontainersConfig และยังใช้ DB localhost:1433 โดยตรง ทาง `.github/workflows/ci.yml` ข้าม test นี้อยู่แล้ว งานนี้ไม่แก้หรือลบ test เดิมเพื่อทำให้ผลเป็น PASS

## Unit/API tests ที่เพิ่ม

| คลาส | จำนวน | สิ่งที่ตรวจ |
|---|---:|---|
| QuotaControllerTest | 24 | JSON, null fields, HH:mm, รายการว่าง, 400/404/503, missing/invalid query parameters, q ยาว 50/51 และ semester นอกช่วง |
| QuotaServiceTest | 26 | normalize query/code, mine, ตารางว่าง, total/limit, ลำดับสถานะ, หลายช่องทาง, ไม่มีรอบ, reader ยังไม่พร้อม และข้อมูลจาก reader ไม่ครบ |
| QuotaSecurityTest | 5 | JWT filter จริง, ไม่มี token ทั้งสอง endpoint, ลายเซ็นผิด, studentId จาก JWT และ query ของผู้เรียกเปลี่ยนเจ้าของตารางไม่ได้ |
| QuotaAvailabilityTest | 3 | Controller + Service จริงขณะไม่มี reader: start context ได้, search/detail ตอบ 503, คำค้นไม่ครบยังตอบ 400 โดยไม่อ่าน repository |

รายละเอียดของกฎที่ตรวจ:

- ค้นหาไม่พบ: 200 พร้อม total 0 และ courses []
- วิชารายตัวไม่อยู่ในระบบ: 404 ก่อนอ่านตารางหรือข้อมูลโควตา
- วิชาเปิดสอนแต่ไม่มี quota info: 200 NO_DATA ไม่ใช่ 404
- NOT_OFFERED มีลำดับก่อน NO_DATA/NOT_REQUIRED/REQUIRED และ offeredSemesters ว่างได้
- รายการรายละเอียดของสถานะที่ไม่ใช่ REQUIRED เป็น [] แม้ตัวอ่านข้อมูลจะส่งรายละเอียดมา
- REQUIRED มีหลายช่องทางและ url เป็น null ได้ รวมกรณียังไม่มีรอบประกาศ
- mine=true ใช้รหัสวิชาในตารางของปี/ภาคและผู้ใช้ปัจจุบัน รหัสซ้ำถูกตัดออก และใช้ AND กับ q
- mine=false ยังแสดง inMyTimetable ได้
- total นับก่อนตัดผลลัพธ์; ตั้ง limit 2 คืน 2 จาก 3 และค่า default 50 คืน 50 จาก 55
- อ่านรายละเอียดเป็น batch เฉพาะวิชาที่อยู่ในผลหลังตัด limit; unit test ตรวจการเรียก reader ไม่ใช่จำนวน SQL จริง
- เก็บค่า null ใน JSON ตาม contract และ endTime เป็น HH:mm

## Postman

- [Collection ที่ export](./US7-T08.postman_collection.json)
- [ผล Newman แบบ JUnit XML](./US7-T08-postman-results.xml)
- [วิธีเปิด test server และรันซ้ำ](./README.md#รัน-postman-ก่อน-t09-โดยไม่ใช้-db)

ใช้ server จาก QuotaPostmanApplication ใน src/test/java ซึ่งเป็น TestConfiguration เพื่อไม่ปะปนกับ component scan ของแอปจริง และไม่ถูกบรรจุใน production WAR ทดสอบซ้ำผ่าน PowerShell launcher ที่ส่งมอบแล้ว

| Requests | หัวข้อ | ผล |
|---|---|---|
| 01–05 | REQUIRED ครบข้อมูล, prefix/case, English word prefix, ภาษาไทย และ strip query | PASS |
| 06–08 | ค้นหาไม่พบ 200, อ่านไม่พบ 404, code ตัวพิมพ์เล็ก | PASS |
| 09–13 | NO_DATA, NOT_REQUIRED, NOT_OFFERED, ไม่เปิดทั้งปี, REQUIRED ไม่มีรอบ | PASS |
| 14–18 | mine, q AND mine, inMyTimetable, ตารางว่างต่างภาค และแยกข้อมูลนักศึกษา 2 คน | PASS |
| 19 | total 55 แต่คืน 50 วิชา เรียง courseCode | PASS |
| 20–30 | ไม่มีคำค้น, blank, q 51/50 ตัว, missing/wrong-type parameters และ semester ผิดค่า | PASS |
| 31–32 | ไม่มี JWT และ JWT ไม่ถูกต้อง | PASS |
| 33–35 | คำค้น % _ [ ไม่กลายเป็น wildcard ใน test fixture reader | PASS เฉพาะ test fixture ไม่ใช่ SQL escaping |

Collection ไม่มี token หรือรหัสผ่านอยู่ภายใน Token ที่ใช้รันสร้างจาก secret เฉพาะ test server และเก็บเฉพาะ backend/target ซึ่งไม่ส่งขึ้น Git ผล XML ไม่มี Authorization header หรือ JWT

## เกณฑ์ตรวจรับที่ยังต้องทำต่อ

- T09: implement QuotaDataReader ด้วย Entity/Repository และ schema/seed ตาม T06 พร้อมตรวจ SQL จริงตาม T12
- ข้อสรุปที่เก็บชื่อไทยให้ US6 และ US7 ใช้ร่วมกันตามรายการส่งต่อใน README ของ T08
- ทดสอบ Collection/flow อีกครั้งกับ backend และฐานข้อมูลจริงหลัง T09 พร้อม ข้อมูล fixture ใน Collection ต้องตรงกับ seed จริงก่อนอ้างผล integration
- ทดสอบ contextLoads เดิมเมื่อมีฐานข้อมูล appdb ที่ localhost:1433 หรือปรับ test setup เป็นงานแยกตามที่ทีมตกลง
- PR review และ CI หลังได้รับอนุญาตให้ commit/push

งานนี้ไม่ได้เปลี่ยน security policy, GlobalExceptionHandler, migration เดิม หรือ UI หน้า quota มีเฉพาะ types ฝั่ง frontend เพื่อให้ตรงกับ DTO
