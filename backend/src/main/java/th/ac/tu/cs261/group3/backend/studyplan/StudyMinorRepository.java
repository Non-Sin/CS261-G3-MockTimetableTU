package th.ac.tu.cs261.group3.backend.studyplan;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * วิชาโท (US8-T06 DAO Class Diagram)
 * <p>
 * โหลดวิชาของวิชาโทครบทุกภาคเสมอ แล้วให้ service เรียก {@link StudyMinor#coursesOf(int, int)}
 * ไม่กรอง {@code mc} ใน where เพราะจะได้ collection courses ที่ไม่ครบค้างอยู่ใน persistence context
 * <p>
 * <b>ไม่เขียน {@code mc.studyYear, mc.semester, mc.sortOrder} ใน order by</b> (ต่างจาก T06) เพราะ Hibernate ต่อ
 * {@code @OrderBy} ของ {@link StudyMinor#getCourses()} ท้าย order by ให้เองเมื่อ fetch collection
 * ถ้าเขียนซ้ำ SQL Server จะปฏิเสธคอลัมน์ซ้ำใน order by ลำดับที่ได้จึงเหมือนใน T06
 */
public interface StudyMinorRepository extends JpaRepository<StudyMinor, Long> {

    /**
     * วิชาโทของสาขาที่มีวิชาอย่างน้อย 1 วิชาในชั้นปี + ภาคนั้น (GET /api/study-plans)
     * ปี 1–2 ได้ list ว่างเสมอเพราะ {@code ck_study_minor_course_year}
     * ไม่กรอง curriculumName ให้ UI แสดงเฉพาะวิชาโทที่ตรงกับ preset ที่เลือก
     */
    @Query("""
            select m from StudyMinor m
            join fetch m.courses mc
            join fetch mc.course
            where m.department = :department
              and exists (select 1 from StudyMinorCourse x
                          where x.minor = m and x.studyYear = :studyYear and x.semester = :semester)
            order by m.sortOrder, m.minorId""")
    List<StudyMinor> findByDepartmentAndTerm(@Param("department") String department,
                                             @Param("studyYear") int studyYear,
                                             @Param("semester") int semester);

    /** วิชาโทเดียวพร้อมวิชาทุกภาค (ApplyPlanService.loadMinor) */
    @Query("""
            select m from StudyMinor m
            join fetch m.courses mc
            join fetch mc.course
            where m.minorId = :minorId""")
    Optional<StudyMinor> findWithCoursesById(@Param("minorId") Long minorId);
}
