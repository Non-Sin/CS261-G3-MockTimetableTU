package th.ac.tu.cs261.group3.backend.elective;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * วิชาเลือกเสรีแนะนำ (US6) แยกจาก {@code CourseRepository.search} ของ US1 ที่ค้นเฉพาะหนึ่งภาค
 * <p>
 * วิชาที่ "แนะนำได้" (eligibility) ต้องครบทุกข้อ: หมวด FREE_ELECTIVE, มี elective_info,
 * มี bullet รีวิวอย่างน้อย 1 ข้อ และมี section ในปีการศึกษาที่ขอ (ภาคใดก็ได้)
 * <p>
 * ทั้งสอง query fetch {@code course} และ {@code tags} มาด้วย แต่ไม่ fetch {@code description}
 */
public interface ElectiveRepository extends JpaRepository<ElectiveInfo, String> {

    /**
     * วิชาแนะนำของปีการศึกษาที่ขอ ไม่เรียงลำดับ (service เรียงตาม {@link InterestGroup} เอง)
     * ตัวกรองวัน/เวลา/ภาค/ไม่ชนตารางทำใน service บน section ที่โหลดแยก
     *
     * @param q     null หรือว่าง/ช่องว่าง = ไม่กรอง ถ้ามีค่า (ตัดช่องว่างหัวท้าย ไม่สนตัวพิมพ์) ตรงกับ
     *              รหัสวิชาที่ขึ้นต้นด้วย q, ชื่ออังกฤษที่มีคำขึ้นต้นด้วย q (คำคั่นด้วยช่องว่างหรือ "-")
     *              หรือชื่อไทยที่มี q อยู่ตรงไหนก็ได้ อักขระพิเศษของ LIKE ({@code % _ [ !}) ถูกค้นตามตัวอักษร
     * @param group null = ทุกหมวด
     */
    default List<ElectiveInfo> searchRecommended(int academicYear, String q, InterestGroup group) {
        // ไม่ค้นใช้ "" แทน null เหมือน CourseRepository.search: bind null เข้า LIKE แล้ว
        // SQL Server จะหาคำค้นภาษาไทยที่ส่งตามมาบน connection เดิมไม่เจอ
        String keyword = q == null ? "" : escapeLike(q.strip().toUpperCase(Locale.ROOT));
        return searchByKeyword(academicYear, keyword, group);
    }

    /** ใช้ผ่าน {@link #searchRecommended} เท่านั้น {@code keyword} ห้ามเป็น null ต้องเป็นตัวพิมพ์ใหญ่และ escape แล้ว */
    @Query("""
            select distinct info from ElectiveInfo info
            join fetch info.course c
            left join fetch info.tags
            where c.category = th.ac.tu.cs261.group3.backend.course.CourseCategory.FREE_ELECTIVE
              and info.description is not empty
              and exists (
                    select 1 from Section s
                    where s.course = c and s.academicYear = :academicYear)
              and (:group is null or info.interestGroup = :group)
              and (upper(c.courseCode) like concat(:keyword, '%') escape '!'
                   or upper(c.courseName) like concat(:keyword, '%') escape '!'
                   or upper(c.courseName) like concat('% ', :keyword, '%') escape '!'
                   or upper(c.courseName) like concat('%-', :keyword, '%') escape '!'
                   or upper(info.courseNameTh) like concat('%', :keyword, '%') escape '!')""")
    List<ElectiveInfo> searchByKeyword(@Param("academicYear") int academicYear,
                                       @Param("keyword") String keyword,
                                       @Param("group") InterestGroup group);

    /**
     * รายละเอียดวิชาแนะนำ ใช้ eligibility เดียวกับ {@link #searchRecommended} แต่ไม่ใช้ตัวกรองหน้ารายการ
     * ไม่พบคืน {@link Optional#empty()} ให้ service แปลงเป็น 404
     */
    @Query("""
            select distinct info from ElectiveInfo info
            join fetch info.course c
            left join fetch info.tags
            where c.courseCode = :courseCode
              and c.category = th.ac.tu.cs261.group3.backend.course.CourseCategory.FREE_ELECTIVE
              and info.description is not empty
              and exists (
                    select 1 from Section s
                    where s.course = c and s.academicYear = :academicYear)""")
    Optional<ElectiveInfo> findRecommendedByCode(@Param("courseCode") String courseCode,
                                                 @Param("academicYear") int academicYear);

    /**
     * คัดลอกจาก {@code CourseRepository} (US1) ตามที่ตกลงใน US6-T09 ยังไม่ย้ายเป็น util กลาง
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
