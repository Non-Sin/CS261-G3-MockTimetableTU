package th.ac.tu.cs261.group3.backend.timetable.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * ตารางเรียนจำลองทั้งก้อน ใช้ตอบทั้ง GET /api/timetable และ POST /api/timetable/entries
 * <p>
 * ตารางที่ยังไม่มีในระบบตอบ {@code entries: []}, {@code conflicts: []}, {@code totalCredits: 0}, {@code updatedAt: null}
 */
public record TimetableResponse(
        int academicYear,
        int semester,
        List<TimetableEntryResponse> entries,
        int totalCredits,
        int maxCredits,
        List<TimeConflictResponse> conflicts,
        OffsetDateTime updatedAt
) {
    /** {@code totalCredits} คำนวณจากผลรวม credits ของ entries */
    public static TimetableResponse of(int academicYear,
                                       int semester,
                                       List<TimetableEntryResponse> entries,
                                       int maxCredits,
                                       List<TimeConflictResponse> conflicts,
                                       OffsetDateTime updatedAt) {
        int totalCredits = entries.stream().mapToInt(TimetableEntryResponse::credits).sum();
        return new TimetableResponse(academicYear, semester, List.copyOf(entries), totalCredits, maxCredits,
                List.copyOf(conflicts), updatedAt);
    }
}
