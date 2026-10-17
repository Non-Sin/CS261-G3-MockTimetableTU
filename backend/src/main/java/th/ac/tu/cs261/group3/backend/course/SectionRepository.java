package th.ac.tu.cs261.group3.backend.course;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, Long> {

    /**
     * โหลดวิชาและคาบเรียนมาพร้อม section (TimetableService.addEntry)
     * เพราะ service ใช้รหัสวิชาและหน่วยกิตต่อหลังจบ query และ {@code open-in-view: false}
     */
    @Override
    @EntityGraph(attributePaths = {"course", "slots"})
    Optional<Section> findById(Long sectionId);

    /**
     * กลุ่มเรียนของวิชาที่ได้จาก {@link CourseRepository#search} ในภาคเดียวกัน พร้อมวิชาและคาบเรียน
     * ให้ CourseService ประกอบ {@code CourseResponse.sections} ได้ใน query เดียว (GET /api/courses)
     * <p>
     * เรียงตามรหัสวิชาแล้วรหัสกลุ่ม ส่วนลำดับคาบเรียนให้ service เรียงตามวันในสัปดาห์เอง
     * เพราะ {@code day_of_week} เก็บเป็นข้อความ เรียงใน DB จะได้ตามตัวอักษร
     */
    default List<Section> findByCourseCodesAndTerm(Collection<String> courseCodes, int academicYear, int semester) {
        if (courseCodes.isEmpty()) {
            return List.of();
        }
        return findWithSlotsByCourseCodesAndTerm(courseCodes, academicYear, semester);
    }

    /** ใช้ผ่าน {@link #findByCourseCodesAndTerm} ซึ่งกันกรณี list ว่างไว้แล้ว */
    @Query("""
            select s from Section s
            join fetch s.course c
<<<<<<< HEAD
            join fetch s.slots
=======
            left join fetch s.slots
>>>>>>> fd86cedd0ffad13cf9368433c71a1cc2ce15e4a9
            where c.courseCode in :courseCodes
              and s.academicYear = :academicYear and s.semester = :semester
            order by c.courseCode, s.sectionNo""")
    List<Section> findWithSlotsByCourseCodesAndTerm(@Param("courseCodes") Collection<String> courseCodes,
                                                    @Param("academicYear") int academicYear,
                                                    @Param("semester") int semester);
}
