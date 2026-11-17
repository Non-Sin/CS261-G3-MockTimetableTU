package th.ac.tu.cs261.group3.backend.quota.dto;

import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.quota.QuotaStatus;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaCourseData;
import th.ac.tu.cs261.group3.backend.quota.data.QuotaDetailsData;

import java.util.List;

public record QuotaCourseResponse(
        String courseCode,
        String courseName,
        String courseNameTh,
        CourseCategory category,
        int credits,
        boolean inMyTimetable,
        QuotaStatus quotaStatus,
        List<Integer> offeredSemesters,
        List<QuotaConditionResponse> conditions,
        List<QuotaRoundResponse> rounds,
        List<QuotaChannelResponse> channels,
        List<QuotaContactResponse> contacts) {

    public QuotaCourseResponse {
        offeredSemesters = List.copyOf(offeredSemesters);
        conditions = List.copyOf(conditions);
        rounds = List.copyOf(rounds);
        channels = List.copyOf(channels);
        contacts = List.copyOf(contacts);
    }

    public static QuotaCourseResponse notOffered(QuotaCourseData course, boolean inMine, List<Integer> offered) {
        return withoutDetails(course, inMine, offered, QuotaStatus.NOT_OFFERED);
    }

    public static QuotaCourseResponse noData(QuotaCourseData course, boolean inMine, List<Integer> offered) {
        return withoutDetails(course, inMine, offered, QuotaStatus.NO_DATA);
    }

    public static QuotaCourseResponse notRequired(QuotaCourseData course, boolean inMine, List<Integer> offered) {
        return withoutDetails(course, inMine, offered, QuotaStatus.NOT_REQUIRED);
    }

    public static QuotaCourseResponse required(QuotaCourseData course, boolean inMine,
                                               List<Integer> offered, QuotaDetailsData details) {
        return new QuotaCourseResponse(course.courseCode(), course.courseName(), course.courseNameTh(),
                course.category(), course.credits(), inMine, QuotaStatus.REQUIRED, offered,
                details.conditions(), details.rounds(), details.channels(), details.contacts());
    }

    private static QuotaCourseResponse withoutDetails(QuotaCourseData course, boolean inMine,
                                                       List<Integer> offered, QuotaStatus status) {
        return new QuotaCourseResponse(course.courseCode(), course.courseName(), course.courseNameTh(),
                course.category(), course.credits(), inMine, status, offered,
                List.of(), List.of(), List.of(), List.of());
    }
}
