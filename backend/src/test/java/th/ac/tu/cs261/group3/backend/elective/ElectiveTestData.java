package th.ac.tu.cs261.group3.backend.elective;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableEntryResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;

import static java.time.DayOfWeek.*;
import static th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture.*;

/**
 * ข้อมูลทดสอบของ US6-T08 แบบ object ในหน่วยความจำ (ไม่ใช้ DB)
 * <p>
 * จำลอง Test Fixture F0 ของ {@link th.ac.tu.cs261.group3.backend.support.ElectiveDaoFixture} (US6-T09 / US6-T12)
 * เฉพาะวิชาที่ผ่าน eligibility (repository ถูก mock จึงไม่ต้องมีวิชาที่ query ตัดทิ้ง) ใช้รหัสวิชา ภาค
 * Sec วันเวลา ผู้สอน ห้อง และรีวิวชุดเดียวกัน section_id กำหนดเองตาม key ของ T12
 * <pre>
 * T6FR205 LANGUAGE   quota  S-F1 1/260001 อ.,พฤ. 16:30-18:00 SC3-M10 · S-F2 1/260002 อ. 19:00-20:00 · S-F3 2/260003 จ. 09:30-12:30
 * T6NT001 LANGUAGE          S-N1 1/010001 พ. 09:30-12:30
 * T6PY250 PSYCHOLOGY        S-P1 1/820001 จ. 13:30-16:30 LC1-201 · S-P2 2/230001 อ. 09:30-12:30
 * T6SO101 SOCIETY           S-S1 1/010001 ศ. 13:30-16:30
 * T6EL001 SCIENCE           S-E1 1/010001 ไม่มีคาบ (e-learning)
 * T6ME101 MEDIA             S-M1 1/010001 ส. 08:00-10:00
 * T6X001  SCIENCE           S-X1 1/010001 อ. 08:00-09:00
 * </pre>
 */
final class ElectiveTestData {

    static final int YEAR = 2568;

    /** key ของ T12 → section_id */
    static final Map<String, Long> SEC = Map.ofEntries(
            Map.entry("S-F1", 11L), Map.entry("S-F2", 12L), Map.entry("S-F3", 13L),
            Map.entry("S-N1", 21L),
            Map.entry("S-P1", 31L), Map.entry("S-P2", 32L),
            Map.entry("S-S1", 41L), Map.entry("S-E1", 51L), Map.entry("S-M1", 61L), Map.entry("S-X1", 71L));

    final Map<String, ElectiveInfo> infos = new LinkedHashMap<>();
    final Map<String, Section> sections = new LinkedHashMap<>();

    private ElectiveTestData() {
    }

    static ElectiveTestData f0() {
        ElectiveTestData d = new ElectiveTestData();
        ElectiveInfo f = d.info(F, "FRENCH FOR EVERYDAY LIFE", F_NAME_TH, InterestGroup.LANGUAGE, true,
                List.of(ElectiveTag.NO_PREREQUISITE, ElectiveTag.KIND_INSTRUCTOR), REVIEW_F0, REVIEW_F1);
        ElectiveInfo n = d.info(N, "INTRODUCTION TO COMMUNICATION", "การสื่อสารเบื้องต้น", InterestGroup.LANGUAGE,
                false, List.of(), defaultReview(N));
        ElectiveInfo p = d.info(P, "PSYCHOLOGY OF PERSONALITY AND ADJUSTMENT", P_NAME_TH, InterestGroup.PSYCHOLOGY,
                false, List.of(ElectiveTag.NO_GROUP_WORK, ElectiveTag.NO_ATTENDANCE), defaultReview(P));
        ElectiveInfo s = d.info(S, "SOCIETY AND HEALTH", "สังคมและสุขภาพ", InterestGroup.SOCIETY,
                false, List.of(), defaultReview(S));
        ElectiveInfo e = d.info(E, "ONLINE SCIENCE", "วิทยาศาสตร์ออนไลน์", InterestGroup.SCIENCE,
                false, List.of(), defaultReview(E));
        ElectiveInfo m = d.info(M, "OBJECT-ORIENTED MEDIA WORKSHOP", "การสื่อดิจิทัลเชิงวัตถุ", InterestGroup.MEDIA,
                false, List.of(), defaultReview(M));
        ElectiveInfo x = d.info(X, "DATA 100%_! [LAB] BASICS", "ข้อมูลทดสอบอักขระพิเศษ", InterestGroup.SCIENCE,
                false, List.of(), defaultReview(X));

        // ลำดับเดียวกับ fixture (ไม่เรียง semester/sectionNo โดยตั้งใจ)
        d.section("S-F2", f, 1, "260002", null, slot(TUESDAY, "19:00", "20:00", null));
        d.section("S-F1", f, 1, "260001", F_INSTRUCTOR,
                slot(THURSDAY, "16:30", "18:00", "SC3-M10"), slot(TUESDAY, "16:30", "18:00", "SC3-M10"));
        d.section("S-F3", f, 2, "260003", null, slot(MONDAY, "09:30", "12:30", null));
        d.section("S-P2", p, 2, "230001", null, slot(TUESDAY, "09:30", "12:30", null));
        d.section("S-P1", p, 1, "820001", P_INSTRUCTOR, slot(MONDAY, "13:30", "16:30", "LC1-201"));
        d.section("S-N1", n, 1, "010001", null, slot(WEDNESDAY, "09:30", "12:30", null));
        d.section("S-S1", s, 1, "010001", null, slot(FRIDAY, "13:30", "16:30", null));
        d.section("S-E1", e, 1, "010001", null);
        d.section("S-M1", m, 1, "010001", null, slot(SATURDAY, "08:00", "10:00", null));
        d.section("S-X1", x, 1, "010001", null, slot(TUESDAY, "08:00", "09:00", null));
        return d;
    }

    /** ElectiveInfo ตามลำดับ code ที่ส่ง (ใช้เป็นผลของ repository ที่ไม่เรียงลำดับ) */
    List<ElectiveInfo> infos(String... codes) {
        return Arrays.stream(codes).map(infos::get).toList();
    }

    /** Section ทั้งหมดของวิชาที่ส่ง ตามลำดับที่สร้าง */
    List<Section> sectionsOf(String... codes) {
        List<String> wanted = List.of(codes);
        return sections.values().stream()
                .filter(s -> wanted.contains(s.getCourse().getCourseCode()))
                .toList();
    }

    Section sec(String key) {
        return sections.get(key);
    }

    ElectiveInfo info(String code, String nameEn, String nameTh, InterestGroup group, boolean quota,
                      List<ElectiveTag> tags, String... reviews) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(nameEn);
        course.setCategory(CourseCategory.FREE_ELECTIVE);
        course.setCredits(3);

        ElectiveInfo info = new ElectiveInfo();
        info.setCourseCode(code);
        info.setCourse(course);
        info.setCourseNameTh(nameTh);
        info.setInterestGroup(group);
        info.setRequiresQuota(quota);
        info.setTags(new LinkedHashSet<>(tags));
        info.setDescription(new ArrayList<>(List.of(reviews)));
        infos.put(code, info);
        return info;
    }

    Section section(String key, ElectiveInfo info, int semester, String sectionNo, String instructor,
                    ScheduleSlot... slots) {
        Section section = new Section();
        section.setSectionId(SEC.getOrDefault(key, 900L + sections.size()));
        section.setCourse(info.getCourse());
        section.setAcademicYear(YEAR);
        section.setSemester(semester);
        section.setSectionNo(sectionNo);
        section.setInstructor(instructor);
        List<ScheduleSlot> list = new ArrayList<>();
        for (ScheduleSlot slot : slots) {
            slot.setSection(section);
            list.add(slot);
        }
        section.setSlots(list);
        sections.put(key, section);
        return section;
    }

    static ScheduleSlot slot(DayOfWeek day, String start, String end, String room) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom(room);
        return slot;
    }

    // ---------- ตารางปัจจุบัน (ผลของ TimetableService.getTimetable ที่ถูก mock) ----------

    static TimetableResponse emptyTimetable() {
        return timetable();
    }

    static TimetableResponse timetable(TimetableEntryResponse... entries) {
        return TimetableResponse.of(YEAR, 1, List.of(entries), 22, List.of(), null);
    }

    /** entry ของวิชาอื่นในตาราง คาบเดียว */
    static TimetableEntryResponse entry(String courseCode, long sectionId, DayOfWeek day, String start, String end) {
        return entry(courseCode, sectionId, new ScheduleSlotResponse(day, LocalTime.parse(start), LocalTime.parse(end), null));
    }

    static TimetableEntryResponse entry(String courseCode, long sectionId, ScheduleSlotResponse... slots) {
        return new TimetableEntryResponse(sectionId, courseCode, courseCode + " NAME", CourseCategory.MAJOR, 3,
                sectionId, "000001", List.of(slots), List.of());
    }

    /** entry ที่เป็น Sec ของ fixture (ใช้ตรวจ inTimetable / วิชาที่อยู่ในตารางแล้ว) */
    static TimetableEntryResponse entryOf(Section section) {
        return new TimetableEntryResponse(section.getSectionId(), section.getCourse().getCourseCode(),
                section.getCourse().getCourseName(), CourseCategory.FREE_ELECTIVE, 3, section.getSectionId(),
                section.getSectionNo(), ScheduleSlotResponse.fromAll(section.getSlots()), List.of());
    }
}
