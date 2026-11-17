package th.ac.tu.cs261.group3.backend.quota;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaCourseData;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDetailsData;
import th.ac.tu.cs261.group3.backend.quota.dto.*;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

final class QuotaTestData {

    static final String STUDENT = "6609000001";

    static QuotaCourseData course(String code) {
        return new QuotaCourseData(code, code + " NAME", null, CourseCategory.GENERAL_EDUCATION, 3);
    }

    static QuotaDetailsData details(Boolean required, List<Integer> offered) {
        return new QuotaDetailsData(offered, required, List.of(), List.of(), List.of(), List.of());
    }

    static QuotaDetailsData completeDetails() {
        return new QuotaDetailsData(List.of(1, 2), true,
                List.of(new QuotaConditionResponse("ต้องสอบได้ EL295", "EL295")),
                List.of(new QuotaRoundResponse(1, null, null, LocalDate.of(2025, 8, 20), LocalTime.of(15, 0))),
                List.of(
                        new QuotaChannelResponse(QuotaChannelType.ONLINE_FORM, "แบบฟอร์ม", "https://example.com/quota", null),
                        new QuotaChannelResponse(QuotaChannelType.FACULTY_OFFICE, "ยื่นที่คณะ", null, "ติดต่อในเวลาราชการ")),
                List.of(new QuotaContactResponse("คณะทดสอบ", "ติดต่อที่คณะ", null)));
    }

    static QuotaCourseResponse requiredResponse() {
        return QuotaCourseResponse.required(course("EL395"), false, List.of(1, 2), completeDetails());
    }

    static Timetable timetable(long id) {
        Timetable timetable = new Timetable();
        timetable.setTimetableId(id);
        timetable.setStudentId(STUDENT);
        timetable.setAcademicYear(2568);
        timetable.setSemester(1);
        return timetable;
    }

    static TimetableEntry entry(String code) {
        Course course = new Course();
        course.setCourseCode(code);
        Section section = new Section();
        section.setCourse(course);
        TimetableEntry entry = new TimetableEntry();
        entry.setSection(section);
        return entry;
    }
}
