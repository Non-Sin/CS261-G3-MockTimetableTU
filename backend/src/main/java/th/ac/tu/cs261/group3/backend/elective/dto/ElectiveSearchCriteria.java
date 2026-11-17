package th.ac.tu.cs261.group3.backend.elective.dto;

import th.ac.tu.cs261.group3.backend.elective.InterestGroup;

import java.time.DayOfWeek;

/**
 * query param ที่ไม่บังคับของ GET /api/electives รวมเป็นก้อนเดียว (bind ด้วย {@code @ModelAttribute})
 * <p>
 * ไม่ส่งค่า = ไม่กรอง: {@code semester} null = ทุกภาคเรียน, {@code excludeConflicts} ไม่ส่ง = false
 * ส่วน {@code academicYear} และ {@code currentSemester} บังคับจึงรับแยกที่ controller
 */
public record ElectiveSearchCriteria(
        String q,
        Integer semester,
        DayOfWeek day,
        TimeSlot timeSlot,
        InterestGroup group,
        Boolean excludeConflicts
) {
    /**
     * {@code excludeConflicts} เป็น {@link Boolean} เพราะ constructor binding ของ {@code @ModelAttribute}
     * ใส่ primitive ที่ไม่ได้ส่งมาไม่ได้ (ตอบ 400) จึงแปลง null เป็น false ที่นี่ หลังจากนี้ไม่เป็น null
     */
    public ElectiveSearchCriteria {
        excludeConflicts = Boolean.TRUE.equals(excludeConflicts);
    }

    /** ไม่มีตัวกรองเลย (เปิดเมนูครั้งแรก) */
    public static ElectiveSearchCriteria none() {
        return new ElectiveSearchCriteria(null, null, null, null, null, false);
    }
}
