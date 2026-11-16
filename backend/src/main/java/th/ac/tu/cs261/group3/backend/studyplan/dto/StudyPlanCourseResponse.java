package th.ac.tu.cs261.group3.backend.studyplan.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;

/** วิชาใน preset / วิชาโท ยังไม่มีข้อมูล section ใช้ซ้ำทั้งสองที่ */
public record StudyPlanCourseResponse(
        String courseCode,
        String courseName,
        CourseCategory category,
        int credits
) {
    public static StudyPlanCourseResponse from(Course course) {
        return new StudyPlanCourseResponse(course.getCourseCode(), course.getCourseName(),
                course.getCategory(), course.getCredits());
    }
}
