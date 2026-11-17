package th.ac.tu.cs261.group3.backend.studyplan.dto;

import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.util.List;

/**
 * ผลของ POST /api/timetable/apply-plan ทั้งสองโหมด ไม่ใส่ NON_NULL เพราะต้องส่ง
 * {@code "timetable": null} ตอน dryRun และ {@code "minorId": null} เมื่อไม่เลือกวิชาโท
 */
public record ApplyPlanResponse(
        Long planId,
        Long minorId,
        boolean dryRun,
        List<AddedPlanCourseResponse> added,
        List<SkippedPlanCourseResponse> skipped,
        TimetableResponse timetable
) {
    public ApplyPlanResponse {
        added = List.copyOf(added);
        skipped = List.copyOf(skipped);
    }
}
