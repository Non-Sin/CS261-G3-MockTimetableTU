package th.ac.tu.cs261.group3.backend.course;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, String> {

    /**
     * วิชาที่มีกลุ่มเรียนเปิดในปี/ภาคที่เลือก เรียงตามรหัสวิชา (GET /api/courses)
     *
     * @param q        null หรือว่าง = ไม่กรอง ถ้ามีค่า ตรงกับรหัสวิชาที่ขึ้นต้นด้วย q
     *                 หรือชื่อวิชาที่มีคำขึ้นต้นด้วย q (ไม่สนตัวพิมพ์) คำคั่นด้วยช่องว่างหรือ "-"
     *                 เช่น "CS" ไม่ตรงกับ STATISTICS แต่ "ORIENTED" ตรงกับ OBJECT-ORIENTED
     * @param category null = ทุกหมวดวิชา
     */
    @Query("""
            select c from Course c
            where exists (
                    select 1 from Section s
                    where s.course = c and s.academicYear = :academicYear and s.semester = :semester)
              and (:category is null or c.category = :category)
              and (:q is null or :q = ''
                   or upper(c.courseCode) like concat(upper(:q), '%')
                   or upper(c.courseName) like concat(upper(:q), '%')
                   or upper(c.courseName) like concat('% ', upper(:q), '%')
                   or upper(c.courseName) like concat('%-', upper(:q), '%'))
            order by c.courseCode""")
    List<Course> search(@Param("academicYear") int academicYear,
                        @Param("semester") int semester,
                        @Param("q") String q,
                        @Param("category") CourseCategory category);
}
