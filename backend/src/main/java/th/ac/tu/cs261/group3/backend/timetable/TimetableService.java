package th.ac.tu.cs261.group3.backend.timetable;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.timetable.dto.AddTimetableEntryRequest;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimeConflictResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableEntryResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * กฎของ US1 ทั้งหมดอยู่ที่นี่ ลำดับใน addEntry ตาม US1-T05 DTO & API Spec:
 * หา section (404) → วิชาซ้ำ (409) → หน่วยกิต (409) → บันทึก → คำนวณเวลาชน (ไม่ใช่ error)
 */
@Service
@Transactional(readOnly = true)
public class TimetableService {

    static final String COURSE_ALREADY_IN_TIMETABLE = "COURSE_ALREADY_IN_TIMETABLE";
    static final String CREDIT_LIMIT_EXCEEDED = "CREDIT_LIMIT_EXCEEDED";

    private final int maxCredits;
    private final SectionRepository sectionRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableEntryRepository timetableEntryRepository;

    public TimetableService(@Value("${app.timetable.max-credits}") int maxCredits,
                            SectionRepository sectionRepository,
                            TimetableRepository timetableRepository,
                            TimetableEntryRepository timetableEntryRepository) {
        this.maxCredits = maxCredits;
        this.sectionRepository = sectionRepository;
        this.timetableRepository = timetableRepository;
        this.timetableEntryRepository = timetableEntryRepository;
    }

    /** ตารางที่ยังไม่มีในระบบตอบตารางว่าง {@code updatedAt: null} (frame 1:2) */
    public TimetableResponse getTimetable(String studentId, int academicYear, int semester) {
        return timetableRepository.findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, semester)
                .map(t -> toResponse(t, timetableEntryRepository.findByTimetableId(t.getTimetableId())))
                .orElseGet(() -> TimetableResponse.of(academicYear, semester, List.of(), maxCredits, List.of(), null));
    }

    /** ภาคเรียนของตารางอ่านจาก section สร้าง Timetable ใหม่ตอนเพิ่มวิชาแรกของภาค */
    @Transactional
    public TimetableResponse addEntry(String studentId, AddTimetableEntryRequest request) {
        Section section = sectionRepository.findById(request.sectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section not found with id: " + request.sectionId()));

        Optional<Timetable> existing = timetableRepository.findByStudentIdAndAcademicYearAndSemester(
                studentId, section.getAcademicYear(), section.getSemester());
        List<TimetableEntry> entries = existing
                .map(t -> timetableEntryRepository.findByTimetableId(t.getTimetableId()))
                .orElse(List.of());

        checkNotAlreadyAdded(entries, section);
        checkCreditLimit(entries, section);

        Timetable timetable = existing.orElseGet(() -> newTimetable(studentId, section));
        timetable.touch();
        timetableRepository.save(timetable);

        TimetableEntry entry = new TimetableEntry();
        entry.setTimetable(timetable);
        entry.setSection(section);
        timetableEntryRepository.save(entry);

        List<TimetableEntry> updated = new ArrayList<>(entries);
        updated.add(entry);
        return toResponse(timetable, updated);
    }

    private static Timetable newTimetable(String studentId, Section section) {
        Timetable timetable = new Timetable();
        timetable.setStudentId(studentId);
        timetable.setAcademicYear(section.getAcademicYear());
        timetable.setSemester(section.getSemester());
        return timetable;
    }

    /** 1 วิชาเพิ่มได้ 1 กลุ่มเรียน (TC8) DB ไม่ได้กันกรณีคนละกลุ่ม */
    private void checkNotAlreadyAdded(List<TimetableEntry> entries, Section section) {
        String courseCode = section.getCourse().getCourseCode();
        entries.stream()
                .filter(e -> e.getSection().getCourse().getCourseCode().equals(courseCode))
                .findFirst()
                .ifPresent(existing -> {
                    String existingSectionNo = existing.getSection().getSectionNo();
                    Map<String, Object> properties = new LinkedHashMap<>();
                    properties.put("courseCode", courseCode);
                    properties.put("existingSectionNo", existingSectionNo);
                    throw new BusinessRuleException(HttpStatus.CONFLICT, COURSE_ALREADY_IN_TIMETABLE,
                            "%s อยู่ในตารางแล้ว (Sec %s) 1 วิชาเพิ่มได้ 1 กลุ่มเรียน".formatted(courseCode, existingSectionNo),
                            properties);
                });
    }

    /** หน่วยกิตรวมหลังเพิ่มต้องไม่เกิน maxCredits (TC7) เท่ากับ maxCredits พอดียังเพิ่มได้ */
    private void checkCreditLimit(List<TimetableEntry> entries, Section section) {
        Course course = section.getCourse();
        int currentCredits = totalCredits(entries);
        int afterAdd = currentCredits + course.getCredits();
        if (afterAdd > maxCredits) {
            Map<String, Object> properties = new LinkedHashMap<>();
            properties.put("currentCredits", currentCredits);
            properties.put("courseCredits", course.getCredits());
            properties.put("maxCredits", maxCredits);
            throw new BusinessRuleException(HttpStatus.CONFLICT, CREDIT_LIMIT_EXCEEDED,
                    "เพิ่ม %s (%d หน่วยกิต) แล้วจะเป็น %d หน่วยกิต เกินกำหนด %d หน่วยกิต"
                            .formatted(course.getCourseCode(), course.getCredits(), afterAdd, maxCredits),
                    properties);
        }
    }

    private static int totalCredits(List<TimetableEntry> entries) {
        return entries.stream().mapToInt(e -> e.getSection().getCourse().getCredits()).sum();
    }

    /**
     * คู่วิชาที่เวลาชนกัน 1 รายการต่อ 1 คู่ต่อ 1 วัน คาบต่อกันพอดีไม่นับ
     * สูตรตาม Spec: {@code a.startTime < b.endTime && b.startTime < a.endTime}
     * ลำดับรหัสวิชาในคู่ตามลำดับที่เพิ่มลงตาราง เรียงรายการตามวันแล้วเวลาเริ่มชน
     */
    private List<TimeConflictResponse> findConflicts(List<TimetableEntry> entries) {
        record Key(String first, String second, DayOfWeek day) {}
        Map<Key, LocalTime[]> overlaps = new LinkedHashMap<>();

        for (int i = 0; i < entries.size(); i++) {
            for (int j = i + 1; j < entries.size(); j++) {
                Section a = entries.get(i).getSection();
                Section b = entries.get(j).getSection();
                for (ScheduleSlot x : a.getSlots()) {
                    for (ScheduleSlot y : b.getSlots()) {
                        if (x.getDayOfWeek() == y.getDayOfWeek()
                                && x.getStartTime().isBefore(y.getEndTime())
                                && y.getStartTime().isBefore(x.getEndTime())) {
                            LocalTime start = max(x.getStartTime(), y.getStartTime());
                            LocalTime end = min(x.getEndTime(), y.getEndTime());
                            Key key = new Key(a.getCourse().getCourseCode(), b.getCourse().getCourseCode(), x.getDayOfWeek());
                            // วันเดียวกันชนมากกว่า 1 ช่วง รวมเป็นช่วงกว้างสุด
                            overlaps.merge(key, new LocalTime[]{start, end},
                                    (old, cur) -> new LocalTime[]{min(old[0], cur[0]), max(old[1], cur[1])});
                        }
                    }
                }
            }
        }

        return overlaps.entrySet().stream()
                .map(e -> new TimeConflictResponse(e.getKey().day(), e.getValue()[0], e.getValue()[1],
                        List.of(e.getKey().first(), e.getKey().second())))
                .sorted(Comparator.comparing(TimeConflictResponse::dayOfWeek)
                        .thenComparing(TimeConflictResponse::overlapStart))
                .toList();
    }

    private TimetableResponse toResponse(Timetable timetable, List<TimetableEntry> entries) {
        List<TimeConflictResponse> conflicts = findConflicts(entries);
        List<TimetableEntryResponse> entryResponses = entries.stream()
                .map(e -> TimetableEntryResponse.from(e, conflictWith(e, conflicts)))
                .toList();
        return TimetableResponse.of(timetable.getAcademicYear(), timetable.getSemester(), entryResponses,
                maxCredits, conflicts, timetable.getUpdatedAt());
    }

    /** รหัสวิชาอื่นที่ชนกับ entry นี้ ไม่ซ้ำ ว่าง = ไม่ชน */
    private static List<String> conflictWith(TimetableEntry entry, List<TimeConflictResponse> conflicts) {
        String code = entry.getSection().getCourse().getCourseCode();
        Set<String> others = new LinkedHashSet<>();
        for (TimeConflictResponse c : conflicts) {
            if (c.courseCodes().contains(code)) {
                c.courseCodes().stream().filter(other -> !other.equals(code)).forEach(others::add);
            }
        }
        return List.copyOf(others);
    }

    private static LocalTime max(LocalTime a, LocalTime b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalTime min(LocalTime a, LocalTime b) {
        return a.isBefore(b) ? a : b;
    }
}
