package th.ac.tu.cs261.group3.backend.elective;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.course.dto.ScheduleSlotResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveDetailResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSearchCriteria;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSectionResponse;
import th.ac.tu.cs261.group3.backend.elective.dto.ElectiveSummaryResponse;
import th.ac.tu.cs261.group3.backend.timetable.TimetableService;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableEntryResponse;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * วิชาเสรีแนะนำ (US6) ตาม US6-T05 API Spec และ US6-T06 Sequence Diagram
 * <p>
 * อ่านอย่างเดียว ไม่สร้างตารางนักศึกษา ปุ่ม "เพิ่มลงตาราง" ใช้ POST /api/timetable/entries ของ US1 โดยตรง
 */
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ElectiveService {

    /** ลำดับหัวข้อหมวดในหน้า = ลำดับ enum แล้วตามรหัสวิชา */
    private static final Comparator<ElectiveInfo> BY_GROUP_THEN_CODE =
            Comparator.comparing(ElectiveInfo::getInterestGroup).thenComparing(ElectiveInfo::getCourseCode);

    private static final Comparator<Section> BY_SEMESTER_THEN_SECTION_NO =
            Comparator.comparingInt(Section::getSemester).thenComparing(Section::getSectionNo);

    private final ElectiveRepository electiveRepository;
    private final SectionRepository sectionRepository;
    private final TimetableService timetableService;

    /**
     * วิชาผ่านเมื่อมี <b>Sec เดียวกัน</b> อย่างน้อย 1 Sec ที่ผ่านตัวกรองระดับ Sec ทุกตัวพร้อมกัน
     * ไม่พบตอบ list ว่าง (200 [])
     */
    public List<ElectiveSummaryResponse> search(String studentId, int academicYear, int currentSemester,
                                                ElectiveSearchCriteria criteria) {
        ElectiveSearchCriteria c = criteria == null ? ElectiveSearchCriteria.none() : criteria;
        validateSemester("currentSemester", currentSemester);
        validateSemester("semester", c.semester());

        // โหลดตารางเฉพาะตอนเปิด toggle "ไม่ชนกับตารางปัจจุบัน"
        TimetableResponse timetable = c.excludeConflicts()
                ? timetableService.getTimetable(studentId, academicYear, currentSemester)
                : null;

        List<ElectiveInfo> infos = electiveRepository.searchRecommended(academicYear, c.q(), c.group());
        if (infos.isEmpty()) {
            return List.of();
        }
        Map<String, List<Section>> sectionsByCourse = loadSections(
                infos.stream().map(ElectiveInfo::getCourseCode).toList(), academicYear);

        return infos.stream()
                .filter(info -> sectionsOf(sectionsByCourse, info).stream()
                        .anyMatch(s -> matchesSection(s, currentSemester, c, timetable)))
                .sorted(BY_GROUP_THEN_CODE)
                .map(info -> ElectiveSummaryResponse.from(info, offeredSemesters(sectionsOf(sectionsByCourse, info))))
                .toList();
    }

    /**
     * รายละเอียดพร้อมทุก Sec ของทั้งปี ไม่ผ่านตัวกรองหน้ารายการ
     * ไม่ใช่วิชาเสรีแนะนำ / ไม่มี Sec ในปีนั้น → 404 โดยไม่โหลดตารางนักศึกษา
     */
    public ElectiveDetailResponse getDetail(String studentId, String courseCode, int academicYear, int currentSemester) {
        validateSemester("currentSemester", currentSemester);
        ElectiveInfo info = electiveRepository.findRecommendedByCode(courseCode, academicYear)
                .orElseThrow(() -> new ResourceNotFoundException("ไม่พบวิชาเสรีแนะนำ: " + courseCode));

        TimetableResponse timetable = timetableService.getTimetable(studentId, academicYear, currentSemester);
        List<Section> sections = sectionRepository.findByCourseCodesAndYear(List.of(info.getCourseCode()), academicYear)
                .stream()
                .sorted(BY_SEMESTER_THEN_SECTION_NO)
                .toList();
        // initialize collection รีวิว (LAZY) ภายใน transaction ก่อนแปลงเป็น DTO
        List<String> description = List.copyOf(info.getDescription());

        List<ElectiveSectionResponse> sectionResponses = sections.stream()
                .map(s -> toSectionResponse(s, currentSemester, timetable))
                .toList();
        ElectiveSummaryResponse summary = ElectiveSummaryResponse.from(info, offeredSemesters(sections));
        return ElectiveDetailResponse.of(summary, description, sectionResponses);
    }

    /** รองรับเฉพาะภาค 1 และ 2 (ทีมไม่พัฒนาภาคฤดูร้อน) {@code null} = ไม่ได้ส่งมา ผ่าน */
    private static void validateSemester(String name, Integer semester) {
        if (semester != null && semester != 1 && semester != 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, name + " ต้องเป็น 1 หรือ 2");
        }
    }

    private Map<String, List<Section>> loadSections(List<String> courseCodes, int academicYear) {
        return sectionRepository.findByCourseCodesAndYear(courseCodes, academicYear).stream()
                .collect(Collectors.groupingBy(s -> s.getCourse().getCourseCode()));
    }

    private static List<Section> sectionsOf(Map<String, List<Section>> sectionsByCourse, ElectiveInfo info) {
        return sectionsByCourse.getOrDefault(info.getCourseCode(), List.of());
    }

    /** ภาคที่มี Sec เปิด จาก Sec ทั้งปี (ไม่หดตามตัวกรอง) */
    private static List<Integer> offeredSemesters(List<Section> sections) {
        return sections.stream().map(Section::getSemester).distinct().sorted().toList();
    }

    /**
     * กติกาการกรองข้อ 3 ของ API Spec: semester ตรง, day + timeSlot ตรงในคาบเดียวกัน
     * และถ้า excludeConflicts ต้องอยู่ currentSemester วิชายังไม่อยู่ในตาราง และไม่ชนกับคาบใดในตาราง
     */
    private static boolean matchesSection(Section section, int currentSemester, ElectiveSearchCriteria c,
                                          TimetableResponse timetable) {
        if (c.semester() != null && section.getSemester() != c.semester()) {
            return false;
        }
        if ((c.day() != null || c.timeSlot() != null) && section.getSlots().stream().noneMatch(slot ->
                (c.day() == null || slot.getDayOfWeek() == c.day())
                        && (c.timeSlot() == null || c.timeSlot().contains(slot.getStartTime())))) {
            // Sec ที่ไม่มีคาบ (e-learning) ไม่ผ่านตัวกรองวัน/ช่วงเวลา
            return false;
        }
        if (c.excludeConflicts()) {
            String courseCode = section.getCourse().getCourseCode();
            boolean alreadyAdded = timetable.entries().stream().anyMatch(e -> e.courseCode().equals(courseCode));
            return section.getSemester() == currentSemester
                    && !alreadyAdded
                    && conflictWith(section, timetable).isEmpty();
        }
        return true;
    }

    private static ElectiveSectionResponse toSectionResponse(Section section, int currentSemester,
                                                             TimetableResponse timetable) {
        boolean inTimetable = timetable.entries().stream()
                .anyMatch(e -> section.getSectionId().equals(e.sectionId()));
        List<String> conflictWith = section.getSemester() == currentSemester
                ? conflictWith(section, timetable)
                : List.of();
        return ElectiveSectionResponse.from(section, currentSemester, inTimetable, conflictWith);
    }

    /**
     * รหัสวิชาในตารางที่มีคาบชนกับ Sec นี้ ไม่ซ้ำ ตามลำดับใน entries ข้าม entry ที่เป็นวิชาเดียวกัน (ไม่ชนตัวเอง)
     * <p>
     * ชั่วคราว (US6-T08 ทางเลือก B): ใช้สูตรเดียวกับ {@code TimetableService.findConflicts} ของ US1
     * ให้ย้ายไปใช้ helper ตรวจเวลาชนกลางเมื่อ {@code ScheduleOverlap} ของ US8-T08 merge แล้ว
     */
    private static List<String> conflictWith(Section section, TimetableResponse timetable) {
        String courseCode = section.getCourse().getCourseCode();
        Set<String> codes = new LinkedHashSet<>();
        for (TimetableEntryResponse entry : timetable.entries()) {
            if (entry.courseCode().equals(courseCode)) {
                continue;
            }
            for (ScheduleSlot mine : section.getSlots()) {
                for (ScheduleSlotResponse theirs : entry.schedules()) {
                    if (overlaps(mine.getDayOfWeek(), mine.getStartTime(), mine.getEndTime(),
                            theirs.dayOfWeek(), theirs.startTime(), theirs.endTime())) {
                        codes.add(entry.courseCode());
                    }
                }
            }
        }
        return List.copyOf(codes);
    }

    /** วันเดียวกัน && startA < endB && startB < endA คาบต่อกันพอดีไม่ชน */
    private static boolean overlaps(DayOfWeek dayA, LocalTime startA, LocalTime endA,
                                    DayOfWeek dayB, LocalTime startB, LocalTime endB) {
        return dayA == dayB && startA.isBefore(endB) && startB.isBefore(endA);
    }
}
