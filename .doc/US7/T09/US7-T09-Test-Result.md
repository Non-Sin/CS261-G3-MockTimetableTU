# US7-T09 — รายงานผลทดสอบ DAO และการเชื่อม API

วันที่ทดสอบ: 17 พฤศจิกายน 2026 (Asia/Bangkok)

## ผลรวม

| ชุดทดสอบใหม่ | จำนวนที่รัน | ผล |
|---|---:|---|
| QuotaRepositoryTest — T12 เคส 01–21 และ regression แถวคูณจาก fetch 3 collections | 22 | ผ่าน |
| QuotaSchemaConstraintTest — T12 เคส 22–28 (บางเคส parameterized) | 10 | ผ่าน |
| JpaQuotaDataReaderTest — การเชื่อม T08, ค่า NULL, ลำดับ และจำนวน SQL | 5 | ผ่าน |
| QuotaMigrationTest — fresh install และ upgrade จากฐานเดิม | 2 | ผ่าน |
| QuotaApiDaoIntegrationTest — JWT ถึง SQL Server จริง พร้อม seed | 9 | ผ่าน |
| **รวม tests ใหม่ของ T09** | **48** | **ผ่านทั้งหมด** |

28 เคสใน T12 ถูกทดสอบครบ โดยเคส 24, 26 และ 27 แยกข้อมูลผิดแต่ละแบบเป็นคนละ transaction จึงได้ 31 invocations; เพิ่ม regression fetch แถวคูณอีก 1 รายการเป็น DAO ทั้งหมด 32 รายการ ส่วน adapter/migration/API อีก 16 รายการตรวจการใช้งานร่วมกัน

Backend suite ตามคำสั่ง CI: **473 tests, 0 failures, 0 errors, 0 skipped** รวม tests เดิมของ US1/US6/US7/US8 และ T09 ใหม่ ไม่ใช่ผลจาก mock-only suite

Frontend `npm run lint` และ `npx tsc --noEmit`: ผ่าน ไม่มีการแก้โค้ด frontend หรือ JSON contract

## สภาพแวดล้อมและวิธีรัน

- Windows PowerShell, JDK 21.0.12, Maven Wrapper
- Docker Desktop + `mcr.microsoft.com/mssql/server:2025-latest`
- DAO ใช้ `@DaoTest` รัน Flyway เฉพาะ db/migration; QuotaFixture ใช้รหัส Q7 ไม่พึ่ง dev seed และ flush/clear ก่อน query
- Migration tests สร้างฐานข้อมูลเฉพาะใน container; API integration ใช้ Spring Boot context จริง, MockMvc, JWT และ db/migration + db/seed
- ไม่เชื่อมฐาน localhost:1433 ของผู้พัฒนา ไม่เรียก TU Login API และไม่บันทึก token ลงเอกสาร

คำสั่งตรวจใหม่เฉพาะ T09:

```powershell
./mvnw.cmd -B test '-Dtest=QuotaRepositoryTest,QuotaSchemaConstraintTest,JpaQuotaDataReaderTest,QuotaMigrationTest,QuotaApiDaoIntegrationTest'
```

คำสั่งสุดท้ายที่ยืนยันทุก backend test ตาม CI:

```powershell
./mvnw.cmd -B test '-Dtest=!BackendApplicationTests'
```

`BackendApplicationTests` ถูก exclude ตาม workflow เดิมของโปรเจกต์ เพราะต้องมี SQL Server ภายนอก ชุดที่รายงานไม่ได้รัน smoke test นี้ และไม่ได้อ้างว่า plain `./mvnw test` ผ่าน

## การอ้างอิง US7-T12

| TC ID | สิ่งที่ตรวจจริง | หลักฐานใน test |
|---|---|---|
| 01–04 | code prefix ไม่สนตัวพิมพ์, คำหลัง hyphen, ค้นไทย, AND กับชุดรหัส | QuotaRepositoryTest: searchAllCourses_lowercaseCode / notOfferedAndWordAfterHyphen / thaiSubstring / queryAndCodes |
| 05–09 | wildcard เป็น literal, ขอบเขตคำ, q=NULL/ว่าง, query ที่ไม่พบ, ชุดรหัสว่าง, Optional.empty | QuotaRepositoryTest: likeWildcards / noQuery / unknownQuery / emptyCodes / findById_unknownCode |
| 10–12 | ภาคที่เปิดสอน DISTINCT และเรียง, กรองปี, ชุดว่าง | QuotaRepositoryTest: findOfferedSemestersByCourseCodesAndYear_* |
| 13–17 | fetch ทุก collection, ไม่ซ้ำ, ลำดับ sortOrder, nullable fields, false ต่างจากไม่มี info | QuotaRepositoryTest: findWithDetailsByCourseCodes_* |
| 18–21 | กรองรอบด้วยปี/ภาค, roundNo, เวลา 09:00–16:00, deadline ที่ไม่มี start, ชุดว่าง | QuotaRepositoryTest: findByCourseCodesAndTerm_* |
| 22 | courseNameTh=NULL และชื่อไทย round-trip ผ่าน SQL Server | QuotaSchemaConstraintTest: saveAndFlush_nullableThaiName_roundTripsUnicode |
| 23 | quota info อ้างวิชาที่ไม่มีไม่ได้ | insertInfo_unknownCourse_violatesForeignKey |
| 24 | channel/contact URL ที่เป็น http ถูกปฏิเสธทั้ง 2 ตาราง | insertLink_insecureUrl_violatesHttpsConstraint (2 invocations) |
| 25 | channelType ที่ไม่อยู่ใน enum ถูกปฏิเสธจาก DB | insertChannel_unknownType_violatesEnumConstraint |
| 26 | semester=3 และ endDate ก่อน startDate ถูกปฏิเสธ | insertRound_invalidTermOrDates_violatesCheck (2 invocations) |
| 27 | sortOrder ของ channel และเลขรอบในปี/ภาคเดียวกันซ้ำไม่ได้ | insertDuplicate_channelOrderOrRound_violatesUnique (2 invocations) |
| 28 | native DELETE info ลบลูกทั้ง 4 ตารางจริง และคง course/ข้อมูลวิชาอื่น | deleteInfo_nativeDelete_cascadesAllChildrenAndKeepsCourse |

Schema tests ตรวจชื่อ constraint ที่เกี่ยวข้องด้วย Hibernate รุ่นที่ใช้โยน `ConstraintViolationException` โดยตรง ซึ่งเป็น subclass ของ `PersistenceException` จึงตรวจชนิด exception เองและชื่อ constraint ไม่สมมติว่าต้องห่ออยู่ใน cause อีกชั้น

Regression เพิ่มเติม: ใส่ 2 conditions × 2 channels × 2 contacts (8 แถว SQL) แล้วต้องได้แต่ละ Set เพียง 2 รายการเรียง 1,2 และอ่านต่อได้หลัง `em.clear()`

## ผลที่ยืนยันจากฐานข้อมูลจริง

1. **ไม่เกิด N+1 ใน adapter:** loadDetails ของ 5 วิชาใช้ prepared statements 3 ครั้ง, entityFetchCount=0 และ collectionFetchCount=0; input ว่างใช้ 0 query
2. **คงความหมายข้อมูล:** missing info เป็น quotaRequired=NULL ต่างจาก false; map มี key ครบทุก code ที่ขอ; ลำดับ channels/conditions/rounds ตรงสเปก
3. **Fresh install:** Flyway รัน migration และ seed เดิมร่วมกับไฟล์ใหม่ได้ ชื่อไทย US6 ครบอย่างน้อย 18 วิชา; migrate ซ้ำไม่มีไฟล์ต้องรัน และ validate ผ่าน
4. **Upgrade:** รันถึงเวอร์ชัน 20261116.1734 ก่อน เพิ่มชื่อไทย/ตารางเรียนทดสอบไว้ แล้วอัปเกรดด้วย 2 ไฟล์ใหม่ ชื่อไทยเดิมและ timetable_entry ยังอยู่ และ Flyway validate ผ่าน
5. **API จริง:** ตรวจ REQUIRED หลายช่องทาง, endTime=15:00, NOT_REQUIRED, NO_DATA, NOT_OFFERED, ค้นไทย, ผลว่าง/404, mine อิง JWT และไม่แก้ตารางเรียน, 401 เมื่อไม่มี token

## ข้อจำกัดและสิ่งที่ยังต้องทำภายหลัง

- ชื่อไทยเดิมใน `elective_info` ยังอยู่เพื่อรองรับ US6 ที่ merge แล้ว การ backfill ครั้งนี้ไม่ได้ sync การแก้ชื่อในอนาคต และยังไม่ใช่การย้าย US6 ไปใช้ source เดียวอย่างสมบูรณ์ตามเป้าหมาย T06
- Seed เป็นข้อมูลสาธิตปี 2568 ไม่ใช่ประกาศโควตาปัจจุบัน
- การทดสอบ API กับ DB รอบนี้ใช้ MockMvc ใน Spring Boot จริง ไม่ใช่ Postman/Newman; collection และ test server ของ T08 ยังใช้ fixture-only
- ยังไม่ได้ commit/push/เปิด PR ของ T09 หรือรับ PR review/CI บน GitHub

ผลแบบ JUnit XML อยู่ใน `backend/target/surefire-reports/` และ log การรันรวมอยู่ใน `backend/target/us7-t09-ci.log` (generated files ที่ถูก ignore ไม่เพิ่มเข้า Git)
