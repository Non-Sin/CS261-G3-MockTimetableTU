package th.ac.tu.cs261.group3.backend.studyplan;

/**
 * แผนการเรียนของชั้นปี 3–4 เก็บใน {@code study_plan.plan_type} เป็นชื่อ enum (ใช้ {@code @Enumerated(EnumType.STRING)})
 * <p>
 * ลำดับการประกาศคือลำดับที่ใช้เรียง plans ใน StudyPlanService ({@code nullsFirst(naturalOrder())}) ห้ามสลับ
 * ค่าต้องตรงกับ CHECK constraint {@code ck_study_plan_plan_type} ใน migration
 */
public enum PlanType {
    /** หัวข้อพิเศษ */
    SPECIAL_PROJECT,
    /** สหกิจศึกษา */
    CO_OP
}
