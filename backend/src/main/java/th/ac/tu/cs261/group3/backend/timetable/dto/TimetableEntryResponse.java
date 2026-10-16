package th.ac.tu.cs261.group3.backend.timetable.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;

import java.util.List;

/** วิชาในตาราง 1 รายการ ใช้วาดบล็อกใน grid และป้ายบนการ์ดวิชา */
public record TimetableEntryResponse(
        Long entryId,
        String courseCode,
        String courseName,
        CourseCategory category,
        int credits,
        Long sectionId,
        String sectionNo,
        List<ScheduleSlotResponse> schedules,
        List<String> conflictWith
) {
    /**
     * ต้องโหลด section, course และ slots มาแล้ว (TimetableEntryRepository.findByTimetableId)
     *
     * @param conflictWith รหัสวิชาที่ชนด้วย list ว่าง = ไม่ชน
     */
    public static TimetableEntryResponse from(TimetableEntry entry, List<String> conflictWith) {
        Section section = entry.getSection();
        Course course = section.getCourse();
        return new TimetableEntryResponse(
                entry.getEntryId(),
                course.getCourseCode(),
                course.getCourseName(),
                course.getCategory(),
                course.getCredits(),
                section.getSectionId(),
                section.getSectionNo(),
                ScheduleSlotResponse.fromAll(section.getSlots()),
                List.copyOf(conflictWith)
        );
    }
}
