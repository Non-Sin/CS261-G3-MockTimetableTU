package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanListResponse;

/**
 * แผนการเรียน (US8) ของนักศึกษาที่ login อยู่
 * <p>
 * <b>ห้ามใส่ {@code @Validated} ที่ class</b> Spring Boot 4 ตรวจ {@code @Min}/{@code @Max} บน {@code @RequestParam}
 * ให้เองแล้วตอบ 400 ถ้าใส่ จะได้ ConstraintViolationException ซึ่งตกไปที่ handleUnexpected แล้วตอบ 500
 */
@RestController
@RequestMapping("/api/study-plans")
@RequiredArgsConstructor
public class StudyPlanController {

    private final StudyPlanService studyPlanService;
    private final CurrentStudentProvider currentStudentProvider;

    @GetMapping
    public StudyPlanListResponse getPlans(@RequestParam @Min(1) @Max(4) int studyYear,
                                          @RequestParam @Min(1) @Max(2) int semester) {
        return studyPlanService.getPlans(currentStudentProvider.currentStudentId(), studyYear, semester);
    }
}
