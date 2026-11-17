package th.ac.tu.cs261.group3.backend.quota.data;

import th.ac.tu.cs261.group3.backend.course.CourseCategory;

/** ข้อมูลรายวิชาที่ Service ต้องใช้ ไม่ผูก DTO กับ Entity ที่ T09 จะสร้างภายหลัง */
public record QuotaCourseData(
        String courseCode,
        String courseName,
        String courseNameTh,
        CourseCategory category,
        int credits) {
}
