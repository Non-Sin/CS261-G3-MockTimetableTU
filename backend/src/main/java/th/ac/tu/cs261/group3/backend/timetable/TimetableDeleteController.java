package th.ac.tu.cs261.group3.backend.timetable;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.util.List;

/**
 * ลบวิชาออกจากตารางเรียนจำลอง (US2) แยกจาก TimetableController ของ US1
 * ใช้ path ขึ้นต้นเดียวกันได้เพราะ method กับ path ไม่ซ้ำกัน ทั้งสอง endpoint คืนตารางทั้งก้อนหลังลบ
 */
@RestController
@RequestMapping("/api/timetable/entries")
@RequiredArgsConstructor
public class TimetableDeleteController {

    private final TimetableDeleteService timetableDeleteService;
    private final CurrentStudentProvider currentStudentProvider;

    @DeleteMapping("/{entryId}")
    public TimetableResponse removeEntry(@PathVariable Long entryId) {
        return timetableDeleteService.removeEntry(currentStudentProvider.currentStudentId(), entryId);
    }

    /** ลบหลายวิชาหรือทุกวิชา {@code ?entryIds=7,8} หรือ {@code ?entryIds=7&entryIds=8} ก็ได้ */
    @DeleteMapping
    public TimetableResponse removeEntries(@RequestParam List<Long> entryIds) {
        return timetableDeleteService.removeEntries(currentStudentProvider.currentStudentId(), entryIds);
    }
}
