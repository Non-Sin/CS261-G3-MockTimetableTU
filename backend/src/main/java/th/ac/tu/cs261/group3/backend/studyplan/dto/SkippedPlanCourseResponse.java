package th.ac.tu.cs261.group3.backend.studyplan.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;

import java.util.List;

/**
 * วิชาที่ข้าม field เสริมมีค่าเฉพาะ {@code reason} ที่เกี่ยวข้อง ที่เหลือเป็น null และไม่ส่งใน JSON
 * สร้างผ่าน factory 1 ตัวต่อ 1 reason จึงไม่มี object ที่ field ไม่ตรงกับ reason
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SkippedPlanCourseResponse(
        String courseCode,
        String courseName,
        CourseCategory category,
        int credits,
        PlanCourseSource source,
        PlanSkipReason reason,
        String message,
        List<String> conflictWith,
        String existingSectionNo,
        Integer currentCredits,
        Integer maxCredits
) {
    public static SkippedPlanCourseResponse alreadyInTimetable(Course course, PlanCourseSource source,
                                                               String existingSectionNo) {
        return of(course, source, PlanSkipReason.COURSE_ALREADY_IN_TIMETABLE,
                "%s อยู่ในตารางแล้ว (Sec %s)".formatted(course.getCourseCode(), existingSectionNo),
                null, existingSectionNo, null, null);
    }

    public static SkippedPlanCourseResponse noSectionAvailable(Course course, PlanCourseSource source) {
        return of(course, source, PlanSkipReason.NO_SECTION_AVAILABLE,
                "%s ไม่เปิดสอนในภาคเรียนนี้".formatted(course.getCourseCode()),
                null, null, null, null);
    }

    /** @param currentCredits หน่วยกิตของตารางสุดท้าย (เดิม + ที่เพิ่ม) */
    public static SkippedPlanCourseResponse creditLimitExceeded(Course course, PlanCourseSource source,
                                                                int currentCredits, int maxCredits) {
        return of(course, source, PlanSkipReason.CREDIT_LIMIT_EXCEEDED,
                "เพิ่ม %s (%d หน่วยกิต) แล้วจะเป็น %d หน่วยกิต เกินเพดาน %d หน่วยกิต".formatted(
                        course.getCourseCode(), course.getCredits(), currentCredits + course.getCredits(), maxCredits),
                null, null, currentCredits, maxCredits);
    }

    /** @param conflictWith รหัสวิชาในตารางสุดท้ายที่ชน ไม่ซ้ำ เรียงตามลำดับในตาราง */
    public static SkippedPlanCourseResponse timeConflict(Course course, PlanCourseSource source,
                                                         List<String> conflictWith) {
        return of(course, source, PlanSkipReason.TIME_CONFLICT,
                "%s ทุกกลุ่มเรียนเวลาชนกับ %s".formatted(course.getCourseCode(), String.join(", ", conflictWith)),
                List.copyOf(conflictWith), null, null, null);
    }

    private static SkippedPlanCourseResponse of(Course course, PlanCourseSource source, PlanSkipReason reason,
                                                String message, List<String> conflictWith,
                                                String existingSectionNo, Integer currentCredits,
                                                Integer maxCredits) {
        return new SkippedPlanCourseResponse(course.getCourseCode(), course.getCourseName(), course.getCategory(),
                course.getCredits(), source, reason, message, conflictWith, existingSectionNo,
                currentCredits, maxCredits);
    }
}
