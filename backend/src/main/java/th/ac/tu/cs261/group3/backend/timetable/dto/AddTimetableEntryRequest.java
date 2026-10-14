package th.ac.tu.cs261.group3.backend.timetable.dto;

import jakarta.validation.constraints.NotNull;

/** body ของ POST /api/timetable/entries ภาคเรียนอ่านจาก section จึงไม่ต้องส่งมา */
public record AddTimetableEntryRequest(
        @NotNull Long sectionId
) {}
