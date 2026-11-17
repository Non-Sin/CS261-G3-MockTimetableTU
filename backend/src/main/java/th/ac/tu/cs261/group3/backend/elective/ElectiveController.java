package th.ac.tu.cs261.group3.backend.elective;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveDetailResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSearchCriteria;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSummaryResponse;

import java.util.List;

/**
 * วิชาเสรีแนะนำ (US6-T05) ต้อง login ทุก endpoint (ไม่มี token ตอบ 401 จาก SecurityConfig)
 * <p>
 * param บังคับหาย, ไม่ใช่ตัวเลข หรือ enum/boolean ผิดค่า ตอบ 400 ProblemDetail
 * (ResponseEntityExceptionHandler ที่ GlobalExceptionHandler สืบทอดมาจัดการให้)
 */
@RestController
@RequestMapping("/api/electives")
@RequiredArgsConstructor
public class ElectiveController {

    private final ElectiveService electiveService;
    private final CurrentStudentProvider currentStudentProvider;

    /** {@code currentSemester} = ภาคของตารางที่เปิดอยู่ ไม่ใช่ dropdown "ภาคเรียน" ({@code semester}) */
    @GetMapping
    public List<ElectiveSummaryResponse> search(@RequestParam int academicYear,
                                                @RequestParam int currentSemester,
                                                @ModelAttribute ElectiveSearchCriteria criteria) {
        return electiveService.search(currentStudentProvider.currentStudentId(), academicYear, currentSemester, criteria);
    }

    @GetMapping("/{courseCode}")
    public ElectiveDetailResponse getDetail(@PathVariable String courseCode,
                                            @RequestParam int academicYear,
                                            @RequestParam int currentSemester) {
        return electiveService.getDetail(currentStudentProvider.currentStudentId(), courseCode, academicYear,
                currentSemester);
    }
}
