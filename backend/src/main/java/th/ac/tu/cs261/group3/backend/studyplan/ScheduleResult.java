package th.ac.tu.cs261.group3.backend.studyplan;

import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.studyplan.dto.SkippedPlanCourseResponse;

import java.util.List;

/**
 * ผลของ {@link PlanScheduler#schedule} (record ภายใน) ทั้งสอง list เรียงตามลำดับในแผน
 * <p>
 * {@code added} เก็บ section คู่กับ {@code source} เพราะ ApplyPlanService ต้องใช้ทั้ง section (บันทึก)
 * และ source (สร้าง AddedPlanCourseResponse)
 */
public record ScheduleResult(
        List<Added> added,
        List<SkippedPlanCourseResponse> skipped
) {
    public ScheduleResult {
        added = List.copyOf(added);
        skipped = List.copyOf(skipped);
    }

    /** section ตัวแทนของกลุ่มเวลาที่เลือก */
    public record Added(Section section, PlanCourseSource source) {}

    public List<Section> addedSections() {
        return added.stream().map(Added::section).toList();
    }
}
