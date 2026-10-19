package th.ac.tu.cs261.group3.backend.timetable;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * ลบวิชาจากตาราง (US2) ลำดับใน removeEntries ตาม US2-T05 DTO & API Spec:
 * entryIds ว่าง (400) → ตัด id ซ้ำ → หา entry ของนักศึกษาคนนี้ (404) → อยู่ตารางเดียวกัน (400) → ลบ
 * <p>
 * {@code @Transactional} ที่ระดับ class เพราะ removeEntry เรียก removeEntries ภายใน class ซึ่งไม่ผ่าน proxy
 * และ {@code open-in-view: false} ทำให้อ่าน {@code entry.getTimetable()} แบบ LAZY ได้แค่ใน transaction
 */
@Service
@Transactional
@RequiredArgsConstructor
public class TimetableDeleteService {

    private final TimetableEntryRepository timetableEntryRepository;
    private final TimetableService timetableService;

    public TimetableResponse removeEntry(String studentId, Long entryId) {
        return removeEntries(studentId, List.of(entryId));
    }

    /** all-or-nothing: ทุกการ throw เกิดก่อนลบ จึงไม่มีกรณีลบไปครึ่งเดียว */
    public TimetableResponse removeEntries(String studentId, List<Long> entryIds) {
        if (entryIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ต้องระบุ entryIds อย่างน้อย 1 ตัว");
        }
        Set<Long> ids = new LinkedHashSet<>(entryIds);

        // entry ของคนอื่นตอบเหมือนไม่พบ (404) ไม่บอกเป็นนัยว่า id นั้นมีอยู่จริง
        List<TimetableEntry> entries = timetableEntryRepository.findAllById(ids).stream()
                .filter(e -> e.getTimetable().getStudentId().equals(studentId))
                .toList();
        if (entries.size() != ids.size()) {
            entries.forEach(e -> ids.remove(e.getEntryId()));
            throw new ResourceNotFoundException("ไม่พบวิชาในตารางเรียนของคุณ: entryId "
                    + ids.stream().map(String::valueOf).collect(Collectors.joining(", ")));
        }

        // response คืนได้ตารางเดียว timetable unique บน (student_id, academic_year, semester) จึงเทียบแค่ id
        long timetableCount = entries.stream()
                .map(e -> e.getTimetable().getTimetableId())
                .distinct()
                .count();
        if (timetableCount > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "entryIds ต้องเป็นวิชาในตารางเดียวกัน (ปีการศึกษาและภาคเรียนเดียวกัน)");
        }

        // ไม่ลบแถว timetable แม้ลบจนหมด ตารางที่ลบจนว่างจึงมี updatedAt ไม่เป็น null
        Timetable timetable = entries.get(0).getTimetable();
        timetableEntryRepository.deleteAll(entries);
        timetable.touch();
        return timetableService.getTimetable(studentId, timetable.getAcademicYear(), timetable.getSemester());
    }
}
