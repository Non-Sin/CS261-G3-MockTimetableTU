package th.ac.tu.cs261.group3.backend.studyplan;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyMinorResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanListResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanResponse;
import th.ac.tu.cs261.group3.backend.user.User;
import th.ac.tu.cs261.group3.backend.user.UserRepository;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * แผนการเรียนที่เลือกได้ (GET /api/study-plans) กรองด้วย department ของนักศึกษา + ชั้นปี + ภาคที่ส่งมา
 * ไม่คำนวณชั้นปีให้ และไม่รับ planType ปี 3–4 ได้ทุกแผนกลับไปให้ frontend กรองเอง
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StudyPlanService {

    /** curriculumName แล้ว planType (null ก่อน แล้ว SPECIAL_PROJECT → CO_OP ตามลำดับประกาศของ enum) */
    private static final Comparator<StudyPlan> PLAN_ORDER = Comparator
            .comparing(StudyPlan::getCurriculumName)
            .thenComparing(StudyPlan::getPlanType, Comparator.nullsFirst(Comparator.naturalOrder()));

    private final StudyPlanRepository studyPlanRepository;
    private final StudyMinorRepository studyMinorRepository;
    private final UserRepository userRepository;

    public StudyPlanListResponse getPlans(String studentId, int studyYear, int semester) {
        User user = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + studentId));
        String department = user.getDepartment();

        List<StudyPlanResponse> plans = studyPlanRepository
                .findByDepartmentAndStudyYearAndSemester(department, studyYear, semester).stream()
                .sorted(PLAN_ORDER)
                .map(p -> StudyPlanResponse.of(p, p.getCourses().stream().map(StudyPlanCourse::getCourse).toList()))
                .toList();

        // 1 รายการต่อ 1 วิชาโท × 1 แผน เฉพาะแผนที่มีวิชาในภาคนี้ เรียงตาม sortOrder ของวิชาโท แล้วตาม planType
        List<StudyMinorResponse> minors = studyMinorRepository
                .findByDepartmentAndTerm(department, studyYear, semester).stream()
                .flatMap(minor -> Arrays.stream(PlanType.values()).map(planType -> {
                    List<Course> courses = minor.coursesOf(planType, studyYear, semester);
                    return courses.isEmpty() ? null : StudyMinorResponse.of(minor, planType, courses);
                }))
                .filter(Objects::nonNull)
                .toList();

        return new StudyPlanListResponse(department, studyYear, semester, plans, minors);
    }
}
