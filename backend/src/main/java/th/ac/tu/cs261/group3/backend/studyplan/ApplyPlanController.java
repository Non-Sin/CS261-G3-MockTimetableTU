package th.ac.tu.cs261.group3.backend.studyplan;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanRequest;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanResponse;

/**
 * จัดตารางตามแผน (US8) แยกจาก TimetableController ของ US1 แบบเดียวกับ TimetableDeleteController ของ US2
 * ใช้ path ขึ้นต้น {@code /api/timetable} ร่วมกันได้เพราะ method + path ไม่ซ้ำ ตอบ 200 ทั้ง dryRun และยืนยัน
 */
@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
public class ApplyPlanController {

    private final ApplyPlanService applyPlanService;
    private final CurrentStudentProvider currentStudentProvider;

    @PostMapping("/apply-plan")
    public ApplyPlanResponse applyPlan(@Valid @RequestBody ApplyPlanRequest request) {
        return applyPlanService.applyPlan(currentStudentProvider.currentStudentId(), request);
    }
}
