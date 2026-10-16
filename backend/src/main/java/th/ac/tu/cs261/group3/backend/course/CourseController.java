package th.ac.tu.cs261.group3.backend.course;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import th.ac.tu.cs261.group3.backend.course.dto.CourseResponse;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService courseService;

    /**
     * ไม่ส่ง academicYear/semester หรือส่ง category ผิดค่า ตอบ 400 ProblemDetail
     * (ResponseEntityExceptionHandler ที่ GlobalExceptionHandler สืบทอดมาจัดการให้)
     */
    @GetMapping
    public List<CourseResponse> getCourses(@RequestParam int academicYear,
                                           @RequestParam int semester,
                                           @RequestParam(required = false) String q,
                                           @RequestParam(required = false) CourseCategory category) {
        return courseService.search(academicYear, semester, q, category);
    }
}
