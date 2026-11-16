package th.ac.tu.cs261.group3.backend.studyplan.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.studyplan.PlanType;
import th.ac.tu.cs261.group3.backend.studyplan.StudyPlan;

import java.util.List;

/**
 * preset 1 หลักสูตร (ปี 3–4 = 1 หลักสูตร × 1 แผน)
 * {@code planType} เป็น null สำหรับปี 1–2 และส่ง {@code "planType": null} ใน JSON (ไม่ใส่ NON_NULL)
 */
public record StudyPlanResponse(
        Long planId,
        String curriculumName,
        int studyYear,
        int semester,
        PlanType planType,
        int totalCredits,
        List<StudyPlanCourseResponse> courses
) {
    /**
     * @param courses วิชาของแผนที่เรียงตาม sortOrder แล้ว {@code totalCredits} คำนวณจากผลรวม credits
     */
    public static StudyPlanResponse of(StudyPlan plan, List<Course> courses) {
        List<StudyPlanCourseResponse> items = courses.stream().map(StudyPlanCourseResponse::from).toList();
        return new StudyPlanResponse(plan.getPlanId(), plan.getCurriculumName(), plan.getStudyYear(),
                plan.getSemester(), plan.getPlanType(), sumCredits(items), items);
    }

    static int sumCredits(List<StudyPlanCourseResponse> courses) {
        return courses.stream().mapToInt(StudyPlanCourseResponse::credits).sum();
    }
}
