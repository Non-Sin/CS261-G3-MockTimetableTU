package th.ac.tu.cs261.group3.backend.common.student;

/**
 * บอกรหัสนักศึกษาของผู้ใช้ปัจจุบัน
 * <p>
 * Controller เรียกผ่าน interface นี้ เพื่อให้ path เดิมใช้ต่อได้หลัง US3 ทำ login
 * implementation คือ {@link SecurityContextStudentProvider} ที่อ่านจาก JWT (US3)
 */
public interface CurrentStudentProvider {

    String currentStudentId();
}
