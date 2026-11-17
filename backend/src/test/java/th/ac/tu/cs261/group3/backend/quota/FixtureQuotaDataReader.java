package th.ac.tu.cs261.group3.backend.quota;

import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaCourseData;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDataReader;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDetailsData;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** ข้อมูลเฉพาะ Postman test server ไม่ถูกบรรจุใน production WAR และไม่ใช่การทดสอบ SQL */
final class FixtureQuotaDataReader implements QuotaDataReader {

    private final Map<String, QuotaCourseData> catalog = new LinkedHashMap<>();

    FixtureQuotaDataReader() {
        add("EL395", "ACADEMIC ENGLISH AND STUDY SKILL 2", "ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2", CourseCategory.GENERAL_EDUCATION);
        add("EL295", "ACADEMIC ENGLISH AND STUDY SKILL 1", "ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1", CourseCategory.GENERAL_EDUCATION);
        add("MA211", "CALCULUS 1", "แคลคูลัส 1", CourseCategory.MAJOR);
        add("LAS101", "CRITICAL THINKING, READING, AND WRITING", "การคิดเชิงวิพากษ์ การอ่าน และการเขียน", CourseCategory.GENERAL_EDUCATION);
        add("CS232", "DATA STRUCTURES", "โครงสร้างข้อมูล", CourseCategory.MAJOR);
        add("FR205", "FRENCH FOR EVERYDAY LIFE", "ภาษาฝรั่งเศสในชีวิตประจำวัน", CourseCategory.FREE_ELECTIVE);
        add("TU101", "THAILAND, ASEAN, AND THE WORLD", null, CourseCategory.GENERAL_EDUCATION);
        add("SP001", "DATA 100%_! [LAB] BASICS", "วิชาทดสอบ 100%_! [LAB]", CourseCategory.FREE_ELECTIVE);
        for (int i = 0; i < 55; i++) add("ZZ%03d".formatted(i), "QUOTA LIMIT FIXTURE", null, CourseCategory.FREE_ELECTIVE);
    }

    private void add(String code, String name, String nameTh, CourseCategory category) {
        catalog.put(code, new QuotaCourseData(code, name, nameTh, category, 3));
    }

    @Override
    public List<QuotaCourseData> searchCourses(String q, Set<String> courseCodes) {
        return catalog.values().stream()
                .filter(course -> courseCodes == null || courseCodes.contains(course.courseCode()))
                .filter(course -> matches(course, q))
                .toList();
    }

    private boolean matches(QuotaCourseData course, String q) {
        if (q == null) return true;
        String query = q.toUpperCase(Locale.ROOT);
        if (course.courseCode().toUpperCase(Locale.ROOT).startsWith(query)) return true;
        for (String word : course.courseName().toUpperCase(Locale.ROOT).split("[\\s-]+")) {
            if (word.startsWith(query)) return true;
        }
        return course.courseNameTh() != null && course.courseNameTh().contains(q);
    }

    @Override
    public Optional<QuotaCourseData> findCourse(String normalizedCode) {
        return Optional.ofNullable(catalog.get(normalizedCode));
    }

    @Override
    public Map<String, QuotaDetailsData> loadDetails(List<String> codes, int academicYear, int semester) {
        Map<String, QuotaDetailsData> result = new LinkedHashMap<>();
        for (String code : codes) {
            List<Integer> offered = academicYear != 2568 ? List.of() : code.equals("FR205") ? List.of(1) : List.of(1, 2);
            if (code.equals("CS232")) result.put(code, QuotaTestData.details(false, offered));
            else if (code.equals("TU101") || code.startsWith("ZZ") || code.equals("SP001")) {
                result.put(code, QuotaTestData.details(null, offered));
            } else {
                QuotaDetailsData full = QuotaTestData.completeDetails();
                result.put(code, new QuotaDetailsData(offered, true, full.conditions(),
                        code.equals("FR205") ? List.of() : full.rounds(), full.channels(), full.contacts()));
            }
        }
        return result;
    }
}
