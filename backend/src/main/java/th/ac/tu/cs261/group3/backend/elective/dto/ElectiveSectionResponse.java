package th.ac.tu.cs261.group3.backend.elective.dto;

import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;

import java.util.List;

/**
 * การ์ด Sec ใน modal รายละเอียดวิชาเสรี (US6-T05)
 *
 * @param instructor   null ได้ UI แสดง "ไม่ระบุ"
 * @param selectable   Sec อยู่ในภาคของตารางปัจจุบัน
 * @param inTimetable  Sec นี้อยู่ในตารางปัจจุบันแล้ว
 * @param conflictWith รหัสวิชาในตารางปัจจุบันที่ชนกับ Sec นี้ ว่าง = ไม่ชน (Sec อีกภาคว่างเสมอ)
 */
public record ElectiveSectionResponse(
        Long sectionId,
        String sectionNo,
        int semester,
        String instructor,
        List<ScheduleSlotResponse> schedules,
        boolean selectable,
        boolean inTimetable,
        List<String> conflictWith
) {
    /** ต้องโหลด slots มาแล้ว · {@code inTimetable} และ {@code conflictWith} service คำนวณจากตารางปัจจุบัน */
    public static ElectiveSectionResponse from(Section section, int currentSemester,
                                               boolean inTimetable, List<String> conflictWith) {
        return new ElectiveSectionResponse(
                section.getSectionId(),
                section.getSectionNo(),
                section.getSemester(),
                section.getInstructor(),
                ScheduleSlotResponse.fromAll(section.getSlots()),
                section.getSemester() == currentSemester,
                inTimetable,
                List.copyOf(conflictWith)
        );
    }
}
