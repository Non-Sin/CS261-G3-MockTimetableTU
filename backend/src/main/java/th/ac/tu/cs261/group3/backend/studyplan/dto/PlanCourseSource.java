package th.ac.tu.cs261.group3.backend.studyplan.dto;

/**
 * วิชามาจากแผนหลัก ({@code PLAN}) หรือวิชาโท ({@code MINOR})
 * ลำดับการประกาศคือลำดับความสำคัญใน PlanScheduler (PLAN มาก่อน) ห้ามสลับ
 */
public enum PlanCourseSource {
    PLAN,
    MINOR
}
