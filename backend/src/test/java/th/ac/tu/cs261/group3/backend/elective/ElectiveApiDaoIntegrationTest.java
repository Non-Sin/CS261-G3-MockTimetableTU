package th.ac.tu.cs261.group3.backend.elective;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.support.TestcontainersConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration Test ระหว่าง API กับ DAO ของหน้าแนะนำวิชาเสรี (US6-T18)
 * ตาม test case ใน US6-T14 (IT-API-DAO-US6-01 ถึง 09)
 * <p>
 * รันจริงครบทุกชั้นตั้งแต่ Security Filter (JWT) → ElectiveController / TimetableController
 * → ElectiveService / TimetableService → ElectiveRepository / SectionRepository / TimetableRepository
 * → SQL Server (Testcontainers + Flyway migration & seed 18 วิชา) โดยไม่ mock อะไรเลย
 * <p>
 * ไม่ใช้ {@code @Transactional} ที่ test เพื่อให้ service commit จริงและตรวจข้อมูลใน DB ด้วย JdbcTemplate
 * ข้อมูลตารางเรียนของ {@link #STUDENT} ถูกลบทิ้งก่อนและหลังทุกเคส
 */
@SpringBootTest(properties = "app.auth.jwt.secret=test-secret-for-integration-32-bytes!!")
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class ElectiveApiDaoIntegrationTest {

    /** บัญชีทดสอบแยกจาก demo (6609000000), US1 (6609000099) และ US2 (6609000097/98) */
    private static final String STUDENT = "6609000095";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    private String token;

    @BeforeEach
    void setUp() {
        deleteStudentTimetables();
        token = jwtService.generateToken(STUDENT);
    }

    @AfterEach
    void tearDown() {
        deleteStudentTimetables();
    }

    @Test
    void itApiDaoUs6_01_searchAndFilterRecommendedElectives() throws Exception {
        // ค้นหาตาม T14: q=FR205 & group=LANGUAGE
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("q", "FR205")
                        .param("group", "LANGUAGE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseCode").value("FR205"))
                .andExpect(jsonPath("$[0].courseName").value("FRENCH FOR EVERYDAY LIFE"))
                .andExpect(jsonPath("$[0].courseNameTh").value("ภาษาฝรั่งเศสในชีวิตประจำวัน"))
                .andExpect(jsonPath("$[0].credits").value(3))
                .andExpect(jsonPath("$[0].group").value("LANGUAGE"))
                .andExpect(jsonPath("$[0].requiresQuota").value(true))
                .andExpect(jsonPath("$[0].offeredSemesters.length()").value(1))
                .andExpect(jsonPath("$[0].offeredSemesters[0]").value(1))
                .andExpect(jsonPath("$[0].tags[0]").value("KIND_INSTRUCTOR"))
                .andExpect(jsonPath("$[0].tags[1]").value("NO_PREREQUISITE"));

        // ไม่กรองต้องได้ครบทั้ง 18 วิชาแนะนำ และไม่มี JP171 (FREE_ELECTIVE ที่ไม่มี elective_info)
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(18))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("JP171"))));

        // ค้นชื่อภาษาไทย + กรองภาคเรียน/วัน/ช่วงเวลา
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("q", "ฝรั่งเศส"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseCode").value("FR205"));

        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("semester", "1")
                        .param("day", "TUESDAY")
                        .param("timeSlot", "EVENING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].courseCode").value("FR205"));
    }

    @Test
    void itApiDaoUs6_02_excludeConflicts_filtersOutConflictingAndAlreadyAddedCourses() throws Exception {
        // Precondition: นักศึกษามีวิชาเรียนวันจันทร์ 13:30 - 16:30 ในเทอม 1/2568 (CS180 820001)
        addEntryOk("CS180", "820001");

        // PY250 เทอม 1 (820001) เรียนจันทร์ 13:30-16:30 ชนกับ CS180 จึงต้องถูกกรองออกแม้มี Sec เทอม 2
        // วิชาที่เปิดเฉพาะเทอม 2 (AN242, AN347, PC280) ต้องถูกกรองออกเมื่อ currentSemester=1
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("excludeConflicts", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(14))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("PY250"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("AN242"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("AN347"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("PC280"))))
                .andExpect(jsonPath("$[*].courseCode", hasItem("FR205")));

        // เพิ่ม FR205 (260001) และ FD216 (810002 จันทร์ 09:30-12:30):
        // FR205 ต้องหายเพราะอยู่ในตารางแล้ว ส่วน PY200 และ RE468 ต้องหายเพราะชน FD216
        addEntryOk("FR205", "260001");
        addEntryOk("FD216", "810002");

        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("excludeConflicts", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("FR205"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("FD216"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("PY200"))))
                .andExpect(jsonPath("$[*].courseCode", not(hasItem("RE468"))))
                .andExpect(jsonPath("$[*].courseCode", hasItem("PY252")));
    }

    @Test
    void itApiDaoUs6_03_searchNotFound_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("q", "SA240"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        // วิชา FREE_ELECTIVE ที่ไม่มีข้อมูลแนะนำ (JP171) หรือวันอาทิตย์ ต้องได้ [] เช่นกัน
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("q", "JP171"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("day", "SUNDAY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void itApiDaoUs6_04_getDetail_returnsAllYearSectionsTagsAndOrderedReviews() throws Exception {
        // ตรวจ FR205 ตาม T14: Sec ทั้งปี, tags, bullet รีวิวเรียงตาม sort_order
        mockMvc.perform(get("/api/electives/FR205")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.courseCode").value("FR205"))
                .andExpect(jsonPath("$.courseName").value("FRENCH FOR EVERYDAY LIFE"))
                .andExpect(jsonPath("$.courseNameTh").value("ภาษาฝรั่งเศสในชีวิตประจำวัน"))
                .andExpect(jsonPath("$.credits").value(3))
                .andExpect(jsonPath("$.group").value("LANGUAGE"))
                .andExpect(jsonPath("$.requiresQuota").value(true))
                .andExpect(jsonPath("$.offeredSemesters[0]").value(1))
                .andExpect(jsonPath("$.tags[0]").value("KIND_INSTRUCTOR"))
                .andExpect(jsonPath("$.tags[1]").value("NO_PREREQUISITE"))
                .andExpect(jsonPath("$.description.length()").value(4))
                .andExpect(jsonPath("$.description[0]").value("เรียนภาษาฝรั่งเศสระดับ A2 ไม่มีพื้นฐานเรียนได้"))
                .andExpect(jsonPath("$.description[3]").value("มีสอบ กลางภาค และ ปลายภาค"))
                .andExpect(jsonPath("$.sections.length()").value(2))
                .andExpect(jsonPath("$.sections[0].sectionNo").value("260001"))
                .andExpect(jsonPath("$.sections[0].semester").value(1))
                .andExpect(jsonPath("$.sections[0].schedules.length()").value(2))
                .andExpect(jsonPath("$.sections[0].selectable").value(true))
                .andExpect(jsonPath("$.sections[0].inTimetable").value(false))
                .andExpect(jsonPath("$.sections[0].conflictWith").isEmpty())
                .andExpect(jsonPath("$.sections[1].sectionNo").value("260002"))
                .andExpect(jsonPath("$.sections[1].selectable").value(true));

        // เพิ่ม CS180 (จันทร์ 13:30-16:30) และ FR205 (260001) แล้วตรวจ PY250 (มี 2 ภาค) กับ FR205 (inTimetable)
        addEntryOk("CS180", "820001");
        addEntryOk("FR205", "260001");

        mockMvc.perform(get("/api/electives/PY250")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.offeredSemesters.length()").value(2))
                .andExpect(jsonPath("$.sections.length()").value(2))
                .andExpect(jsonPath("$.sections[0].sectionNo").value("820001"))
                .andExpect(jsonPath("$.sections[0].semester").value(1))
                .andExpect(jsonPath("$.sections[0].selectable").value(true))
                .andExpect(jsonPath("$.sections[0].inTimetable").value(false))
                .andExpect(jsonPath("$.sections[0].conflictWith[0]").value("CS180"))
                .andExpect(jsonPath("$.sections[1].sectionNo").value("230001"))
                .andExpect(jsonPath("$.sections[1].semester").value(2))
                .andExpect(jsonPath("$.sections[1].selectable").value(false))
                .andExpect(jsonPath("$.sections[1].conflictWith").isEmpty())
                .andExpect(jsonPath("$.sections[1].schedules[0].room").value(nullValue()));

        mockMvc.perform(get("/api/electives/FR205")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sections[0].inTimetable").value(true))
                .andExpect(jsonPath("$.sections[1].inTimetable").value(false));
    }

    @Test
    void itApiDaoUs6_05_addElectiveEntry_insertsRowIntoTimetableEntry() throws Exception {
        long fr205Sec1 = sectionId("FR205", "260001");
        assertThat(countTimetables()).isZero();
        assertThat(countEntries()).isZero();

        addEntry(fr205Sec1)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.academicYear").value(2568))
                .andExpect(jsonPath("$.semester").value(1))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].courseCode").value("FR205"))
                .andExpect(jsonPath("$.entries[0].sectionNo").value("260001"))
                .andExpect(jsonPath("$.totalCredits").value(3))
                .andExpect(jsonPath("$.conflicts").isEmpty())
                .andExpect(jsonPath("$.updatedAt").isNotEmpty());

        assertThat(countTimetables()).isEqualTo(1);
        assertThat(countEntries()).isEqualTo(1);
        assertThat(jdbc.queryForObject("""
                SELECT e.section_id FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ? AND t.academic_year = 2568 AND t.semester = 1
                """, Long.class, STUDENT)).isEqualTo(fr205Sec1);

        // กรณีเวลาชนกันแต่หน่วยกิตไม่เกิน (RE468 และ FD216 เรียนจันทร์ 09:30-12:30): ยังบันทึกได้ (201) พร้อม conflicts
        addEntryOk("FD216", "810002");
        addEntry(sectionId("RE468", "810001"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.entries.length()").value(3))
                .andExpect(jsonPath("$.totalCredits").value(9))
                .andExpect(jsonPath("$.conflicts.length()").value(1))
                .andExpect(jsonPath("$.conflicts[0].dayOfWeek").value("MONDAY"))
                .andExpect(jsonPath("$.conflicts[0].overlapStart").value("09:30"))
                .andExpect(jsonPath("$.conflicts[0].overlapEnd").value("12:30"))
                .andExpect(jsonPath("$.conflicts[0].courseCodes", hasItem("FD216")))
                .andExpect(jsonPath("$.conflicts[0].courseCodes", hasItem("RE468")));

        assertThat(countEntries()).isEqualTo(3);
    }

    @Test
    void itApiDaoUs6_06_duplicateCourseOrCreditLimitExceeded_returns409AndSavesNothing() throws Exception {
        // กรณีซ้ำ: มี FR205 (260001) แล้ว เพิ่ม FR205 (260002) → 409 COURSE_ALREADY_IN_TIMETABLE
        addEntryOk("FR205", "260001");
        int entriesAfterFirst = countEntries();

        addEntry(sectionId("FR205", "260002"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ALREADY_IN_TIMETABLE"))
                .andExpect(jsonPath("$.courseCode").value("FR205"))
                .andExpect(jsonPath("$.existingSectionNo").value("260001"));

        assertThat(countEntries()).isEqualTo(entriesAfterFirst);

        // กรณีหน่วยกิตเกิน 22: ล้างตารางแล้วใส่ 7 วิชา = 21 หน่วยกิต จากนั้นเพิ่ม FR205 (3 หน่วยกิต → 24 > 22)
        deleteStudentTimetables();
        addEntryOk("CS180", "820001");
        addEntryOk("MA211", "020001");
        addEntryOk("CS111", "030001");
        addEntryOk("LAS101", "780004");
        addEntryOk("TU101", "900001");
        addEntryOk("TU106", "540001");
        addEntryOk("TU109", "780001");
        assertThat(countEntries()).isEqualTo(7);

        addEntry(sectionId("FR205", "260001"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.currentCredits").value(21))
                .andExpect(jsonPath("$.courseCredits").value(3))
                .andExpect(jsonPath("$.maxCredits").value(22));

        assertThat(countEntries()).isEqualTo(7);
        assertThat(countTimetables()).isEqualTo(1);
    }

    @Test
    void itApiDaoUs6_07_courseNotFoundOrNotRecommendedElective_returns404() throws Exception {
        // SA240 ไม่มีในฐานข้อมูล
        mockMvc.perform(get("/api/electives/SA240")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value(containsString("SA240")));

        // JP171 เป็น FREE_ELECTIVE แต่ไม่มีข้อมูลแนะนำ (elective_info)
        mockMvc.perform(get("/api/electives/JP171")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404));

        // CS111 ไม่ใช่วิชาเลือกเสรี (MAJOR)
        mockMvc.perform(get("/api/electives/CS111")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void itApiDaoUs6_08_invalidOrMissingParams_returns400() throws Exception {
        // currentSemester นอกช่วง (3)
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "3"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400));

        // semester นอกช่วง (3)
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("semester", "3"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // enum group ไม่ถูกต้อง (INVALID)
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "1")
                        .param("group", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // ขาดพารามิเตอร์บังคับ academicYear
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("currentSemester", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // academicYear ไม่ใช่ตัวเลข
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "abc")
                        .param("currentSemester", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // getDetail ด้วย currentSemester=3
        mockMvc.perform(get("/api/electives/FR205")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("academicYear", "2568")
                        .param("currentSemester", "3"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void itApiDaoUs6_09_missingOrInvalidToken_returns401() throws Exception {
        // ไม่มี Header Authorization
        mockMvc.perform(get("/api/electives")
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));

        // Token ผิดพลาด
        mockMvc.perform(get("/api/electives")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.token")
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));

        // endpoint รายละเอียดวิชาโดยไม่มี Token
        mockMvc.perform(get("/api/electives/FR205")
                        .param("academicYear", "2568")
                        .param("currentSemester", "1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    private ResultActions addEntry(long sectionId) throws Exception {
        return mockMvc.perform(post("/api/timetable/entries")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"sectionId": %d}
                        """.formatted(sectionId)));
    }

    private void addEntryOk(String courseCode, String sectionNo) throws Exception {
        addEntry(sectionId(courseCode, sectionNo)).andExpect(status().isCreated());
    }

    private long sectionId(String courseCode, String sectionNo) {
        return jdbc.queryForObject("""
                SELECT section_id FROM section
                WHERE course_code = ? AND section_no = ? AND academic_year = 2568 AND semester = 1
                """, Long.class, courseCode, sectionNo);
    }

    private int countTimetables() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM timetable WHERE student_id = ?", Integer.class, STUDENT);
    }

    private int countEntries() {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ?
                """, Integer.class, STUDENT);
    }

    private void deleteStudentTimetables() {
        jdbc.update("DELETE FROM timetable WHERE student_id = ?", STUDENT);
    }
}
