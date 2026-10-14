# DTO Class Diagram

## DTO Class Diagram

```mermaid
classDiagram
    direction LR

    class TimetableResponse {
        <<US1 DTO>>
    }

    class TimetableEntryResponse {
        <<US1 DTO>>
    }

    class TimeConflictResponse {
        <<US1 DTO>>
    }

    class ScheduleSlotResponse {
        <<US1 DTO>>
    }

    class DeleteTimetableEntriesRequest {
        <<US2 DTO>>
        -entryIds: List~Long~
    }

    TimetableResponse *-- TimetableEntryResponse : entries
    TimetableResponse *-- TimeConflictResponse : conflicts
    TimetableEntryResponse *-- ScheduleSlotResponse : schedules
```

US2 ใช้ DTO ตารางเรียนจาก US1 ต่อ โดยไม่สร้าง `TimetableResponse` ใหม่

DTO ที่ใช้ร่วมกับ US1:
- `TimetableResponse`
- `TimetableEntryResponse`
- `TimeConflictResponse`
- `ScheduleSlotResponse`

DTO ที่เพิ่มใน US2:

### `DeleteTimetableEntriesRequest`

| Field | Type |
|---|---|
| entryIds | List<Long> |

ใช้รับรายการ `entryId` ของวิชาที่ผู้ใช้เลือกสำหรับการลบหลายรายการ
