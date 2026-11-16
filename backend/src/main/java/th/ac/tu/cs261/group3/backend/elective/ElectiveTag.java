package th.ac.tu.cs261.group3.backend.elective;

/**
 * ป้ายลักษณะวิชา เก็บใน {@code elective_tag.tag} เป็นชื่อ enum
 * <p>
 * ค่าต้องตรงกับ CHECK constraint {@code ck_elective_tag_value} และลำดับ enum
 * คือลำดับที่ service เรียงก่อนคืน DTO (ไม่พึ่งลำดับแถวใน DB)
 */
public enum ElectiveTag {
    /** ไม่เช็คชื่อ */
    NO_ATTENDANCE,
    /** ไม่มีสอบ */
    NO_EXAM,
    /** ไม่มีงานกลุ่ม */
    NO_GROUP_WORK,
    /** อาจารย์ใจดี */
    KIND_INSTRUCTOR,
    /** ไม่มีวิชาบังคับก่อน */
    NO_PREREQUISITE,
    /** เกรดดี */
    EASY_GRADE
}
