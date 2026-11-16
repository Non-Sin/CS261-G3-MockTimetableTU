package th.ac.tu.cs261.group3.backend.studyplan.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.Section;

/** วิชาที่จะเพิ่ม/เพิ่มแล้ว พร้อม section ตัวแทนของกลุ่มเวลาที่ PlanScheduler เลือก */
public record AddedPlanCourseResponse(
        String courseCode,
        String courseName,
        CourseCategory category,
        int credits,
        PlanCourseSource source,
        Long sectionId,
        String sectionNo
) {
    public static AddedPlanCourseResponse from(Section section, PlanCourseSource source) {
        Course course = section.getCourse();
        return new AddedPlanCourseResponse(course.getCourseCode(), course.getCourseName(), course.getCategory(),
                course.getCredits(), source, section.getSectionId(), section.getSectionNo());
    }
}
