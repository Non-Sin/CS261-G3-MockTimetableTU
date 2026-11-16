package th.ac.tu.cs261.group3.backend.studyplan;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.studyplan.dto.AddedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanRequest;
import th.ac.tu.cs261.group3.backend.studyplan.dto.ApplyPlanResponse;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntry;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableService;
import th.ac.tu.cs261.group3.backend.timetable.dto.TimetableResponse;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * จัดตารางตามแผน (POST /api/timetable/apply-plan) ตาม US8-T06 Sequence Diagram Preview / Confirm
 * <p>
 * หา preset (404) → วิชาโท (400 / 404) → ตารางเดิม + section ของทุกวิชา → PlanScheduler
 * → dryRun คืนผลโดยไม่เขียน DB / ยืนยันบันทึก added ใน transaction เดียวแล้วคืนตารางของ US1
 * ยืนยันแล้วคำนวณใหม่ทั้งหมด ไม่ใช้ผลของ dryRun ครั้งก่อน
 */
@Service
@Transactional
public class ApplyPlanService {

    static final String MINOR_NOT_ALLOWED = "MINOR_NOT_ALLOWED";
    static final String MINOR_PLAN_MISMATCH = "MINOR_PLAN_MISMATCH";

    private final int maxCredits;
    private final StudyPlanRepository studyPlanRepository;
    private final StudyMinorRepository studyMinorRepository;
    private final SectionRepository sectionRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableEntryRepository timetableEntryRepository;
    private final TimetableService timetableService;
    private final PlanScheduler planScheduler;

    public ApplyPlanService(@Value("${app.timetable.max-credits}") int maxCredits,
                            StudyPlanRepository studyPlanRepository,
                            StudyMinorRepository studyMinorRepository,
                            SectionRepository sectionRepository,
                            TimetableRepository timetableRepository,
                            TimetableEntryRepository timetableEntryRepository,
                            TimetableService timetableService,
                            PlanScheduler planScheduler) {
        this.maxCredits = maxCredits;
        this.studyPlanRepository = studyPlanRepository;
        this.studyMinorRepository = studyMinorRepository;
        this.sectionRepository = sectionRepository;
        this.timetableRepository = timetableRepository;
        this.timetableEntryRepository = timetableEntryRepository;
        this.timetableService = timetableService;
        this.planScheduler = planScheduler;
    }

    public ApplyPlanResponse applyPlan(String studentId, ApplyPlanRequest request) {
        StudyPlan plan = studyPlanRepository.findWithCoursesById(request.planId())
                .orElseThrow(() -> new ResourceNotFoundException("Study plan not found with id: " + request.planId()));
        StudyMinor minor = request.minorId() == null ? null : loadMinor(request.minorId(), plan);
        int academicYear = request.academicYear();

        Optional<Timetable> timetable = timetableRepository.findByStudentIdAndAcademicYearAndSemester(
                studentId, academicYear, plan.getSemester());
        List<Section> existing = timetable
                .map(t -> timetableEntryRepository.findByTimetableId(t.getTimetableId()))
                .orElse(List.of())
                .stream()
                .map(TimetableEntry::getSection)
                .toList();

        ScheduleResult result = planScheduler.schedule(loadCandidates(plan, minor, academicYear), existing, maxCredits);

        TimetableResponse timetableResponse = null;
        if (!request.dryRun()) {
            saveAdded(studentId, plan, academicYear, timetable.orElse(null), result.addedSections());
            timetableResponse = timetableService.getTimetable(studentId, academicYear, plan.getSemester());
        }

        List<AddedPlanCourseResponse> added = result.added().stream()
                .map(a -> AddedPlanCourseResponse.from(a.section(), a.source()))
                .toList();
        return new ApplyPlanResponse(plan.getPlanId(), request.minorId(), request.dryRun(),
                added, result.skipped(), timetableResponse);
    }

    /** ตรวจทุกอย่างก่อนอ่านตาราง/section จึงไม่มีการเขียนเมื่อ error แม้เป็นการยืนยัน */
    private StudyMinor loadMinor(Long minorId, StudyPlan plan) {
        if (plan.getStudyYear() <= 2) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, MINOR_NOT_ALLOWED,
                    "ชั้นปีที่ %d เลือกวิชาโทไม่ได้".formatted(plan.getStudyYear()),
                    Map.of("planId", plan.getPlanId(), "minorId", minorId));
        }
        StudyMinor minor = studyMinorRepository.findWithCoursesById(minorId)
                .orElseThrow(() -> new ResourceNotFoundException("Study minor not found with id: " + minorId));
        if (!minor.getDepartment().equals(plan.getDepartment())
                || !minor.getCurriculumName().equals(plan.getCurriculumName())) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, MINOR_PLAN_MISMATCH,
                    "วิชาโท%s ไม่ได้อยู่ในหลักสูตรเดียวกับแผนการเรียนที่เลือก".formatted(minor.getMinorName()),
                    Map.of("planId", plan.getPlanId(), "minorId", minorId));
        }
        return minor;
    }

    /**
     * วิชาของแผน ({@code PLAN}) + วิชาโทของ planType + ชั้นปี + ภาคของ preset ({@code MINOR}, ตัดรหัสที่ซ้ำกับแผน)
     * พร้อม section ของภาคที่ขอ ดึง section ของทุกวิชาใน query เดียว
     */
    private List<PlanCourseCandidate> loadCandidates(StudyPlan plan, StudyMinor minor, int academicYear) {
        Map<String, Course> planCourses = new LinkedHashMap<>();
        plan.getCourses().forEach(pc -> planCourses.put(pc.getCourse().getCourseCode(), pc.getCourse()));

        List<Course> minorCourses = minor == null ? List.of()
                : minor.coursesOf(plan.getPlanType(), plan.getStudyYear(), plan.getSemester()).stream()
                .filter(c -> !planCourses.containsKey(c.getCourseCode()))
                .toList();

        Set<String> codes = new LinkedHashSet<>(planCourses.keySet());
        minorCourses.forEach(c -> codes.add(c.getCourseCode()));
        Map<String, List<Section>> sectionsByCode = sectionRepository
                .findByCourseCodesAndTerm(codes, academicYear, plan.getSemester()).stream()
                .collect(Collectors.groupingBy(s -> s.getCourse().getCourseCode()));

        List<PlanCourseCandidate> candidates = new ArrayList<>();
        int order = 0;
        for (Course course : planCourses.values()) {
            candidates.add(new PlanCourseCandidate(course, PlanCourseSource.PLAN, order++,
                    sectionsByCode.getOrDefault(course.getCourseCode(), List.of())));
        }
        order = 0;
        for (Course course : minorCourses) {
            candidates.add(new PlanCourseCandidate(course, PlanCourseSource.MINOR, order++,
                    sectionsByCode.getOrDefault(course.getCourseCode(), List.of())));
        }
        return candidates;
    }

    /** บันทึกทั้งหมดใน transaction เดียว added ว่าง = ไม่เขียน DB และ updatedAt ไม่เปลี่ยน */
    private void saveAdded(String studentId, StudyPlan plan, int academicYear, Timetable existing,
                           List<Section> sections) {
        if (sections.isEmpty()) {
            return;
        }
        Timetable timetable = existing;
        if (timetable == null) {
            timetable = new Timetable();
            timetable.setStudentId(studentId);
            timetable.setAcademicYear(academicYear);
            timetable.setSemester(plan.getSemester());
        }
        timetable.touch();
        timetableRepository.save(timetable);

        List<TimetableEntry> entries = new ArrayList<>();
        for (Section section : sections) {
            TimetableEntry entry = new TimetableEntry();
            entry.setTimetable(timetable);
            entry.setSection(section);
            entries.add(entry);
        }
        timetableEntryRepository.saveAll(entries);
    }
}
