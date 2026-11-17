package th.ac.tu.cs261.group3.backend.quota.dto;

import java.util.List;

public record QuotaSearchResponse(
        int academicYear, int semester, String query, boolean mine, int total, List<QuotaCourseResponse> courses) {

    public QuotaSearchResponse {
        courses = List.copyOf(courses);
    }
}
