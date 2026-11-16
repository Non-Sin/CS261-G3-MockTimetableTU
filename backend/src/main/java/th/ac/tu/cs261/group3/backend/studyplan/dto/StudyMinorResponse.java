package th.ac.tu.cs261.group3.backend.studyplan.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.studyplan.PlanType;
import th.ac.tu.cs261.group3.backend.studyplan.StudyMinor;

import java.util.List;

/**
 * วิชาโท 1 ตัวเลือกของ 1 แผน ({@code planType}) วิชาโทเดียวกันมีได้ 2 รายการที่ minorId เดียวกัน
 * {@code courses} / {@code totalCredits} เฉพาะวิชาของแผน + ชั้นปี + ภาคที่ขอ ไม่ใช่ทั้งวิชาโท
 */
public record StudyMinorResponse(
        Long minorId,
        PlanType planType,
        String curriculumName,
        String minorName,
        int totalCredits,
        List<StudyPlanCourseResponse> courses
) {
    /** @param courses ผลของ {@code minor.coursesOf(planType, studyYear, semester)} ที่เรียงตาม sortOrder แล้ว */
    public static StudyMinorResponse of(StudyMinor minor, PlanType planType, List<Course> courses) {
        List<StudyPlanCourseResponse> items = courses.stream().map(StudyPlanCourseResponse::from).toList();
        return new StudyMinorResponse(minor.getMinorId(), planType, minor.getCurriculumName(),
                minor.getMinorName(), StudyPlanResponse.sumCredits(items), items);
    }
}
