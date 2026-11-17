package th.ac.tu.cs261.group3.backend.elective.dto;

import th.ac.tu.cs261.group3.backend.elective.ElectiveTag;
import th.ac.tu.cs261.group3.backend.elective.InterestGroup;

import java.util.List;

/**
 * modal รายละเอียดวิชาเสรี ใน GET /api/electives/{courseCode} (US6-T05)
 * <p>
 * 8 field แรกเหมือน {@link ElectiveSummaryResponse} (JSON แบน) record สืบทอดกันไม่ได้จึงเขียนซ้ำ
 *
 * @param description bullet รีวิวตามลำดับที่ seed ไว้
 * @param sections    ทุก Sec ของทั้งปีการศึกษา เรียงตาม semester แล้ว sectionNo ไม่ผ่านตัวกรองหน้ารายการ
 */
public record ElectiveDetailResponse(
        String courseCode,
        String courseName,
        String courseNameTh,
        int credits,
        InterestGroup group,
        boolean requiresQuota,
        List<Integer> offeredSemesters,
        List<ElectiveTag> tags,
        List<String> description,
        List<ElectiveSectionResponse> sections
) {
    public static ElectiveDetailResponse of(ElectiveSummaryResponse summary,
                                            List<String> description,
                                            List<ElectiveSectionResponse> sections) {
        return new ElectiveDetailResponse(
                summary.courseCode(),
                summary.courseName(),
                summary.courseNameTh(),
                summary.credits(),
                summary.group(),
                summary.requiresQuota(),
                summary.offeredSemesters(),
                summary.tags(),
                List.copyOf(description),
                List.copyOf(sections)
        );
    }
}
