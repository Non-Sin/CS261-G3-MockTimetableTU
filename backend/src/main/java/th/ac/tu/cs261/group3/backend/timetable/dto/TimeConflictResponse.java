package th.ac.tu.cs261.group3.backend.timetable.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * ช่วงเวลาที่ 2 วิชาชนกัน 1 รายการต่อ 1 คู่ต่อ 1 วัน
 * คู่เดียวกันที่ชนหลายวันจึงได้หลายรายการ
 */
public record TimeConflictResponse(
        DayOfWeek dayOfWeek,
        @JsonFormat(pattern = "HH:mm") LocalTime overlapStart,
        @JsonFormat(pattern = "HH:mm") LocalTime overlapEnd,
        List<String> courseCodes
) {}
