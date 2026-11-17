package th.ac.tu.cs261.group3.backend.quota;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaCourseResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaSearchResponse;

@RestController
@RequestMapping("/api/quota")
@RequiredArgsConstructor
// ไม่ใส่ @Validated: ให้ Spring MVC ตรวจ query parameters และตอบ 400 ตาม T05
public class QuotaController {

    private final QuotaService quotaService;
    private final CurrentStudentProvider currentStudentProvider;

    @GetMapping("/courses")
    public QuotaSearchResponse searchCourses(
            @RequestParam int academicYear,
            @RequestParam @Min(1) @Max(2) int semester,
            @RequestParam(required = false) @Size(max = 50) String q,
            @RequestParam(defaultValue = "false") boolean mine) {
        return quotaService.searchCourses(currentStudentProvider.currentStudentId(), academicYear, semester, q, mine);
    }

    @GetMapping("/courses/{courseCode}")
    public QuotaCourseResponse getCourseQuota(
            @PathVariable String courseCode,
            @RequestParam int academicYear,
            @RequestParam @Min(1) @Max(2) int semester) {
        return quotaService.getCourseQuota(currentStudentProvider.currentStudentId(), courseCode, academicYear, semester);
    }
}
