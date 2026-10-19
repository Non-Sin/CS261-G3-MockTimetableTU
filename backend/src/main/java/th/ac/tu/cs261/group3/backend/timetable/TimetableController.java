package th.ac.tu.cs261.group3.backend.timetable;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import th.ac.tu.cs261.group3.backend.common.student.CurrentStudentProvider;
import th.ac.tu.cs261.group3.backend.timetable.dto.AddTimetableEntryRequest;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

/**
 * ตารางเรียนจำลองของนักศึกษาที่ login อยู่ studentId มาจาก JWT ผ่าน CurrentStudentProvider
 */
@RestController
@RequestMapping("/api/timetable")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final CurrentStudentProvider currentStudentProvider;

    @GetMapping
    public TimetableResponse getMyTimetable(@RequestParam int academicYear, @RequestParam int semester) {
        return timetableService.getTimetable(currentStudentProvider.currentStudentId(), academicYear, semester);
    }

    /** เวลาชนไม่ใช่ error ยังตอบ 201 แต่ {@code conflicts} ไม่ว่าง */
    @PostMapping("/entries")
    @ResponseStatus(HttpStatus.CREATED)
    public TimetableResponse addEntry(@Valid @RequestBody AddTimetableEntryRequest request) {
        return timetableService.addEntry(currentStudentProvider.currentStudentId(), request);
    }
}
