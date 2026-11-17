package th.ac.tu.cs261.group3.backend.quota.data;

import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseRepository;
import th.ac.tu.cs261.group3.backend.course.SectionRepository;
import th.ac.tu.cs261.group3.backend.quota.CourseQuotaInfo;
import th.ac.tu.cs261.group3.backend.quota.QuotaInfoRepository;
import th.ac.tu.cs261.group3.backend.quota.QuotaRound;
import th.ac.tu.cs261.group3.backend.quota.QuotaRoundRepository;
import th.ac.tu.cs261.group3.backend.quota.dto.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/** อ่านฐานข้อมูลจริงให้ API ของ T08; การตัดสิน quotaStatus ยังคงอยู่ใน QuotaService */
@Repository
@Transactional(readOnly = true)
public class JpaQuotaDataReader implements QuotaDataReader {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final QuotaInfoRepository quotaInfoRepository;
    private final QuotaRoundRepository quotaRoundRepository;

    public JpaQuotaDataReader(CourseRepository courseRepository, SectionRepository sectionRepository,
                             QuotaInfoRepository quotaInfoRepository, QuotaRoundRepository quotaRoundRepository) {
        this.courseRepository = courseRepository;
        this.sectionRepository = sectionRepository;
        this.quotaInfoRepository = quotaInfoRepository;
        this.quotaRoundRepository = quotaRoundRepository;
    }

    @Override
    public List<QuotaCourseData> searchCourses(String q, Set<String> courseCodes) {
        return courseRepository.searchAllCourses(q, courseCodes).stream().map(this::toCourseData).toList();
    }

    @Override
    public Optional<QuotaCourseData> findCourse(String normalizedCode) {
        return courseRepository.findById(normalizedCode).map(this::toCourseData);
    }

    @Override
    public Map<String, QuotaDetailsData> loadDetails(List<String> courseCodes, int academicYear, int semester) {
        if (courseCodes.isEmpty()) {
            return Map.of();
        }

        // สาม batch queries ตาม T06: ภาคที่เปิดสอน, ข้อมูลหลักพร้อมลูก, รอบของภาคที่ขอ
        Map<String, List<Integer>> semestersByCode = new HashMap<>();
        for (Object[] row : sectionRepository.findOfferedSemestersByCourseCodesAndYear(courseCodes, academicYear)) {
            semestersByCode.computeIfAbsent((String) row[0], code -> new ArrayList<>()).add((Integer) row[1]);
        }
        Map<String, CourseQuotaInfo> infoByCode = new HashMap<>();
        for (CourseQuotaInfo info : quotaInfoRepository.findWithDetailsByCourseCodes(courseCodes)) {
            infoByCode.put(info.getCourseCode(), info);
        }
        Map<String, List<QuotaRoundResponse>> roundsByCode = new HashMap<>();
        for (QuotaRound round : quotaRoundRepository.findByCourseCodesAndTerm(courseCodes, academicYear, semester)) {
            var response = new QuotaRoundResponse(round.getRoundNo(), round.getLabel(), round.getStartDate(),
                    round.getEndDate(), round.getEndTime());
            roundsByCode.computeIfAbsent(round.getQuotaInfo().getCourseCode(), code -> new ArrayList<>()).add(response);
        }

        Map<String, QuotaDetailsData> result = new LinkedHashMap<>();
        for (String code : courseCodes) {
            CourseQuotaInfo info = infoByCode.get(code);
            List<Integer> offered = semestersByCode.getOrDefault(code, List.of());
            if (info == null) {
                // ต้องมี key แม้ไม่มีข้อมูล และใช้ null เพื่อแยกจาก quotaRequired=false
                result.put(code, new QuotaDetailsData(offered, null, List.of(), List.of(), List.of(), List.of()));
            } else {
                result.put(code, new QuotaDetailsData(offered, info.isQuotaRequired(),
                        info.getConditions().stream().map(c -> new QuotaConditionResponse(
                                c.getConditionText(), c.getRelatedCourseCode())).toList(),
                        roundsByCode.getOrDefault(code, List.of()),
                        info.getChannels().stream().map(c -> new QuotaChannelResponse(
                                c.getChannelType(), c.getLabel(), c.getUrl(), c.getNote())).toList(),
                        info.getContacts().stream().map(c -> new QuotaContactResponse(
                                c.getOrganizationName(), c.getLabel(), c.getUrl())).toList()));
            }
        }
        return result;
    }

    private QuotaCourseData toCourseData(Course course) {
        return new QuotaCourseData(course.getCourseCode(), course.getCourseName(), course.getCourseNameTh(),
                course.getCategory(), course.getCredits());
    }
}
