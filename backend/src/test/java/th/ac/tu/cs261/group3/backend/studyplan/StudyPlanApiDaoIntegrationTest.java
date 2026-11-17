package th.ac.tu.cs261.group3.backend.studyplan;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import th.ac.tu.cs261.group3.backend.auth.JwtService;
import th.ac.tu.cs261.group3.backend.support.TestcontainersConfig;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration Test ระหว่าง API กับ DAO ของ US8 ตาม US8-T14 (IT-API-DAO-US8-01 ถึง 28)
 * <p>
 * รันจริงตั้งแต่ security filter (JWT) → StudyPlanController / ApplyPlanController → service → repository → SQL Server
 * Flyway รันเฉพาะ db/migration ข้อมูลทดสอบ (รหัส T8..., นักศึกษา 66090008xx) สร้างครั้งเดียวต่อคลาสด้วย JdbcTemplate
 * แล้วลบทิ้งใน {@link #dropTestData()}
 * <p>
 * ไม่ใช้ {@code @Transactional} ที่ test ให้ service commit จริงแล้วอ่านแถวจาก DB
 * ตารางเรียนของนักศึกษาทดสอบถูกลบก่อนและหลังทุกเคส ลำดับการรันเคสจึงไม่มีผล
 * <p>
 * study_minor_course มีคอลัมน์ plan_type (เพิ่มหลัง US8-T14) วิชาโทของ MN-1, MN-2, MN-OTHER จึงใส่เป็นของแผนสหกิจ (CO_OP)
 * ซึ่งเป็นแผนที่ใช้คู่กับวิชาโทใน IT-21 ถึง 25
 */
@SpringBootTest(properties = {
        "spring.flyway.locations=classpath:db/migration",
        "app.auth.jwt.secret=test-secret-for-us8-integration-32b!!"
})
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class StudyPlanApiDaoIntegrationTest {

    private static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    private static final String CUR_A = "หลักสูตรทดสอบ A";
    private static final String CUR_B = "หลักสูตรทดสอบ B";
    private static final String OLD = "2000-01-01T00:00:00+07:00";

    private static final String S1 = "6609000801";
    private static final String S2 = "6609000802";
    /** มีแค่ token ไม่มีแถวใน users */
    private static final String S3 = "6609000803";

    private static final List<String> COURSES = List.of("T8M01", "T8M02", "T8M03", "T8M04", "T8M05", "T8C01",
            "T8G01", "T8G02", "T8A01", "T8B01", "T8X01", "T8N01", "T8N02", "T8F01", "T8F02", "T8F03", "T8F04", "T8F05");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoSpyBean
    private TimetableEntryRepository timetableEntryRepository;

    private long m01, m02, m03, m04, m05, c01, g01, g02, a01s010001, a01s010002, b01, n01, n02;
    private long[] f;
    private long pBasic, pSecond, pSem2, pCredit, pConflict, pCoop, pBacktrack;
    private long mn1, mn2, mnOther;

    private String t1, t2, t3;

    // ---------------------------------------------------------------- data

    @BeforeAll
    void createTestData() {
        dropTestData();
        user(S1, "One", "หนึ่ง");
        user(S2, "Two", "สอง");

        m01 = courseWithSlot("T8M01", "MAJOR", 3, "010001", 1, "MONDAY", "09:30", "12:30");
        m02 = courseWithSlot("T8M02", "MAJOR", 3, "010001", 1, "TUESDAY", "09:30", "12:30");
        m03 = courseWithSlot("T8M03", "MAJOR", 3, "010001", 1, "WEDNESDAY", "09:30", "12:30");
        m04 = courseWithSlot("T8M04", "MAJOR", 3, "010001", 1, "MONDAY", "12:30", "14:00");
        m05 = courseWithSlot("T8M05", "MAJOR", 3, "010001", 1, "THURSDAY", "09:30", "12:30");
        course("T8C01", "MAJOR", 3);
        c01 = section("T8C01", "010001", 1); // ไม่มีคาบเรียน
        g01 = courseWithSlot("T8G01", "GENERAL_EDUCATION", 3, "780001", 1, "WEDNESDAY", "09:30", "12:30");

        // insert 780002 ก่อน 780001 ให้พิสูจน์ว่าระบบเลือกตาม sectionNo ไม่ใช่ section_id
        course("T8G02", "GENERAL_EDUCATION", 3);
        slot(section("T8G02", "780002", 1), "THURSDAY", "13:30", "16:30");
        g02 = section("T8G02", "780001", 1);
        slot(g02, "THURSDAY", "13:30", "16:30");
        slot(section("T8G02", "780003", 1), "FRIDAY", "13:30", "16:30");

        course("T8A01", "MAJOR", 3);
        a01s010001 = section("T8A01", "010001", 1);
        slot(a01s010001, "FRIDAY", "09:30", "12:30");
        a01s010002 = section("T8A01", "010002", 1);
        slot(a01s010002, "SATURDAY", "09:30", "12:30");
        b01 = courseWithSlot("T8B01", "MAJOR", 3, "010001", 1, "FRIDAY", "09:30", "12:30");
        courseWithSlot("T8X01", "MAJOR", 3, "010001", 2, "MONDAY", "09:30", "12:30");
        n01 = courseWithSlot("T8N01", "FREE_ELECTIVE", 3, "990001", 1, "FRIDAY", "13:30", "16:30");
        n02 = courseWithSlot("T8N02", "FREE_ELECTIVE", 4, "990001", 1, "THURSDAY", "09:30", "12:30");
        String[][] fill = {{"13:00", "14:30"}, {"14:30", "16:00"}, {"16:00", "17:30"}, {"17:30", "19:00"}, {"19:00", "20:30"}};
        f = new long[5];
        for (int i = 0; i < 5; i++) {
            f[i] = courseWithSlot("T8F0" + (i + 1), "FREE_ELECTIVE", 3, "900001", 1, "SATURDAY", fill[i][0], fill[i][1]);
        }

        pBasic = plan(CUR_A, 2, 1, null, "T8M01", "T8M02", "T8M04", "T8G02");
        pSecond = plan(CUR_B, 2, 1, null, "T8M02");
        pSem2 = plan(CUR_A, 2, 2, null, "T8X01");
        pCredit = plan(CUR_A, 1, 1, null, "T8M01", "T8M02", "T8G02");
        // P-COOP ก่อน P-CONFLICT ให้พิสูจน์ว่า plans เรียงตาม planType ไม่ใช่ plan_id
        pCoop = plan(CUR_A, 3, 1, "CO_OP", "T8M05", "T8C01");
        pConflict = plan(CUR_A, 3, 1, "SPECIAL_PROJECT", "T8M03", "T8G01", "T8X01");
        pBacktrack = plan(CUR_A, 4, 1, "SPECIAL_PROJECT", "T8A01", "T8B01");

        mn1 = minor(CUR_A, "วิทยาการข้อมูล", 1);
        minorCourse(mn1, "T8N01", 3, 1, 1);
        minorCourse(mn1, "T8N02", 3, 1, 2);
        minorCourse(mn1, "T8M05", 3, 1, 3);
        mn2 = minor(CUR_A, "ปัญญาประดิษฐ์", 2);
        minorCourse(mn2, "T8N01", 4, 2, 1);
        mnOther = minor(CUR_B, "เดฟออปส์", 3);
        minorCourse(mnOther, "T8N01", 3, 1, 1);
    }

    @AfterAll
    void dropTestData() {
        deleteTimetables();
        jdbc.update("DELETE FROM study_plan WHERE curriculum_name IN (?, ?)", CUR_A, CUR_B);
        jdbc.update("DELETE FROM study_minor WHERE curriculum_name IN (?, ?)", CUR_A, CUR_B);
        for (String code : COURSES) {
            jdbc.update("DELETE FROM section WHERE course_code = ?", code); // schedule_slot ลบตาม CASCADE
            jdbc.update("DELETE FROM course WHERE course_code = ?", code);
        }
        jdbc.update("DELETE FROM users WHERE student_id IN (?, ?)", S1, S2);
    }

    @BeforeEach
    void setUp() {
        Mockito.reset(timetableEntryRepository);
        deleteTimetables();
        t1 = jwtService.generateToken(S1);
        t2 = jwtService.generateToken(S2);
        t3 = jwtService.generateToken(S3);
    }

    @AfterEach
    void tearDown() {
        Mockito.reset(timetableEntryRepository);
        deleteTimetables();
    }

    // ---------------------------------------------------------------- 3.1 GET /api/study-plans

    @Test
    void itApiDaoUs8_01_year2Sem1_twoCurriculaSortedNoMinors() throws Exception {
        String body = studyPlans(t1, "studyYear=2&semester=1").andExpect(status().isOk())
                .andExpect(jsonPath("$.department").value(CS))
                .andExpect(jsonPath("$.studyYear").value(2))
                .andExpect(jsonPath("$.semester").value(1))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(list(body, "$.plans[*].planId")).containsExactly(num(pBasic), num(pSecond));
        assertThat(opt(body, "$.plans[0].planType")).isNull();
        assertThat(opt(body, "$.plans[1].planType")).isNull();
        assertThat(list(body, "$.plans[0].courses[*].courseCode")).containsExactly("T8M01", "T8M02", "T8M04", "T8G02");
        assertThat(list(body, "$.plans[0].courses[*].category")).containsExactly("MAJOR", "MAJOR", "MAJOR", "GENERAL_EDUCATION");
        assertThat((Object) JsonPath.read(body, "$.plans[0].totalCredits")).isEqualTo(12);
        assertThat(list(body, "$.minors")).isEmpty();
        assertThat(countTimetables(S1)).isZero();
    }

    @Test
    void itApiDaoUs8_02_year3Sem1_plansByPlanTypeAndMinorsBySortOrder() throws Exception {
        String body = studyPlans(t1, "studyYear=3&semester=1").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(list(body, "$.plans[*].planId")).containsExactly(num(pConflict), num(pCoop));
        assertThat(list(body, "$.plans[*].planType")).containsExactly("SPECIAL_PROJECT", "CO_OP");
        assertThat(list(body, "$.minors[*].minorId")).containsExactly(num(mn1), num(mnOther));
        assertThat(list(body, "$.minors[0].courses[*].courseCode")).containsExactly("T8N01", "T8N02", "T8M05");
        assertThat((Object) JsonPath.read(body, "$.minors[0].totalCredits")).isEqualTo(10);
        assertThat(countTimetables(S1)).isZero();
    }

    @Test
    void itApiDaoUs8_03_noPlan_returnsEmptyLists() throws Exception {
        studyPlans(t1, "studyYear=1&semester=2").andExpect(status().isOk())
                .andExpect(jsonPath("$.plans").isEmpty())
                .andExpect(jsonPath("$.minors").isEmpty());
    }

    @Test
    void itApiDaoUs8_04_invalidParams_return400() throws Exception {
        for (String q : List.of("semester=1", "studyYear=0&semester=1", "studyYear=5&semester=1",
                "studyYear=2&semester=3", "studyYear=abc&semester=1")) {
            studyPlans(t1, q).andExpect(status().isBadRequest()).andExpect(jsonPath("$.status").value(400));
        }
        assertThat(countTimetables(S1)).isZero();
    }

    @Test
    void itApiDaoUs8_05_userNotInUsers_returns404() throws Exception {
        studyPlans(t3, "studyYear=2&semester=1").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void itApiDaoUs8_06_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/study-plans?studyYear=2&semester=1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    // ---------------------------------------------------------------- 3.2 Preview

    @Test
    void itApiDaoUs8_07_preview_returnsAddedWithoutWriting() throws Exception {
        String body = apply(t1, pBasic, null, 2568, true).andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(true))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(opt(body, "$.minorId")).isNull();
        assertThat(addedPairs(body)).containsExactlyInAnyOrder("T8M01:010001", "T8M02:010001", "T8M04:010001", "T8G02:780001");
        assertThat(list(body, "$.added[*].sectionId")).containsExactlyInAnyOrder(num(m01), num(m02), num(m04), num(g02));
        assertThat(list(body, "$.added[*].source")).containsOnly("PLAN");
        assertThat(list(body, "$.skipped")).isEmpty();
        assertThat(opt(body, "$.timetable")).isNull();
        assertThat(countTimetables(S1)).isZero();
        assertThat(entries(S1)).isEmpty();
    }

    @Test
    void itApiDaoUs8_08_preview_existingCourseSkippedAndNothingWritten() throws Exception {
        existingTimetable(S1, m02);

        String body = apply(t1, pBasic, null, 2568, true).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedCodes(body)).containsExactlyInAnyOrder("T8M01", "T8M04", "T8G02");
        assertThat(skipped(body, "T8M02")).containsEntry("reason", "COURSE_ALREADY_IN_TIMETABLE")
                .containsEntry("existingSectionNo", "010001");
        assertThat(opt(body, "$.timetable")).isNull();
        assertThat(entries(S1)).containsExactly(m02);
        assertThat(isOld(S1)).isTrue();
    }

    @Test
    void itApiDaoUs8_09_preview_conflictAndNoSection() throws Exception {
        String body = apply(t1, pConflict, null, 2568, true).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedCodes(body)).containsExactly("T8M03");
        assertThat(skipped(body, "T8G01")).containsEntry("reason", "TIME_CONFLICT")
                .containsEntry("conflictWith", List.of("T8M03"));
        assertThat(skipped(body, "T8X01")).containsEntry("reason", "NO_SECTION_AVAILABLE");
        assertThat(list(body, "$.skipped[*].message")).hasSize(2).doesNotContainNull();
        assertThat(countTimetables(S1)).isZero();
    }

    // ---------------------------------------------------------------- 3.3 Confirm

    @Test
    void itApiDaoUs8_10_confirm_createsTimetableWithAllAdded() throws Exception {
        String preview = apply(t1, pBasic, null, 2568, true).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String body = apply(t1, pBasic, null, 2568, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(false))
                .andExpect(jsonPath("$.timetable.entries.length()").value(4))
                .andExpect(jsonPath("$.timetable.totalCredits").value(12))
                .andExpect(jsonPath("$.timetable.conflicts").isEmpty())
                .andExpect(jsonPath("$.timetable.updatedAt").isNotEmpty())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(list(body, "$.added[*].sectionId"))
                .containsExactlyInAnyOrderElementsOf(list(preview, "$.added[*].sectionId"));
        assertThat(countTimetables(S1)).isEqualTo(1);
        assertThat(entries(S1)).containsExactlyInAnyOrder(m01, m02, m04, g02);
    }

    @Test
    void itApiDaoUs8_11_confirm_existingCourseNotDuplicated() throws Exception {
        existingTimetable(S1, m02);

        String body = apply(t1, pBasic, null, 2568, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.timetable.entries.length()").value(4))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedCodes(body)).containsExactlyInAnyOrder("T8M01", "T8M04", "T8G02");
        assertThat(skipped(body, "T8M02")).containsEntry("reason", "COURSE_ALREADY_IN_TIMETABLE");
        assertThat(countTimetables(S1)).isEqualTo(1);
        assertThat(entries(S1)).containsExactlyInAnyOrder(m02, m01, m04, g02);
        assertThat(isOld(S1)).isFalse();
    }

    @Test
    void itApiDaoUs8_12_confirm_nothingAdded_doesNotWrite() throws Exception {
        existingTimetable(S1, g01);

        String body = apply(t1, pConflict, null, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(list(body, "$.added")).isEmpty();
        assertThat(skipped(body, "T8M03")).containsEntry("reason", "TIME_CONFLICT")
                .containsEntry("conflictWith", List.of("T8G01"));
        assertThat(skipped(body, "T8G01")).containsEntry("reason", "COURSE_ALREADY_IN_TIMETABLE");
        assertThat(skipped(body, "T8X01")).containsEntry("reason", "NO_SECTION_AVAILABLE");
        assertThat(list(body, "$.timetable.entries[*].courseCode")).containsExactly("T8G01");
        assertThat(entries(S1)).containsExactly(g01);
        assertThat(isOld(S1)).isTrue();
    }

    @Test
    void itApiDaoUs8_13_confirm_backtrackingBeatsGreedy() throws Exception {
        String body = apply(t1, pBacktrack, null, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedPairs(body)).containsExactlyInAnyOrder("T8A01:010002", "T8B01:010001");
        assertThat(list(body, "$.skipped")).isEmpty();
        assertThat(entries(S1)).containsExactlyInAnyOrder(a01s010002, b01);
    }

    @Test
    void itApiDaoUs8_14_confirm_creditLimit_keepsMajorsFirst() throws Exception {
        existingTimetable(S1, f);

        String body = apply(t1, pCredit, null, 2568, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.timetable.totalCredits").value(21))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedCodes(body)).containsExactlyInAnyOrder("T8M01", "T8M02");
        assertThat(skipped(body, "T8G02")).containsEntry("reason", "CREDIT_LIMIT_EXCEEDED")
                .containsEntry("currentCredits", 21).containsEntry("maxCredits", 22);
        assertThat(entries(S1)).hasSize(7);
        assertThat(totalCredits(S1)).isEqualTo(21);
    }

    @Test
    void itApiDaoUs8_15_confirm_recalculatesAfterTimetableChanged() throws Exception {
        String preview = apply(t1, pBasic, null, 2568, true).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(addedCodes(preview)).contains("T8M01");

        // แก้ตารางจากอีกแท็บ
        mockMvc.perform(post("/api/timetable/entries")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + t1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sectionId\": %d}".formatted(m01)))
                .andExpect(status().isCreated());

        String body = apply(t1, pBasic, null, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(skipped(body, "T8M01")).containsEntry("reason", "COURSE_ALREADY_IN_TIMETABLE");
        assertThat(addedCodes(body)).containsExactlyInAnyOrder("T8M02", "T8M04", "T8G02");
        assertThat(entries(S1)).hasSize(4).containsOnlyOnce(m01);
    }

    @Test
    void itApiDaoUs8_16_confirm_saveFails_rollsBackEverything() throws Exception {
        doThrow(new RuntimeException("IT-16 simulated failure")).when(timetableEntryRepository).saveAll(any());

        // มีตารางเดิม: touch() ต้องถูก rollback ด้วย
        existingTimetable(S1, m02);
        apply(t1, pBasic, null, 2568, false).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500));
        assertThat(entries(S1)).containsExactly(m02);
        assertThat(isOld(S1)).isTrue();

        // ไม่มีตาราง: ต้องไม่มีแถว timetable ค้าง
        deleteTimetables();
        apply(t1, pBasic, null, 2568, false).andExpect(status().isInternalServerError());
        assertThat(countTimetables(S1)).isZero();
    }

    @Test
    void itApiDaoUs8_17_otherStudentTimetableNotCounted() throws Exception {
        existingTimetable(S2, m01);

        String body = apply(t1, pBasic, null, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedCodes(body)).contains("T8M01");
        assertThat(entries(S1)).hasSize(4);
        assertThat(entries(S2)).containsExactly(m01);
        assertThat(isOld(S2)).isTrue();
    }

    @Test
    void itApiDaoUs8_18_yearWithoutSections_allNoSectionAndNoTimetable() throws Exception {
        String body = apply(t1, pBasic, null, 2569, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.timetable.entries").isEmpty())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(list(body, "$.added")).isEmpty();
        assertThat(list(body, "$.skipped[*].reason")).hasSize(4).containsOnly("NO_SECTION_AVAILABLE");
        assertThat(opt(body, "$.timetable.updatedAt")).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM timetable WHERE student_id = ? AND academic_year = 2569",
                Integer.class, S1)).isZero();
    }

    @Test
    void itApiDaoUs8_19_dryRunOmitted_defaultsToConfirm() throws Exception {
        mockMvc.perform(post("/api/timetable/apply-plan")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + t1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": %d, \"academicYear\": 2568}".formatted(pBasic)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dryRun").value(false))
                .andExpect(jsonPath("$.timetable").isNotEmpty());

        assertThat(entries(S1)).hasSize(4);
    }

    // ---------------------------------------------------------------- 3.4 Year 3-4 and minors

    @Test
    void itApiDaoUs8_20_coopPlanWithoutMinor() throws Exception {
        String body = apply(t1, pCoop, null, 2568, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.timetable.conflicts").isEmpty())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(opt(body, "$.minorId")).isNull();
        assertThat(addedCodes(body)).containsExactlyInAnyOrder("T8M05", "T8C01");
        assertThat(list(body, "$.added[*].source")).containsOnly("PLAN");
        assertThat(entries(S1)).containsExactlyInAnyOrder(m05, c01);
    }

    @Test
    void itApiDaoUs8_21_previewWithMinor_planFirstAndDuplicateOnce() throws Exception {
        String body = apply(t1, pCoop, mn1, 2568, true).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat((Object) JsonPath.read(body, "$.minorId")).isEqualTo(num(mn1));
        assertThat(addedWithSource(body)).containsExactlyInAnyOrder("T8M05:PLAN", "T8C01:PLAN", "T8N01:MINOR");
        assertThat(addedPairs(body)).contains("T8N01:990001");
        assertThat(skipped(body, "T8N02")).containsEntry("reason", "TIME_CONFLICT")
                .containsEntry("source", "MINOR").containsEntry("conflictWith", List.of("T8M05"));
        assertThat(countTimetables(S1)).isZero();
    }

    @Test
    void itApiDaoUs8_22_confirmWithMinor_savesPlanAndMinorCourses() throws Exception {
        String body = apply(t1, pCoop, mn1, 2568, false).andExpect(status().isOk())
                .andExpect(jsonPath("$.timetable.entries.length()").value(3))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedWithSource(body)).containsExactlyInAnyOrder("T8M05:PLAN", "T8C01:PLAN", "T8N01:MINOR");
        assertThat(skipped(body, "T8N02")).containsEntry("reason", "TIME_CONFLICT");
        assertThat(entries(S1)).containsExactlyInAnyOrder(m05, c01, n01);
    }

    @Test
    void itApiDaoUs8_23_minorSkippedBeforePlanWhenCreditsExceeded() throws Exception {
        existingTimetable(S1, f);

        String body = apply(t1, pCoop, mn1, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(addedWithSource(body)).containsExactlyInAnyOrder("T8M05:PLAN", "T8C01:PLAN");
        assertThat(skipped(body, "T8N01")).containsEntry("reason", "CREDIT_LIMIT_EXCEEDED")
                .containsEntry("source", "MINOR").containsEntry("currentCredits", 21);
        assertThat(skipped(body, "T8N02")).containsEntry("reason", "TIME_CONFLICT");
        assertThat(entries(S1)).hasSize(7);
        assertThat(totalCredits(S1)).isEqualTo(21);
    }

    @Test
    void itApiDaoUs8_24_minorWithoutCoursesInTerm_sameAsNoMinor() throws Exception {
        String body = apply(t1, pCoop, mn2, 2568, false).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat((Object) JsonPath.read(body, "$.minorId")).isEqualTo(num(mn2));
        assertThat(addedWithSource(body)).containsExactlyInAnyOrder("T8M05:PLAN", "T8C01:PLAN");
        assertThat(entries(S1)).containsExactlyInAnyOrder(m05, c01);
    }

    @Test
    void itApiDaoUs8_25_invalidMinor_returnsErrorAndDoesNotWrite() throws Exception {
        existingTimetable(S1, m02);
        long unknownMinor = jdbc.queryForObject("SELECT MAX(minor_id) FROM study_minor", Long.class) + 1000;

        apply(t1, pCoop, unknownMinor, 2568, false).andExpect(status().isNotFound());
        apply(t1, pCoop, mnOther, 2568, false).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MINOR_PLAN_MISMATCH"));
        apply(t1, pBasic, unknownMinor, 2568, false).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MINOR_NOT_ALLOWED"));

        assertThat(entries(S1)).containsExactly(m02);
        assertThat(isOld(S1)).isTrue();
    }

    // ---------------------------------------------------------------- 3.5 Bad requests

    @Test
    void itApiDaoUs8_26_unknownPlan_returns404() throws Exception {
        existingTimetable(S1, m02);
        long unknownPlan = jdbc.queryForObject("SELECT MAX(plan_id) FROM study_plan", Long.class) + 1000;

        apply(t1, unknownPlan, null, 2568, true).andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        apply(t1, unknownPlan, null, 2568, false).andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));

        assertThat(entries(S1)).containsExactly(m02);
        assertThat(isOld(S1)).isTrue();
    }

    @Test
    void itApiDaoUs8_27_missingRequiredFields_return400() throws Exception {
        existingTimetable(S1, m02);

        for (String json : List.of("{\"academicYear\": 2568, \"dryRun\": false}",
                "{\"planId\": %d, \"dryRun\": false}".formatted(pBasic))) {
            mockMvc.perform(post("/api/timetable/apply-plan")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + t1)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }
        assertThat(entries(S1)).containsExactly(m02);
        assertThat(isOld(S1)).isTrue();
    }

    @Test
    void itApiDaoUs8_28_noToken_returns401() throws Exception {
        mockMvc.perform(post("/api/timetable/apply-plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"planId\": %d, \"academicYear\": 2568, \"dryRun\": false}".formatted(pBasic)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
        assertThat(countTimetables(S1)).isZero();
    }

    // ---------------------------------------------------------------- helpers: requests

    private ResultActions studyPlans(String token, String query) throws Exception {
        return mockMvc.perform(get("/api/study-plans?" + query).header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    private ResultActions apply(String token, long planId, Long minorId, int academicYear, boolean dryRun) throws Exception {
        String json = "{\"planId\": %d, \"minorId\": %s, \"academicYear\": %d, \"dryRun\": %s}"
                .formatted(planId, minorId == null ? "null" : minorId.toString(), academicYear, dryRun);
        return mockMvc.perform(post("/api/timetable/apply-plan")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    // ---------------------------------------------------------------- helpers: JSON

    private static List<Object> list(String body, String path) {
        return JsonPath.read(body, path);
    }

    private static Object opt(String body, String path) {
        try {
            return JsonPath.read(body, path);
        } catch (PathNotFoundException e) {
            return null;
        }
    }

    /** JSON number เทียบกับ id แบบ long (JsonPath คืน Integer ถ้าค่าเล็ก) */
    private static Object num(long id) {
        return id <= Integer.MAX_VALUE ? (Object) (int) id : (Object) id;
    }

    private static List<String> addedCodes(String body) {
        return JsonPath.read(body, "$.added[*].courseCode");
    }

    private static List<String> addedPairs(String body) {
        List<Map<String, Object>> added = JsonPath.read(body, "$.added[*]");
        return added.stream().map(a -> a.get("courseCode") + ":" + a.get("sectionNo")).toList();
    }

    private static List<String> addedWithSource(String body) {
        List<Map<String, Object>> added = JsonPath.read(body, "$.added[*]");
        return added.stream().map(a -> a.get("courseCode") + ":" + a.get("source")).toList();
    }

    private static Map<String, Object> skipped(String body, String courseCode) {
        List<Map<String, Object>> found = JsonPath.read(body, "$.skipped[?(@.courseCode == '" + courseCode + "')]");
        assertThat(found).as("skipped " + courseCode).hasSize(1);
        return found.get(0);
    }

    // ---------------------------------------------------------------- helpers: DB

    private void user(String studentId, String lastName, String lastNameTh) {
        jdbc.update("""
                INSERT INTO users (student_id, first_name, last_name, department, track, updated_at, first_name_th, last_name_th)
                VALUES (?, 'Tester', ?, ?, N'ภาคปกติ', CAST(? AS DATETIMEOFFSET), N'ทดสอบ', ?)""",
                studentId, lastName, CS, OLD, lastNameTh);
    }

    private void course(String code, String category, int credits) {
        jdbc.update("INSERT INTO course (course_code, course_name, category, credits) VALUES (?, ?, ?, ?)",
                code, code + " TEST COURSE", category, credits);
    }

    private long section(String code, String sectionNo, int semester) {
        return jdbc.queryForObject("""
                INSERT INTO section (course_code, section_no, academic_year, semester)
                OUTPUT INSERTED.section_id VALUES (?, ?, 2568, ?)""", Long.class, code, sectionNo, semester);
    }

    private void slot(long sectionId, String day, String start, String end) {
        jdbc.update("INSERT INTO schedule_slot (section_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
                sectionId, day, start, end);
    }

    private long courseWithSlot(String code, String category, int credits, String sectionNo, int semester,
                                String day, String start, String end) {
        course(code, category, credits);
        long id = section(code, sectionNo, semester);
        slot(id, day, start, end);
        return id;
    }

    /** planType null (ปี 1–2) เขียน NULL ลง SQL ตรง ๆ ไม่ bind parameter ที่ไม่มีชนิด (แบบเดียวกับ StudyPlanFixture) */
    private long plan(String curriculum, int studyYear, int semester, String planType, String... courseCodes) {
        String planTypeSql = planType == null ? "NULL" : "'" + planType + "'";
        long id = jdbc.queryForObject("""
                INSERT INTO study_plan (department, curriculum_name, study_year, semester, plan_type)
                OUTPUT INSERTED.plan_id VALUES (?, ?, ?, ?, %s)""".formatted(planTypeSql),
                Long.class, CS, curriculum, studyYear, semester);
        for (int i = 0; i < courseCodes.length; i++) {
            jdbc.update("INSERT INTO study_plan_course (plan_id, course_code, sort_order) VALUES (?, ?, ?)",
                    id, courseCodes[i], i + 1);
        }
        return id;
    }

    private long minor(String curriculum, String minorName, int sortOrder) {
        return jdbc.queryForObject("""
                INSERT INTO study_minor (department, curriculum_name, minor_name, sort_order)
                OUTPUT INSERTED.minor_id VALUES (?, ?, ?, ?)""", Long.class, CS, curriculum, minorName, sortOrder);
    }

    private void minorCourse(long minorId, String code, int studyYear, int semester, int sortOrder) {
        jdbc.update("""
                INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
                VALUES (?, ?, 'CO_OP', ?, ?, ?)""", minorId, code, studyYear, semester, sortOrder);
    }

    /** ตาราง 2568/1 เดิมของนักศึกษา ตั้ง updated_at = OLD เพื่อตรวจว่าเปลี่ยนหรือไม่ */
    private void existingTimetable(String studentId, long... sectionIds) {
        long id = jdbc.queryForObject("""
                INSERT INTO timetable (student_id, academic_year, semester, updated_at)
                OUTPUT INSERTED.timetable_id VALUES (?, 2568, 1, CAST(? AS DATETIMEOFFSET))""", Long.class, studentId, OLD);
        for (long sectionId : sectionIds) {
            jdbc.update("INSERT INTO timetable_entry (timetable_id, section_id) VALUES (?, ?)", id, sectionId);
        }
    }

    private int countTimetables(String studentId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM timetable WHERE student_id = ?", Integer.class, studentId);
    }

    /** section_id ของทุก entry ในตาราง 2568/1 ของนักศึกษา */
    private List<Long> entries(String studentId) {
        return jdbc.queryForList("""
                SELECT e.section_id FROM timetable_entry e JOIN timetable t ON t.timetable_id = e.timetable_id
                WHERE t.student_id = ? AND t.academic_year = 2568 AND t.semester = 1""", Long.class, studentId);
    }

    private int totalCredits(String studentId) {
        return jdbc.queryForObject("""
                SELECT COALESCE(SUM(c.credits), 0) FROM timetable_entry e
                JOIN timetable t ON t.timetable_id = e.timetable_id
                JOIN section s ON s.section_id = e.section_id
                JOIN course c ON c.course_code = s.course_code
                WHERE t.student_id = ? AND t.academic_year = 2568 AND t.semester = 1""", Integer.class, studentId);
    }

    private boolean isOld(String studentId) {
        return jdbc.queryForObject("""
                SELECT COUNT(*) FROM timetable WHERE student_id = ? AND academic_year = 2568 AND semester = 1
                AND updated_at = CAST(? AS DATETIMEOFFSET)""", Integer.class, studentId, OLD) == 1;
    }

    /** timetable_entry ลบตามด้วย ON DELETE CASCADE */
    private void deleteTimetables() {
        jdbc.update("DELETE FROM timetable WHERE student_id IN (?, ?, ?)", S1, S2, S3);
    }
}
