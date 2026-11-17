package th.ac.tu.cs261.group3.backend.studyplan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * preset แผนการเรียน (US8-T06 DAO Class Diagram)
 * <p>
 * ทุก method เขียน @Query เอง เพื่อโหลดวิชาในแผน + Course มาใน query เดียว
 * เพราะ {@code open-in-view: false} และ service อ่านวิชาหลังจบ query
 * fetch collection เดียว ({@code courses}) จึงไม่เกิด MultipleBagFetchException
 * และ Hibernate 6+ ตัดแถวซ้ำของ StudyPlan ให้เอง
 * <p>
 * ใช้ inner {@code join fetch} ตาม ER ({@code 1..*}) แผนที่ไม่มีวิชาถือเป็น seed ผิดและจะไม่ถูกคืน
 * <p>
 * <b>ไม่เขียน {@code pc.sortOrder} ใน order by</b> (ต่างจาก T06) เพราะ Hibernate ต่อ {@code @OrderBy("sortOrder")}
 * ของ {@link StudyPlan#getCourses()} ท้าย order by ให้เองเมื่อ fetch collection ถ้าเขียนซ้ำ SQL Server จะปฏิเสธ
 * ({@code A column has been specified more than once in the order by list}) ลำดับที่ได้จึงเหมือนใน T06
 */
public interface StudyPlanRepository extends JpaRepository<StudyPlan, Long> {

    /**
     * แผนทุกหลักสูตรของสาขาในชั้นปี + ภาคเรียนนั้น (GET /api/study-plans) ไม่กรอง planType
     * ปี 3–4 จึงได้ทั้ง 2 แผนให้ frontend กรองเอง
     * <p>
     * {@code order by p.planId} มีไว้ให้แถวของแผนเดียวกันอยู่ติดกันเท่านั้น
     * ลำดับตาม planType ให้ StudyPlanService เรียงเอง เพราะ plan_type เป็นข้อความ เรียงใน DB จะได้ CO_OP ก่อน
     */
    @Query("""
            select p from StudyPlan p
            join fetch p.courses pc
            join fetch pc.course
            where p.department = :department
              and p.studyYear = :studyYear and p.semester = :semester
            order by p.curriculumName, p.planId""")
    List<StudyPlan> findByDepartmentAndStudyYearAndSemester(@Param("department") String department,
                                                            @Param("studyYear") int studyYear,
                                                            @Param("semester") int semester);

    /** แผนเดียวพร้อมวิชาเรียงตาม sortOrder (ApplyPlanService.applyPlan) */
    @Query("""
            select p from StudyPlan p
            join fetch p.courses pc
            join fetch pc.course
            where p.planId = :planId""")
    Optional<StudyPlan> findWithCoursesById(@Param("planId") Long planId);
}
