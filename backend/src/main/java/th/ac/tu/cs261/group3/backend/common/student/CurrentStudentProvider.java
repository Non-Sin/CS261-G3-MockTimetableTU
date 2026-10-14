package th.ac.tu.cs261.group3.backend.common.student;

/**
 * บอกรหัสนักศึกษาของผู้ใช้ปัจจุบัน
 * <p>
 * Controller เรียกผ่าน interface นี้ เพื่อให้ path เดิมใช้ต่อได้หลัง US3 ทำ login
 * แค่เปลี่ยน implementation เป็นตัวที่อ่านจาก session แทน {@link DemoStudentProvider}
 */
public interface CurrentStudentProvider {

    String currentStudentId();
}
