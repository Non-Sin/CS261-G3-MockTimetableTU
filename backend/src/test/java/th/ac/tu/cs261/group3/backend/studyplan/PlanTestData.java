package th.ac.tu.cs261.group3.backend.studyplan;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** สร้าง entity ในหน่วยความจำสำหรับ unit test ของ US8 (ไม่ใช้ DB) */
final class PlanTestData {

    private static long nextSectionId = 1000;

    private PlanTestData() {
    }

    static Course course(String code, CourseCategory category, int credits) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(code + " NAME");
        course.setCategory(category);
        course.setCredits(credits);
        return course;
    }

    static ScheduleSlot slot(DayOfWeek day, String start, String end) {
        ScheduleSlot slot = new ScheduleSlot();
        slot.setDayOfWeek(day);
        slot.setStartTime(LocalTime.parse(start));
        slot.setEndTime(LocalTime.parse(end));
        slot.setRoom("R-" + start);
        return slot;
    }

    static Section section(Course course, String sectionNo, ScheduleSlot... slots) {
        Section section = new Section();
        section.setSectionId(nextSectionId++);
        section.setCourse(course);
        section.setSectionNo(sectionNo);
        section.setAcademicYear(2568);
        section.setSemester(1);
        List<ScheduleSlot> list = new ArrayList<>();
        for (ScheduleSlot slot : slots) {
            slot.setSection(section);
            list.add(slot);
        }
        section.setSlots(list);
        return section;
    }

    static PlanCourseCandidate plan(Course course, int order, Section... sections) {
        return new PlanCourseCandidate(course, PlanCourseSource.PLAN, order, List.of(sections));
    }

    static PlanCourseCandidate minor(Course course, int order, Section... sections) {
        return new PlanCourseCandidate(course, PlanCourseSource.MINOR, order, List.of(sections));
    }
}
