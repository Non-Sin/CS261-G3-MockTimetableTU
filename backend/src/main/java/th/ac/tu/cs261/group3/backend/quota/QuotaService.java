package th.ac.tu.cs261.group3.backend.quota;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaCourseData;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDataReader;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDetailsData;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaCourseResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaSearchResponse;
import th.ac.tu.cs261.group3.backend.timetable.Timetable;
import th.ac.tu.cs261.group3.backend.timetable.TimetableEntryRepository;
import th.ac.tu.cs261.group3.backend.timetable.TimetableRepository;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class QuotaService {

    private final Optional<QuotaDataReader> dataReader;
    private final TimetableRepository timetableRepository;
    private final TimetableEntryRepository timetableEntryRepository;
    private final int maxResults;

    public QuotaService(Optional<QuotaDataReader> dataReader,
                        TimetableRepository timetableRepository,
                        TimetableEntryRepository timetableEntryRepository,
                        @Value("${app.quota.max-results:50}") int maxResults) {
        if (maxResults < 1) throw new IllegalArgumentException("app.quota.max-results must be positive");
        this.dataReader = dataReader;
        this.timetableRepository = timetableRepository;
        this.timetableEntryRepository = timetableEntryRepository;
        this.maxResults = maxResults;
    }

    public QuotaSearchResponse searchCourses(String studentId, int academicYear, int semester, String q, boolean mine) {
        String query = q == null || q.isBlank() ? null : q.strip();
        if (query == null && !mine) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "QUOTA_SEARCH_QUERY_REQUIRED",
                    "กรุณาระบุคำค้นหาหรือเลือกเฉพาะวิชาในแผนของฉัน", Map.of());
        }

        QuotaDataReader reader = requireDataReader();
        Set<String> myCourseCodes = findMyCourseCodes(studentId, academicYear, semester);
        if (mine && myCourseCodes.isEmpty()) {
            return new QuotaSearchResponse(academicYear, semester, query, true, 0, List.of());
        }

        List<QuotaCourseData> matched = reader.searchCourses(query, mine ? myCourseCodes : null);
        List<QuotaCourseData> limited = matched.stream()
                .sorted(Comparator.comparing(QuotaCourseData::courseCode))
                .limit(maxResults)
                .toList();
        List<QuotaCourseResponse> courses = buildCourseResponses(reader, limited, academicYear, semester, myCourseCodes);
        return new QuotaSearchResponse(academicYear, semester, query, mine, matched.size(), courses);
    }

    public QuotaCourseResponse getCourseQuota(String studentId, String courseCode, int academicYear, int semester) {
        QuotaDataReader reader = requireDataReader();
        String normalizedCode = courseCode.strip().toUpperCase(Locale.ROOT);
        QuotaCourseData course = reader.findCourse(normalizedCode)
                .orElseThrow(() -> new ResourceNotFoundException("ไม่พบรายวิชา " + normalizedCode));
        Set<String> myCourseCodes = findMyCourseCodes(studentId, academicYear, semester);
        return buildCourseResponses(reader, List.of(course), academicYear, semester, myCourseCodes).getFirst();
    }

    private Set<String> findMyCourseCodes(String studentId, int academicYear, int semester) {
        Optional<Timetable> timetable = timetableRepository.findByStudentIdAndAcademicYearAndSemester(studentId, academicYear, semester);
        if (timetable.isEmpty()) return Set.of();

        Set<String> codes = new HashSet<>();
        timetableEntryRepository.findByTimetableId(timetable.get().getTimetableId())
                .forEach(entry -> codes.add(entry.getSection().getCourse().getCourseCode()));
        return codes;
    }

    private List<QuotaCourseResponse> buildCourseResponses(QuotaDataReader reader, List<QuotaCourseData> courses,
                                                          int academicYear, int semester, Set<String> myCourseCodes) {
        if (courses.isEmpty()) return List.of();

        List<String> codes = courses.stream().map(QuotaCourseData::courseCode).toList();
        Map<String, QuotaDetailsData> detailsByCode = reader.loadDetails(codes, academicYear, semester);
        return courses.stream().map(course -> {
            QuotaDetailsData details = detailsByCode.get(course.courseCode());
            if (details == null) throw new IllegalStateException("QuotaDataReader must return details for every requested course");
            List<Integer> offered = details.offeredSemesters().stream().distinct().sorted().toList();
            boolean inMine = myCourseCodes.contains(course.courseCode());

            // ลำดับมีความหมาย: ไม่เปิดสอนต้องมาก่อนสถานะข้อมูลโควตา
            if (!offered.contains(semester)) return QuotaCourseResponse.notOffered(course, inMine, offered);
            if (details.quotaRequired() == null) return QuotaCourseResponse.noData(course, inMine, offered);
            if (!details.quotaRequired()) return QuotaCourseResponse.notRequired(course, inMine, offered);
            return QuotaCourseResponse.required(course, inMine, offered, details);
        }).toList();
    }

    private QuotaDataReader requireDataReader() {
        // T08 ไม่สร้างข้อมูลเท็จใน API จริง: T09 จะเพิ่ม bean ที่อ่านจาก Repository
        return dataReader.orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "ระบบข้อมูลโควตายังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง"));
    }
}
