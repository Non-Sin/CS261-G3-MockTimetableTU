package th.ac.tu.cs261.group3.backend.course;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.course.dto.CourseResponse;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;

    /**
     * วิชาที่เปิดในปี/ภาคที่เลือก พร้อมกลุ่มเรียนและคาบเรียนของภาคนั้น (GET /api/courses)
     * ใช้ 2 query: หาวิชา แล้วดึงกลุ่มเรียนของทุกวิชาในครั้งเดียว
     *
     * @param q        ช่องค้นหา ตัดช่องว่างหน้า/หลังก่อนค้น null หรือว่าง = ไม่กรอง
     * @param category null = ทุกหมวดวิชา
     */
    public List<CourseResponse> search(int academicYear, int semester, String q, CourseCategory category) {
        List<Course> courses = courseRepository.search(academicYear, semester, q == null ? null : q.strip(), category);

        List<String> courseCodes = courses.stream().map(Course::getCourseCode).toList();
        Map<String, List<Section>> sectionsByCourse = sectionRepository
                .findByCourseCodesAndTerm(courseCodes, academicYear, semester).stream()
                .collect(Collectors.groupingBy(s -> s.getCourse().getCourseCode()));

        return courses.stream()
                .map(c -> CourseResponse.from(c, sectionsByCourse.getOrDefault(c.getCourseCode(), List.of())))
                .toList();
    }
}
