package th.ac.tu.cs261.group3.backend.course.dto;

import th.ac.tu.cs261.group3.backend.course.Section;

import java.util.List;

/** กลุ่มเรียนบนการ์ดวิชา ปุ่ม "+ เพิ่มวิชา" ส่ง {@code sectionId} ไป POST /api/timetable/entries */
public record SectionResponse(
        Long sectionId,
        String sectionNo,
        String instructor,
        List<ScheduleSlotResponse> schedules
) {
    /** ต้องโหลด {@code slots} มาแล้ว (SectionRepository.findById / findByCourseCodesAndTerm) */
    public static SectionResponse from(Section section) {
        return new SectionResponse(
                section.getSectionId(),
                section.getSectionNo(),
                section.getInstructor(),
                ScheduleSlotResponse.fromAll(section.getSlots())
        );
    }
}
