package th.ac.tu.cs261.group3.backend.quota.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalTime;

public record QuotaRoundResponse(
        int roundNo,
        String label,
        LocalDate startDate,
        LocalDate endDate,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime) {
}
