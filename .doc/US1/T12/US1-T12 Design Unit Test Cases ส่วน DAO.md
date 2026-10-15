# US1-T12 Design Unit Test Cases ส่วน DAO

Oct 14, 2026 · @Non

## ขอบเขต

ออกแบบ unit test 21 กรณีของ repository 4 ตัวตาม [US1-T06 DAO Class Diagram](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T06/US1-T06-DAO-Class-Diagram.md) ใช้เป็น spec ตอนเขียน test ใน US1-T09 ยังไม่ได้รันจริงเพราะยังไม่มีโค้ด DAO

**User story:** US1 เพิ่มวิชาที่ต้องการลงในตารางเรียนจำลอง · การ์ด [US1-T12](https://trello.com/c/Thg64MRX) · branch `docs/US1-T12-design-unit-test-dao`

| Repository | Method ที่ทดสอบ | Test case |
| --- | --- | --- |
| `CourseRepository` | `search(academicYear, semester, q, category)` | UT-DAO-01 – 05 |
| `SectionRepository` | `findById(sectionId)` | UT-DAO-06 – 07 |
| `TimetableRepository` | `findByStudentIdAndAcademicYearAndSemester`, `save` | UT-DAO-08 – 11 |
| `TimetableEntryRepository` | `findByTimetableId`, `save` | UT-DAO-12 – 16 |
| Schema (Flyway + constraint) | — | UT-DAO-17 – 21 |

การ์ดระบุ "ค้นหาวิชาที่เวลาชน" และ "รวมหน่วยกิต" แต่ T06 ให้ `findConflicts` และ `checkCreditLimit` คำนวณใน `TimetableService` จากข้อมูลในหน่วยความจำ ไม่ใช่ query ใน DB เอกสารนี้จึงทดสอบว่า DAO คืนข้อมูลที่สอง method นี้ใช้ได้ครบและตรง (UT-DAO-15, 16) ส่วนตรรกะเวลาชนและหน่วยกิตเป็น unit test ของ service

นอกขอบเขต: การลบวิชา (US2-T12), controller และ UI

## Test Approach

ใช้ `@DataJpaTest` กับ SQL Server จริงผ่าน Testcontainers และให้ Flyway สร้าง schema เหมือน production เพราะ migration ใช้ syntax ของ SQL Server (`IDENTITY`, `NVARCHAR`) และหลายกรณีพึ่ง unique constraint, ภาษาไทย และชนิด `time` ซึ่ง H2 จำลองไม่ตรง

| หัวข้อ | ข้อกำหนด |
| --- | --- |
| Annotation | `@DataJpaTest` + `@AutoConfigureTestDatabase(replace = NONE)` + `@Import(TestcontainersConfig.class)` |
| Database | `MSSQLServerContainer` image `mcr.microsoft.com/mssql/server:2025-latest` (ตัวเดียวกับ `compose.yaml`) ประกาศเป็น `@Bean @ServiceConnection` ใน `TestcontainersConfig` ทุก test class จึงใช้ container ตัวเดียวกันผ่าน context cache |
| Schema | Flyway รัน migration ทุกไฟล์ แล้ว Hibernate `validate` ตาม `application.yaml` |
| Transaction | แต่ละ test rollback เอง (ค่า default ของ `@DataJpaTest`) ไม่ต้องลบข้อมูล |
| Fixture | สร้างด้วย `TestEntityManager.persist` ใน `@BeforeEach` แล้ว `flush()` + `clear()` ก่อนเรียก repository ให้ query ไปที่ DB จริง ไม่ได้ค่าจาก first-level cache |
| Exception | กรณีที่คาดว่า throw ต้องเป็นขั้นสุดท้ายของ test เพราะ session ใช้ต่อไม่ได้หลัง constraint ล้ม |
| ชื่อ method | `<method>_<เงื่อนไข>_<ผลที่คาดหวัง>` แบบ `ItemControllerTest` เช่น `findById_notFound_returnsEmpty` |
| ไฟล์ test | package เดียวกับ repository เช่น `src/test/java/.../timetable/TimetableEntryRepositoryTest.java` |
| CI | runner ของ GitHub Actions มี Docker จึงรันใน `./mvnw test` ได้ ไม่ต้องข้ามแบบ `BackendApplicationTests` |

Dependency ที่ต้องเพิ่ม (scope `test`, version ตาม Spring Boot BOM): `org.springframework.boot:spring-boot-testcontainers`, `org.testcontainers:testcontainers-junit-jupiter` และ `org.testcontainers:testcontainers-mssqlserver` ([Testcontainers docs](https://java.testcontainers.org/modules/databases/mssqlserver)) `pom.xml` เป็นไฟล์ร่วม ต้องบอกกลุ่มและแยก PR ตาม CONTRIBUTING

```java
@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {
    @Bean
    @ServiceConnection
    MSSQLServerContainer sqlServer() {
        return new MSSQLServerContainer("mcr.microsoft.com/mssql/server:2025-latest")
                .acceptLicense();
    }
}

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfig.class)
class TimetableEntryRepositoryTest {

    @Autowired TestEntityManager em;
    @Autowired TimetableEntryRepository repository;

    @BeforeEach
    void setUp() {
        // persist fixture ตามหัวข้อ Test Data
        em.flush();
        em.clear();
    }
}
```

Spring Boot 4 ย้าย package ของ test annotation (เช่น `@WebMvcTest` ใน `ItemControllerTest`) ให้ import ตามที่ IDE เสนอ

## Test Data

ทุก test case ใช้ fixture ชุดนี้ใน `@BeforeEach` เว้นแต่ระบุเพิ่ม ข้อมูลหลักมาจาก Figma frame 1:1057 และ API Spec ของ US1-T05 แล้วเติมกรณีขอบ: คาบต่อกันพอดี, ข้ามภาค และหน่วยกิตที่ไม่ใช่ 3

**กลุ่มเรียน** (1 แถว = 1 section)

| Key | วิชา | ชื่อวิชา | หมวด | หน่วยกิต | Sec | ปี/ภาค | คาบเรียน |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | CS111 | OBJECT-ORIENTED CONCEPTS | MAJOR | 3 | 030001 | 2568/1 | TUE 11:00–12:30, THU 11:00–12:30 ห้อง LC3-121 |
| S2 | CS111 | 〃 | 〃 | 〃 | 030002 | 2568/1 | TUE 13:30–15:00, THU 13:30–15:00 |
| S3 | MA211 | CALCULUS 1 | MAJOR | 3 | 010001 | 2568/1 | TUE 09:30–11:00, THU 09:30–11:00 |
| S4 | TU109 | INNOVATION AND ENTREPRENEURIAL MINDSET | GENERAL\_EDUCATION | 3 | 780001 | 2568/1 | WED 09:30–12:30 ห้อง SC3-413 |
| S5 | LAS101 | CRITICAL THINKING, READING, AND WRITING | GENERAL\_EDUCATION | 3 | 780004 | 2568/1 | WED 09:30–12:30 ห้อง SC-1026 |
| S6 | FE001 (สมมติ) | การถ่ายภาพเบื้องต้น | FREE\_ELECTIVE | 2 | 900001 | 2568/1 | FRI 13:00–16:00 |
| S7 | CS111 | 〃 | 〃 | 〃 | 030001 | 2568/2 | MON 09:30–11:00 |
| S8 | CS213 | DATA STRUCTURES | MAJOR | 3 | 040001 | 2568/2 | WED 13:30–16:30 |

อาจารย์ของ S1 คือ "ผศ.ดร.ทรงศักดิ์ รองวิริยะพานิช" ใช้ตรวจข้อความภาษาไทยใน UT-DAO-06 ส่วน section อื่นใส่ชื่อใดก็ได้

**ตารางเรียน**

| Key | studentId | ปี/ภาค | วิชาในตาราง | หน่วยกิตรวม |
| --- | --- | --- | --- | --- |
| T1 | 6609000000 (demo) | 2568/1 | S1 CS111, S4 TU109, S5 LAS101 | 9 |
| T2 | 6609000001 | 2568/1 | S3 MA211 | 3 |
| T3 | 6609000000 | 2568/2 | S7 CS111 | 3 |
| T4 | 6609000003 | 2568/1 | ไม่มี (เช่น หลังลบทุกวิชาใน US2) | 0 |

นักศึกษา 6609000002 ยังไม่มีตารางเลย ทุกตารางมี `updatedAt` = 2026-10-13T11:20:05+07:00

คู่ที่ตั้งใจไว้: S4 กับ S5 ซ้อนกันพอดี (เวลาชน TC5) · S3 จบ 11:00 ตรงกับที่ S1 เริ่ม (ต่อกัน ไม่ชน) · S1 มี 2 คาบ (ตรวจแถวซ้ำจาก join) · S1 กับ S7 ใช้ Sec 030001 คนละภาค

Id ทุกตัวเป็น `IDENTITY` ให้ test เก็บ id ที่ได้หลัง `persist` ไว้ใช้ ห้าม hard-code ตัวเลข

## Test Cases: CourseRepository.search

ใช้กับ `GET /api/courses` กติกาตาม API Spec: `q` ตรงกับรหัสวิชาที่ขึ้นต้นด้วย `q` หรือชื่อวิชาที่มี `q` ไม่สนตัวพิมพ์ และผลเรียงตาม `courseCode`

### &#91;UT-DAO-01\] ค้นด้วยปีและภาคอย่างเดียว ได้ทุกวิชาที่เปิดในภาคนั้น

**Related CoS:** Test case 1 · **Test method:** `search_byTermOnly_returnsOfferedCoursesSortedByCode`

**Test Steps:**

1. เรียก `search(2568, 1, null, null)`
2. เรียก `search(2568, 1, "", null)`

**Expected Result:**

- ทั้งสองครั้งได้ CS111, FE001, LAS101, MA211, TU109 ตามลำดับนี้
- CS111 ปรากฏครั้งเดียว แม้มี 2 กลุ่มเรียนและ 4 คาบในภาคนี้
- ไม่มี CS213 ซึ่งเปิดเฉพาะ 2568/2

### &#91;UT-DAO-02\] q ตรงกับรหัสวิชาแบบขึ้นต้น ไม่สนตัวพิมพ์

**Related CoS:** Test case 1 · **Test method:** `search_codePrefixIgnoreCase_returnsMatchingCourses`

**Test Steps:**

1. เรียก `search(2568, 1, "cs1", null)`
2. เรียก `search(2568, 1, "S11", null)`

**Expected Result:**

- ข้อ 1 ได้ \[CS111\]
- ข้อ 2 ได้ list ว่าง เพราะรหัสต้องขึ้นต้นด้วย `q` ไม่ใช่มี `q` อยู่กลางรหัส

### &#91;UT-DAO-03\] q ตรงกับบางส่วนของชื่อวิชา ไม่สนตัวพิมพ์ รวมภาษาไทย

**Related CoS:** Test case 1 · **Test method:** `search_nameContainsIgnoreCase_returnsMatchingCourses`

**Test Steps:**

1. เรียก `search(2568, 1, "thinking", null)`
2. เรียก `search(2568, 1, "ถ่ายภาพ", null)`

**Expected Result:**

- ข้อ 1 ได้ \[LAS101\]
- ข้อ 2 ได้ \[FE001\] ยืนยันว่า parameter ภาษาไทยส่งเป็น `NVARCHAR` ไม่กลายเป็น `?`

### &#91;UT-DAO-04\] กรองตามหมวดวิชา และใช้ร่วมกับ q แบบ AND

**Related CoS:** Test case 1 · **Test method:** `search_byCategory_returnsOnlyThatCategory`

**Test Steps:**

1. เรียก `search(2568, 1, null, GENERAL_EDUCATION)`
2. เรียก `search(2568, 1, null, FREE_ELECTIVE)`
3. เรียก `search(2568, 1, "cs", GENERAL_EDUCATION)`

**Expected Result:**

- ข้อ 1 ได้ \[LAS101, TU109\]
- ข้อ 2 ได้ \[FE001\]
- ข้อ 3 ได้ list ว่าง เพราะ CS111 ไม่ใช่หมวดศึกษาทั่วไป

### &#91;UT-DAO-05\] อักขระพิเศษของ LIKE ใน q ถูกค้นตามตัวอักษร

**Related CoS:** Test case 1 · **Test method:** `search_likeWildcardInQuery_isTreatedLiterally`

**Test Steps:**

1. เรียก `search(2568, 1, "_S1", null)`
2. เรียก `search(2568, 1, "%", null)`

**Expected Result:**

- ทั้งสองครั้งได้ list ว่าง
- ถ้าไม่ escape จะได้ CS111 ในข้อ 1 และได้ทุกวิชาในข้อ 2 · derived query แบบ `StartingWithIgnoreCase` และ `ContainingIgnoreCase` ของ Spring Data escape ให้เอง ถ้าเขียน `@Query` เองต้อง escape เอง

## Test Cases: SectionRepository.findById

ใช้เป็นขั้นแรกของ `TimetableService.addEntry` ตาม Sequence Diagram ผลลัพธ์ต้องมีวิชาและคาบเรียนมาด้วย เพราะ service ใช้รหัสวิชาตรวจวิชาซ้ำ ใช้หน่วยกิตตรวจเพดาน และ `open-in-view: false` ทำให้ lazy load หลังจบ transaction ไม่ได้

### &#91;UT-DAO-06\] พบกลุ่มเรียน ได้ข้อมูลกลุ่ม วิชา และคาบเรียนครบ

**Related CoS:** Test case 2, 3 · **Test method:** `findById_existing_returnsSectionWithCourseAndSlots`

**Test Data:** S1 — CS111 Sec 030001, 2568/1, อาจารย์ "ผศ.ดร.ทรงศักดิ์ รองวิริยะพานิช", คาบ TUESDAY 11:00–12:30 และ THURSDAY 11:00–12:30 ห้อง LC3-121

**Test Steps:**

1. เรียก `findById(<id ของ S1>)`
2. ตรวจ field ของ section, วิชา และคาบเรียน
3. ตรวจด้วย `PersistenceUnitUtil.isLoaded` ว่าวิชาและ collection คาบเรียนโหลดมาแล้ว
4. Native query `SELECT category FROM course WHERE course_code = 'CS111'` และ `SELECT day_of_week FROM schedule_slot` ของ S1

**Expected Result:**

- ได้ Optional ที่มีค่า: sectionNo 030001, academicYear 2568, semester 1 และชื่ออาจารย์ภาษาไทยตรงทุกตัวอักษร
- วิชา: CS111, OBJECT-ORIENTED CONCEPTS, MAJOR, 3 หน่วยกิต
- คาบเรียน 2 คาบตรงตาม Test Data (ไม่บังคับลำดับ)
- วิชาและคาบเรียนโหลดมาพร้อม section ตาม Sequence Diagram (SELECT section, course, schedule\_slot)
- DB เก็บ enum เป็นข้อความ `MAJOR` และ `TUESDAY` ตาม ER Diagram ไม่ใช่ตัวเลข ordinal

### &#91;UT-DAO-07\] ไม่พบกลุ่มเรียน ได้ Optional ว่าง

**Related CoS:** — (404 ใน API Spec) · **Test method:** `findById_notFound_returnsEmpty`

**Test Steps:**

1. เรียก `findById(<id ที่มากที่สุดใน fixture> + 1000)`

**Expected Result:**

- ได้ `Optional.empty()` และไม่ throw exception ให้ service แปลงเป็น `ResourceNotFoundException` → 404 เอง

## Test Cases: TimetableRepository (บันทึก/อ่านตาราง)

ใช้ทั้ง `GET /api/timetable` และ `POST /api/timetable/entries` ตารางของภาคใดจะถูกสร้างตอนเพิ่มวิชาแรก จึงต้องแยก "ยังไม่มี" ออกจาก "มีแล้ว" ได้

### &#91;UT-DAO-08\] อ่านตารางของนักศึกษาตามปีและภาค ได้ตารางเดียวที่ตรง

**Related CoS:** Test case 2, 6 · **Test method:** `findByStudentIdAndTerm_existing_returnsOnlyThatTimetable`

**Test Steps:**

1. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000000", 2568, 1)`
2. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000000", 2568, 2)`
3. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000001", 2568, 1)`

**Expected Result:**

- ได้ T1, T3 และ T2 ตามลำดับ
- ไม่ปนกันข้ามนักศึกษาหรือข้ามภาค

### &#91;UT-DAO-09\] ยังไม่มีตาราง ได้ Optional ว่าง

**Related CoS:** ตารางว่าง (frame 1:2) · **Test method:** `findByStudentIdAndTerm_none_returnsEmpty`

**Test Steps:**

1. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000002", 2568, 1)`
2. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000000", 2569, 1)`

**Expected Result:**

- ทั้งสองครั้งได้ `Optional.empty()` ให้ service สร้างตารางใหม่ตอนเพิ่มวิชาแรก และ GET ตอบตารางว่าง `updatedAt: null`

### &#91;UT-DAO-10\] บันทึกตารางใหม่ ได้ id และ updatedAt อ่านกลับเป็นเวลาเดิม

**Related CoS:** Test case 2 · **Test method:** `save_newTimetable_generatesIdAndKeepsUpdatedAt`

**Test Data:** studentId 6609000002, 2568/1, updatedAt 2026-10-13T11:20:05+07:00

**Test Steps:**

1. `save(new Timetable(...))` ตาม Test Data
2. `flush()` + `clear()`
3. เรียก `findByStudentIdAndAcademicYearAndSemester("6609000002", 2568, 1)`

**Expected Result:**

- `timetableId` ที่ได้จาก save ไม่เป็น null
- อ่านกลับได้ตาราง id เดียวกัน
- `updatedAt` เป็นเวลาเดียวกัน โดยเทียบ `toInstant()` เพราะ offset อาจกลายเป็น UTC ตามชนิด column

### &#91;UT-DAO-11\] บันทึกตารางเดิมซ้ำ อัปเดต updatedAt โดยไม่สร้างแถวใหม่

**Related CoS:** Test case 6 · **Test method:** `save_existingTimetable_updatesWithoutNewRow`

**Test Steps:**

1. อ่าน T1 แล้วตั้ง `updatedAt` = 2026-10-14T09:00:00+07:00
2. `save(T1)` แล้ว `flush()` + `clear()`
3. อ่าน T1 อีกครั้ง และเรียก `count()`

**Expected Result:**

- `timetableId` เท่าเดิม และ `updatedAt` เป็นค่าใหม่ (เทียบ instant)
- `count()` ยังเป็น 4 ตามจำนวนตารางใน fixture

## Test Cases: TimetableEntryRepository (วิชาในตาราง เวลาชน หน่วยกิต)

`findByTimetableId` คืนข้อมูลที่ service ใช้ทำ `checkNotAlreadyAdded`, `checkCreditLimit` และ `findConflicts` ทุกตัว ตาม Sequence Diagram ต้องได้ section, วิชา และคาบเรียนมาพร้อมกันใน query เดียว

### &#91;UT-DAO-12\] บันทึกวิชาลงตาราง แล้วอ่านกลับได้

**Related CoS:** Test case 2 · **Test method:** `save_newEntry_isReturnedByFindByTimetableId`

**Test Steps:**

1. `save(new TimetableEntry(T2, S6))` เพิ่ม FE001 ลงตารางของ 6609000001
2. `flush()` + `clear()`
3. เรียก `findByTimetableId(<id ของ T2>)`

**Expected Result:**

- `entryId` ที่ได้จาก save ไม่เป็น null
- ได้ 2 entry: MA211 Sec 010001 และ FE001 Sec 900001

### &#91;UT-DAO-13\] อ่านวิชาในตาราง ได้ครบเฉพาะของตารางนั้น พร้อมข้อมูลที่ใช้แสดงผล

**Related CoS:** Test case 3, 6, 8 · **Test method:** `findByTimetableId_returnsAllEntriesOfThatTimetableOnly`

**Test Steps:**

1. เรียก `findByTimetableId(<id ของ T1>)`
2. ตรวจด้วย `PersistenceUnitUtil.isLoaded` ว่า section, วิชา และคาบเรียนของทุก entry โหลดมาแล้ว

**Expected Result:**

- ได้ 3 entry: CS111 030001, TU109 780001, LAS101 780004 (ไม่บังคับลำดับ)
- ไม่มี MA211 ของ T2 และไม่มี CS111 ภาค 2568/2 ของ T3
- ทุก entry ให้ courseCode, courseName, category, credits, sectionNo และคาบเรียนได้โดยไม่ query เพิ่ม
- entry ของ CS111 ให้ sectionNo 030001 ซึ่ง service ใช้เป็น `existingSectionNo` ใน 409 `COURSE_ALREADY_IN_TIMETABLE`

### &#91;UT-DAO-14\] ตารางที่ไม่มีวิชา ได้ list ว่าง

**Related CoS:** ตารางว่าง (frame 1:2) · **Test method:** `findByTimetableId_noEntries_returnsEmptyList`

**Test Steps:**

1. เรียก `findByTimetableId(<id ของ T4>)`
2. เรียก `findByTimetableId(<id ที่ไม่มีอยู่>)`

**Expected Result:**

- ทั้งสองครั้งได้ list ว่าง ไม่ใช่ null และไม่ throw

### &#91;UT-DAO-15\] คาบเรียนที่อ่านได้ตรงพอให้ service หาวิชาที่เวลาชน

**Related CoS:** Test case 4, 5 · **Test method:** `findByTimetableId_returnsExactSlotTimesForConflictCheck`

**Preconditions:** เพิ่ม entry S3 (MA211) ลง T1 แล้ว `flush()` + `clear()`

**Test Steps:**

1. เรียก `findByTimetableId(<id ของ T1>)`
2. ดึงคาบเรียนของแต่ละวิชาออกมาเทียบกับ Test Data
3. จับคู่คาบทุกคู่ที่วันเดียวกัน ด้วยสูตรเดียวกับ API Spec: `a.startTime < b.endTime && b.startTime < a.endTime`

**Expected Result:**

- TU109 และ LAS101 อ่านได้ WEDNESDAY 09:30–12:30 ทั้งคู่
- MA211 จบ 11:00 และ CS111 เริ่ม 11:00 ตรงกับ `LocalTime.of(11, 0)` พอดี ไม่คลาดเป็นวินาทีหรือเศษวินาที
- `dayOfWeek` อ่านกลับเป็น `DayOfWeek` ตรงตามที่บันทึก
- ข้อ 3 ได้คู่ชนคู่เดียวคือ TU109–LAS101 ส่วน MA211–CS111 ไม่นับเป็นชน

### &#91;UT-DAO-16\] รวมหน่วยกิตได้ถูก ไม่มี entry ซ้ำจากการ join คาบเรียน

**Related CoS:** Test case 7 · **Test method:** `findByTimetableId_multiSlotSection_returnsEachEntryOnce`

**Test Steps:**

1. เรียก `findByTimetableId(<id ของ T1>)` แล้วรวม credits ของทุก entry
2. เพิ่ม entry S6 (FE001, 2 หน่วยกิต) ลง T1 แล้ว `flush()` + `clear()`
3. เรียก `findByTimetableId` อีกครั้ง แล้วรวม credits

**Expected Result:**

- ข้อ 1 ได้ 3 entry รวม 9 หน่วยกิต ถ้า fetch join คาบเรียนแล้วได้แถวซ้ำ CS111 (2 คาบ) จะถูกนับ 2 ครั้งเป็น 12
- ข้อ 3 ได้ 4 entry รวม 11 หน่วยกิต

## Test Cases: Schema และ Constraint

ตรวจข้อกำหนดของตารางใน [US1-T06 ER Diagram](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T06/US1-T06-ER-Diagram.md) ทุกข้อใช้ `saveAndFlush` เพื่อให้ constraint ทำงานทันที และ Spring แปลงเป็น `DataIntegrityViolationException`

### &#91;UT-DAO-17\] Flyway migration ตรงกับ entity

**Related CoS:** — · **Test method:** `contextLoads_flywayMigrationMatchesEntities`

**Test Steps:**

1. เริ่ม test context บน container ว่าง ให้ Flyway รัน migration ทุกไฟล์ แล้ว Hibernate `validate`
2. ตรวจ `flyway_schema_history` ว่าทุก migration สถานะ success

**Expected Result:**

- context start ได้ ไม่มี error จาก `validate` แปลว่าชื่อตาราง column และชนิดข้อมูลตรงกับ entity ทั้ง 5 ตัว
- version ของ migration ไม่ชนกัน ตามกติกาตั้งชื่อด้วยวันเวลาใน CONTRIBUTING

### &#91;UT-DAO-18\] 1 นักศึกษามีได้ 1 ตารางต่อภาคเรียน

**Related CoS:** — (ER constraint) · **Test method:** `saveAndFlush_duplicateTimetableForTerm_throwsDataIntegrityViolation`

**Test Steps:**

1. `saveAndFlush(new Timetable("6609000000", 2569, 1))` คนเดิม ต่างปี
2. `saveAndFlush(new Timetable("6609000000", 2568, 1))` ซ้ำกับ T1

**Expected Result:**

- ข้อ 1 บันทึกได้
- ข้อ 2 throw `DataIntegrityViolationException` จาก unique (`student_id`, `academic_year`, `semester`)

### &#91;UT-DAO-19\] กลุ่มเรียนเดิมเพิ่มซ้ำในตารางไม่ได้ แต่คนละกลุ่มของวิชาเดิม DB ไม่กัน

**Related CoS:** Test case 8 · **Test method:** `saveAndFlush_duplicateSectionInTimetable_throwsDataIntegrityViolation`

**Test Steps:**

1. `saveAndFlush(new TimetableEntry(T1, S2))` CS111 Sec 030002 ซึ่ง T1 มี Sec 030001 อยู่แล้ว
2. `saveAndFlush(new TimetableEntry(T1, S1))` CS111 Sec 030001 ซ้ำ

**Expected Result:**

- ข้อ 1 บันทึกได้ ยืนยันว่า TC8 ต้องกันที่ `TimetableService.checkNotAlreadyAdded` ไม่ใช่ DB ตามหมายเหตุใน ER Diagram
- ข้อ 2 throw `DataIntegrityViolationException` จาก unique (`timetable_id`, `section_id`)

### &#91;UT-DAO-20\] รหัสกลุ่มซ้ำข้ามภาคได้ แต่ซ้ำในวิชาและภาคเดียวกันไม่ได้

**Related CoS:** — (ER constraint) · **Test method:** `saveAndFlush_duplicateSectionNoInTerm_throwsDataIntegrityViolation`

**Test Steps:**

1. ตรวจว่า S1 (2568/1) และ S7 (2568/2) ซึ่งใช้ Sec 030001 ทั้งคู่ อยู่ใน DB แล้ว
2. `saveAndFlush` section ใหม่ของ CS111 Sec 030001 ภาค 2568/1

**Expected Result:**

- ข้อ 1 อ่านได้ทั้งสองแถว
- ข้อ 2 throw `DataIntegrityViolationException` จาก unique `section_no` ภายใน (`course_code`, `academic_year`, `semester`)

### &#91;UT-DAO-21\] วิชาในตารางอ้างกลุ่มเรียนที่ไม่มีอยู่ไม่ได้

**Related CoS:** — (ER foreign key) · **Test method:** `insertEntry_unknownSection_throwsConstraintViolation`

**Test Steps:**

1. Native `INSERT INTO timetable_entry (timetable_id, section_id) VALUES (<id ของ T1>, -1)` ผ่าน `EntityManager` แล้ว `executeUpdate()`

**Expected Result:**

- throw `PersistenceException` ที่มี `ConstraintViolationException` จาก foreign key ของ `section_id` อยู่ข้างใน

## Traceability

ทุก CoS ของ US1 ที่ต้องใช้ข้อมูลจาก DB มี test ฝั่ง DAO รองรับ

| CoS ของ US1 | สิ่งที่ DAO ต้องทำได้ | Test case |
| --- | --- | --- |
| TC1 เลือกวิชาจากรายการ | ค้นวิชาตามภาค รหัส ชื่อ และหมวด | UT-DAO-01 – 05 |
| TC2 เพิ่มวิชาลงตาราง | หา section, บันทึกตารางและวิชาในตาราง | UT-DAO-06, 07, 10, 12 |
| TC3 แสดงรหัส ชื่อ วัน เวลา | คืนข้อมูลวิชาและคาบเรียนครบ | UT-DAO-06, 13 |
| TC4 เวลาไม่ชน แสดงปกติ | เวลาที่ต่อกันพอดีอ่านกลับตรง | UT-DAO-15 |
| TC5 เวลาชน แจ้งเตือน | คาบที่ซ้อนกันอ่านกลับตรง | UT-DAO-15 |
| TC6 หลายวิชา แสดงถูกวันเวลา | อ่านทุกวิชาของตาราง ไม่ปนตารางอื่น | UT-DAO-08, 11, 13 |
| TC7 หน่วยกิตไม่เกินกำหนด | credits ของทุกวิชา ไม่นับซ้ำ | UT-DAO-16 |
| TC8 1 วิชาได้ 1 กลุ่ม | คืน courseCode และ sectionNo, DB กันกลุ่มเดิมซ้ำ | UT-DAO-13, 19 |
| ตารางว่าง (frame 1:2) | แยก "ยังไม่มีตาราง" กับ "ตารางไม่มีวิชา" ได้ | UT-DAO-09, 14 |
| ข้อกำหนดใน ER Diagram | migration, unique, foreign key | UT-DAO-17, 18, 20, 21 |

**ต้องตัดสินก่อนหรือระหว่างทำ US1-T09**

- [x] `search` คืนวิชาพร้อม section ทุกภาค หรือเฉพาะภาคที่ค้น ถ้าคืนทุกภาค `CourseService` ต้องกรองเอง (UT-DAO-01 ตรวจแค่ว่าวิชาไม่ซ้ำ)
- [x] การ์ด T09 ให้ seed รายวิชาใน migration ถ้า seed มี CS111 จะชนกับ fixture ให้แยก seed ไว้โฟลเดอร์ที่เปิดเฉพาะ dev หรือเปลี่ยนรหัสวิชาใน fixture
- [x] ชนิด column `updated_at`: `DATETIMEOFFSET` เก็บ +07:00 ไว้ได้ ส่วน `DATETIME2` เก็บเป็น UTC (UT-DAO-10, 11 เทียบเป็น instant จึงผ่านทั้งสองแบบ)
- [x] เพิ่ม Testcontainers ใน `pom.xml` ต้องบอกกลุ่มและเปิด PR แยก

**เอกสารที่เกี่ยวข้อง:** [Sequence Diagram](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T06/US1-T06-Sequence-Diagram.md) · [DAO Class Diagram](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T06/US1-T06-DAO-Class-Diagram.md) · [ER Diagram](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T06/US1-T06-ER-Diagram.md) · [DTO & API Spec](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T05/US1-DTO%20%26%20API%20Spec.md) · [US1-T11 Unit Test UI](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/blob/main/.doc/US1/T11/US1-T11-Unit-Test-UI.md)
