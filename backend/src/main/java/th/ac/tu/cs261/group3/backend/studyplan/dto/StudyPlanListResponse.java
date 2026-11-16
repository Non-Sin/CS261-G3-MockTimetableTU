package th.ac.tu.cs261.group3.backend.studyplan.dto;

import java.util.List;

/** ผลของ GET /api/study-plans ไม่พบแผนได้ {@code plans: []} ปี 1–2 ได้ {@code minors: []} เสมอ */
public record StudyPlanListResponse(
        String department,
        int studyYear,
        int semester,
        List<StudyPlanResponse> plans,
        List<StudyMinorResponse> minors
) {
    public StudyPlanListResponse {
        plans = List.copyOf(plans);
        minors = List.copyOf(minors);
    }
}
