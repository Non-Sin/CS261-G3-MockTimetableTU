package th.ac.tu.cs261.group3.backend.elective;

/**
 * หมวดความสนใจของวิชาเลือกเสรี เก็บใน {@code elective_info.interest_group} เป็นชื่อ enum
 * <p>
 * ค่าต้องตรงกับ CHECK constraint {@code ck_elective_info_group} และลำดับ enum
 * คือลำดับที่ service ใช้เรียงผลค้นหา (ไม่ใช้การเรียงตัวอักษรของ DB)
 */
public enum InterestGroup {
    /** ภาษา */
    LANGUAGE,
    /** จิตวิทยา */
    PSYCHOLOGY,
    /** สังคม */
    SOCIETY,
    /** วิทยาศาสตร์ */
    SCIENCE,
    /** สื่อ */
    MEDIA
}
