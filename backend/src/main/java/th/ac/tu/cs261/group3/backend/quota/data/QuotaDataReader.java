package th.ac.tu.cs261.group3.backend.quota.data;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * ขอบเขตอ่านข้อมูลสำหรับพัฒนา API (T08) ก่อน DAO (T09)
 * T09 เพิ่ม implementation ที่เป็น Spring bean และใช้ Repository ตาม T06
 * ไม่ต้องเปลี่ยน Controller, Service หรือ JSON contract
 */
public interface QuotaDataReader {

    /**
     * ค้นทุกวิชา ไม่จำกัดเฉพาะที่เปิดในภาคนี้
     * q ถูก strip แล้ว; courseCodes = null ไม่กรอง, ชุดว่างต้องคืนรายการว่าง
     * T09 รับผิดชอบ matching code prefix / English word prefix / Thai substring และ escape LIKE
     */
    List<QuotaCourseData> searchCourses(String q, Set<String> courseCodes);

    Optional<QuotaCourseData> findCourse(String normalizedCode);

    /**
     * โหลด offered semesters, quota info และรอบด้วย batch queries ตาม T06
     * Map ต้องมี key ของทุก courseCode ที่ขอ แม้ไม่มี quota info (quotaRequired = null)
     * conditions/channels/contacts ต้องเรียง sortOrder และ rounds เรียง roundNo จากตัวอ่านข้อมูล
     */
    Map<String, QuotaDetailsData> loadDetails(List<String> courseCodes, int academicYear, int semester);
}
