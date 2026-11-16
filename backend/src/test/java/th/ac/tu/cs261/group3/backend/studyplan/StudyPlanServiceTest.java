package th.ac.tu.cs261.group3.backend.studyplan;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyMinorResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanListResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.StudyPlanResponse;
import th.ac.tu.cs261.group3.backend.user.User;
import th.ac.tu.cs261.group3.backend.user.UserRepository;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static th.ac.tu.cs261.group3.backend.course.CourseCategory.*;
import static th.ac.tu.cs261.group3.backend.studyplan.PlanTestData.course;
import static th.ac.tu.cs261.group3.backend.studyplan.StudyPlanEntities.*;

/** GET /api/study-plans ระดับ service (mock repository) ตาม US8-T05 Spec ข้อ 1 และ US8-T06 Sequence Diagram ดูแผนการเรียน */
@ExtendWith(MockitoExtension.class)
class StudyPlanServiceTest {

    private static final String STUDENT = "6609000000";

    @Mock
    private StudyPlanRepository studyPlanRepository;
    @Mock
    private StudyMinorRepository studyMinorRepository;
    @Mock
    private UserRepository userRepository;

    private StudyPlanService service;

    @BeforeEach
    void setUp() {
        service = new StudyPlanService(studyPlanRepository, studyMinorRepository, userRepository);
    }

    private void studentInCs() {
        when(userRepository.findById(STUDENT)).thenReturn(Optional.of(
                new User(STUDENT, "Somporn", "Example", "สมพร", "ตัวอย่าง", CS, "ภาคปกติ")));
    }

    @Test
    void userNotFound_throws404_andDoesNotQueryPlans() {
        when(userRepository.findById(STUDENT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getPlans(STUDENT, 2, 1)).isInstanceOf(ResourceNotFoundException.class);
        verify(studyPlanRepository, never()).findByDepartmentAndStudyYearAndSemester(anyString(), anyInt(), anyInt());
    }

    @Test
    void year2_filtersByStudentDepartment_planTypeNull_minorsEmpty_totalCreditsComputed() {
        studentInCs();
        Course cs221 = course("CS221", MAJOR, 3);
        Course el295 = course("EL295", GENERAL_EDUCATION, 3);
        when(studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 2, 1))
                .thenReturn(List.of(plan(3, CUR, 2, 1, null, cs221, el295)));
        when(studyMinorRepository.findByDepartmentAndTerm(CS, 2, 1)).thenReturn(List.of());

        StudyPlanListResponse r = service.getPlans(STUDENT, 2, 1);

        assertThat(r.department()).isEqualTo(CS);
        assertThat(r.studyYear()).isEqualTo(2);
        assertThat(r.semester()).isEqualTo(1);
        StudyPlanResponse p = r.plans().getFirst();
        assertThat(p.planId()).isEqualTo(3L);
        assertThat(p.planType()).isNull();
        assertThat(p.totalCredits()).isEqualTo(6);
        assertThat(p.courses()).extracting(StudyPlanCourseResponse::courseCode).containsExactly("CS221", "EL295");
        assertThat(r.minors()).isEmpty();
    }

    @Test
    void noPlans_returnsEmptyList() {
        studentInCs();
        when(studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 4, 2)).thenReturn(List.of());
        when(studyMinorRepository.findByDepartmentAndTerm(CS, 4, 2)).thenReturn(List.of());

        StudyPlanListResponse r = service.getPlans(STUDENT, 4, 2);

        assertThat(r.plans()).isEmpty();
        assertThat(r.minors()).isEmpty();
    }

    @Test
    void year3_returnsBothPlans_specialProjectBeforeCoop_byCurriculum() {
        studentInCs();
        Course a = course("CS311", MAJOR, 3);
        when(studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 3, 1)).thenReturn(List.of(
                plan(5, CUR, 3, 1, PlanType.CO_OP, a),
                plan(6, CUR, 3, 1, PlanType.SPECIAL_PROJECT, a),
                plan(9, "หลักสูตร A", 3, 1, PlanType.CO_OP, a)));
        when(studyMinorRepository.findByDepartmentAndTerm(CS, 3, 1)).thenReturn(List.of());

        StudyPlanListResponse r = service.getPlans(STUDENT, 3, 1);

        assertThat(r.plans()).extracting(StudyPlanResponse::planId, StudyPlanResponse::planType).containsExactly(
                tuple(9L, PlanType.CO_OP),
                tuple(6L, PlanType.SPECIAL_PROJECT),
                tuple(5L, PlanType.CO_OP));
    }

    @Test
    void year3_minorSplitPerPlanType_onlyCoursesOfRequestedTerm() {
        studentInCs();
        Course cs345 = course("CS345", MINOR, 3);
        Course cs346 = course("CS346", MINOR, 3);
        Course cs440 = course("CS440", MINOR, 3);
        StudyMinor ds = minor(1, CUR, "วิทยาการข้อมูล");
        addCourse(ds, PlanType.SPECIAL_PROJECT, 3, 1, cs345);
        addCourse(ds, PlanType.SPECIAL_PROJECT, 3, 1, cs346);
        addCourse(ds, PlanType.SPECIAL_PROJECT, 4, 1, cs440);
        addCourse(ds, PlanType.CO_OP, 3, 1, cs440);
        addCourse(ds, PlanType.CO_OP, 3, 1, cs345);
        addCourse(ds, PlanType.CO_OP, 3, 1, cs346);
        when(studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 3, 1)).thenReturn(List.of());
        when(studyMinorRepository.findByDepartmentAndTerm(CS, 3, 1)).thenReturn(List.of(ds));

        StudyPlanListResponse r = service.getPlans(STUDENT, 3, 1);

        assertThat(r.minors()).extracting(StudyMinorResponse::minorId, StudyMinorResponse::planType,
                        StudyMinorResponse::totalCredits)
                .containsExactly(tuple(1L, PlanType.SPECIAL_PROJECT, 6), tuple(1L, PlanType.CO_OP, 9));
        assertThat(r.minors().get(0).courses()).extracting(StudyPlanCourseResponse::courseCode)
                .containsExactly("CS345", "CS346");
        assertThat(r.minors().get(1).courses()).extracting(StudyPlanCourseResponse::courseCode)
                .containsExactly("CS440", "CS345", "CS346");
        assertThat(r.minors().getFirst().minorName()).isEqualTo("วิทยาการข้อมูล");
        assertThat(r.minors().getFirst().curriculumName()).isEqualTo(CUR);
    }

    @Test
    void year4_planWithoutMinorCoursesThisTerm_isOmitted() {
        studentInCs();
        StudyMinor ds = minor(1, CUR, "วิทยาการข้อมูล");
        addCourse(ds, PlanType.SPECIAL_PROJECT, 4, 1, course("CS440", MINOR, 3));
        addCourse(ds, PlanType.CO_OP, 3, 1, course("CS440", MINOR, 3));
        when(studyPlanRepository.findByDepartmentAndStudyYearAndSemester(CS, 4, 1)).thenReturn(List.of());
        when(studyMinorRepository.findByDepartmentAndTerm(CS, 4, 1)).thenReturn(List.of(ds));

        StudyPlanListResponse r = service.getPlans(STUDENT, 4, 1);

        assertThat(r.minors()).extracting(StudyMinorResponse::planType).containsExactly(PlanType.SPECIAL_PROJECT);
    }
}
