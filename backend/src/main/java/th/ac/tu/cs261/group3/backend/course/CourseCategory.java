package th.ac.tu.cs261.group3.backend.course;

/**
 * หมวดวิชา เก็บใน {@code course.category} เป็นชื่อ enum (ใช้ {@code @Enumerated(EnumType.STRING)})
 * <p>
 * ค่าต้องตรงกับ CHECK constraint {@code ck_course_category} ใน migration
 * และ type {@code CourseCategory} ฝั่ง frontend
 */
public enum CourseCategory {
    /** วิชาเฉพาะ */
    MAJOR,
    /** ศึกษาทั่วไป */
    GENERAL_EDUCATION,
    /** เลือกเสรี */
    FREE_ELECTIVE
}
