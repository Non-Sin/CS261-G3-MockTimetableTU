package th.ac.tu.cs261.group3.backend.course.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.Section;

import java.util.List;

/** การ์ดวิชาใน GET /api/courses */
public record CourseResponse(
        String courseCode,
        String courseName,
        CourseCategory category,
        int credits,
        List<SectionResponse> sections
) {
    /**
     * รับ {@code sections} แยก เพราะ {@link Course} ไม่มี collection กลุ่มเรียน
     * CourseService ส่งกลุ่มเรียนของภาคที่ค้นจาก SectionRepository.findByCourseCodesAndTerm มาให้
     */
    public static CourseResponse from(Course course, List<Section> sections) {
        return new CourseResponse(
                course.getCourseCode(),
                course.getCourseName(),
                course.getCategory(),
                course.getCredits(),
                sections.stream().map(SectionResponse::from).toList()
        );
    }
}
