package th.ac.tu.cs261.group3.backend.studyplan;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;

import java.util.List;

/**
 * วิชา 1 วิชาที่ ApplyPlanService เตรียมให้ PlanScheduler (record ภายใน ไม่ส่งออกผ่าน API)
 *
 * @param planOrder ลำดับในแผนหลัก/วิชาโท ({@code sortOrder}) ใช้ tie-break
 * @param sections  section ทั้งหมดของวิชาในภาคที่ขอ ว่าง = {@code NO_SECTION_AVAILABLE}
 */
public record PlanCourseCandidate(
        Course course,
        PlanCourseSource source,
        int planOrder,
        List<Section> sections
) {
    public PlanCourseCandidate {
        sections = List.copyOf(sections);
    }
}
