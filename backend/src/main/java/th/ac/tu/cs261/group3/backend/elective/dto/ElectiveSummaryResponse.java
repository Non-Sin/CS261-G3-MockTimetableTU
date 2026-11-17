package th.ac.tu.cs261.group3.backend.elective.dto;

import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.elective.ElectiveInfo;
import th.ac.tu.cs261.group3.backend.elective.ElectiveTag;
import th.ac.tu.cs261.group3.backend.elective.InterestGroup;

import java.util.List;

/** การ์ดวิชาเสรีแนะนำ 1 ใบ ใน GET /api/electives (US6-T05) */
public record ElectiveSummaryResponse(
        String courseCode,
        String courseName,
        String courseNameTh,
        int credits,
        InterestGroup group,
        boolean requiresQuota,
        List<Integer> offeredSemesters,
        List<ElectiveTag> tags
) {
    /**
     * ต้อง fetch {@code info.course} และ {@code info.tags} มาแล้ว (ElectiveRepository ทำให้)
     * <p>
     * T05 วาดเป็น {@code from(course, info, offeredSemesters)} แต่ T06 ให้ {@link ElectiveInfo} ถือ {@link Course}
     * อยู่แล้ว จึงอ่าน course จาก info
     *
     * @param offeredSemesters ภาคที่มี Sec เปิดในปีนั้น ทั้งปีก่อนกรอง เรียงจากน้อยไปมาก
     */
    public static ElectiveSummaryResponse from(ElectiveInfo info, List<Integer> offeredSemesters) {
        Course course = info.getCourse();
        return new ElectiveSummaryResponse(
                course.getCourseCode(),
                course.getCourseName(),
                info.getCourseNameTh(),
                course.getCredits(),
                info.getInterestGroup(),
                info.isRequiresQuota(),
                List.copyOf(offeredSemesters),
                // tags เป็น Set ไม่มีลำดับ เรียงตามลำดับ enum ตาม T05
                info.getTags().stream().sorted().toList()
        );
    }
}
