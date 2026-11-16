package th.ac.tu.cs261.group3.backend.studyplan.dto;

import jakarta.validation.constraints.NotNull;

/**
 * body ของ POST /api/timetable/apply-plan ภาคเรียนอ่านจาก preset จึงไม่ต้องส่งมา
 *
 * @param minorId      null = ไม่เรียนวิชาโท
 * @param academicYear ใช้ Integer ให้ {@code @NotNull} ตรวจได้ (int จะได้ 0 เมื่อไม่ส่ง)
 * @param dryRun       ไม่ส่ง/null = false · ใช้ {@code Boolean} แทน {@code boolean} ตาม DTO Class Diagram
 *                     เพราะ Jackson 3 ของ Spring Boot 4 ตอบ 400 เมื่อ record ที่มี field primitive ไม่ได้ส่งค่านั้นมา
 *                     (FAIL_ON_NULL_FOR_PRIMITIVES เปิดเป็นค่าเริ่มต้น) constructor แปลง null เป็น false ให้ จึงไม่เป็น null
 */
public record ApplyPlanRequest(
        @NotNull Long planId,
        Long minorId,
        @NotNull Integer academicYear,
        Boolean dryRun
) {
    public ApplyPlanRequest {
        dryRun = Boolean.TRUE.equals(dryRun);
    }
}
