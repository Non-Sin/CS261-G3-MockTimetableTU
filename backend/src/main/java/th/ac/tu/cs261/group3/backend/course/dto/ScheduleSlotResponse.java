package th.ac.tu.cs261.group3.backend.course.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;

/** คาบเรียน 1 คาบ ใช้ร่วมทั้งรายการวิชาและตารางเรียน */
public record ScheduleSlotResponse(
        DayOfWeek dayOfWeek,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        String room
) {
    public static ScheduleSlotResponse from(ScheduleSlot slot) {
        return new ScheduleSlotResponse(slot.getDayOfWeek(), slot.getStartTime(), slot.getEndTime(), slot.getRoom());
    }

    /**
     * แปลงคาบเรียนทั้งหมด เรียงตามวันในสัปดาห์แล้วเวลาเริ่ม
     * (DB เก็บ day_of_week เป็นข้อความ เรียงใน query จะได้ THURSDAY ก่อน TUESDAY)
     */
    public static List<ScheduleSlotResponse> fromAll(Collection<ScheduleSlot> slots) {
        return slots.stream()
                .map(ScheduleSlotResponse::from)
                .sorted(Comparator.comparing(ScheduleSlotResponse::dayOfWeek)
                        .thenComparing(ScheduleSlotResponse::startTime))
                .toList();
    }
}
