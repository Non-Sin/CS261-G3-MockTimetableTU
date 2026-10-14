package th.ac.tu.cs261.group3.backend.common.student;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * คืนรหัสนักศึกษาจาก config ({@code app.demo.student-id}) ระหว่างที่ US3 ยังไม่มี login
 * <p>
 * พอมี implementation ที่อ่านจาก session แล้วให้ลบคลาสนี้ออก
 */
@Component
public class DemoStudentProvider implements CurrentStudentProvider {

    private final String studentId;

    public DemoStudentProvider(@Value("${app.demo.student-id}") String studentId) {
        this.studentId = studentId;
    }

    @Override
    public String currentStudentId() {
        return studentId;
    }
}
