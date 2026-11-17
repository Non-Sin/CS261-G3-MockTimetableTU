package th.ac.tu.cs261.group3.backend.studyplan.dto;

/**
 * เหตุผลที่ข้ามวิชา 2 ค่าแรกได้จากขั้นกรองก่อนค้นหา 2 ค่าหลังได้จากการเทียบกับตารางสุดท้าย
 * ({@code TIME_CONFLICT} เกิดในขั้นกรองได้ด้วย เมื่อทุก section ชนกับตารางเดิม)
 */
public enum PlanSkipReason {
    COURSE_ALREADY_IN_TIMETABLE,
    NO_SECTION_AVAILABLE,
    CREDIT_LIMIT_EXCEEDED,
    TIME_CONFLICT
}
