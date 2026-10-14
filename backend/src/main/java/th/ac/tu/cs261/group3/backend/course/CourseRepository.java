package th.ac.tu.cs261.group3.backend.course;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Locale;

public interface CourseRepository extends JpaRepository<Course, String> {

    /**
     * วิชาที่มีกลุ่มเรียนเปิดในปี/ภาคที่เลือก เรียงตามรหัสวิชา (GET /api/courses)
     *
     * @param q        null หรือว่าง = ไม่กรอง ถ้ามีค่า ตรงกับรหัสวิชาที่ขึ้นต้นด้วย q
     *                 หรือชื่อวิชาที่มีคำขึ้นต้นด้วย q (ไม่สนตัวพิมพ์) คำคั่นด้วยช่องว่างหรือ "-"
     *                 เช่น "CS" ไม่ตรงกับ STATISTICS แต่ "ORIENTED" ตรงกับ OBJECT-ORIENTED
     *                 อักขระพิเศษของ LIKE ({@code % _ [}) ถูกค้นตามตัวอักษร
     * @param category null = ทุกหมวดวิชา
     */
    default List<Course> search(int academicYear, int semester, String q, CourseCategory category) {
        String prefix = q == null || q.isEmpty() ? null : escapeLike(q.toUpperCase(Locale.ROOT));
        return searchByPrefix(academicYear, semester, prefix, category);
    }

    /** ใช้ผ่าน {@link #search} เท่านั้น {@code prefix} ต้องเป็นตัวพิมพ์ใหญ่และ escape แล้ว */
    @Query("""
            select c from Course c
            where exists (
                    select 1 from Section s
                    where s.course = c and s.academicYear = :academicYear and s.semester = :semester)
              and (:category is null or c.category = :category)
              and (:prefix is null
                   or upper(c.courseCode) like concat(:prefix, '%') escape '!'
                   or upper(c.courseName) like concat(:prefix, '%') escape '!'
                   or upper(c.courseName) like concat('% ', :prefix, '%') escape '!'
                   or upper(c.courseName) like concat('%-', :prefix, '%') escape '!')
            order by c.courseCode""")
    List<Course> searchByPrefix(@Param("academicYear") int academicYear,
                                @Param("semester") int semester,
                                @Param("prefix") String prefix,
                                @Param("category") CourseCategory category);

    /**
     * SQL Server ตีความ {@code %}, {@code _} และ {@code [} ใน LIKE เป็น wildcard
     * จึงใส่ {@code !} (ตัว escape ใน query) นำหน้า และ escape ตัว {@code !} เองด้วย
     */
    private static String escapeLike(String value) {
        return value.replace("!", "!!")
                .replace("%", "!%")
                .replace("_", "!_")
                .replace("[", "![");
    }
}
