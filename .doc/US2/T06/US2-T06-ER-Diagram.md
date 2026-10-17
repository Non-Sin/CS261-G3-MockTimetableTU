# US2-T06 — ER Diagram (DB)

US2 **ไม่เปลี่ยน schema และไม่มี migration ใหม่** ใช้ตารางตาม [ER Diagram ของ US1-T06](../../US1/T06/US1-T06-ER-Diagram.md) (`V20261014_1940__create_timetable_tables.sql`) แผนภาพนี้คือแผนภาพเดิมของ US1 ที่ใส่หมายเหตุว่า US2 ใช้คอลัมน์ไหน ตามที่ ER ของ US1 เขียนไว้ว่าการลบใน US2 "ไม่กระทบ schema นี้"

```mermaid
erDiagram
    COURSE ||--|{ SECTION : "มีกลุ่มเรียน"
    SECTION ||--o{ SCHEDULE_SLOT : "มีคาบเรียน"
    TIMETABLE ||--o{ TIMETABLE_ENTRY : "มีวิชา"
    SECTION ||--o{ TIMETABLE_ENTRY : "ถูกเลือก"

    COURSE {
        NVARCHAR(10) course_code PK
        NVARCHAR(200) course_name
        NVARCHAR(20) category "MAJOR, GENERAL_EDUCATION, FREE_ELECTIVE"
        int credits
    }
    SECTION {
        bigint section_id PK
        NVARCHAR(10) course_code FK
        NVARCHAR(10) section_no
        NVARCHAR(100) instructor
        int academic_year "พ.ศ."
        int semester
    }
    SCHEDULE_SLOT {
        bigint slot_id PK
        bigint section_id FK
        NVARCHAR(10) day_of_week "MONDAY ... SUNDAY"
        time start_time
        time end_time
        NVARCHAR(50) room
    }
    TIMETABLE {
        bigint timetable_id PK "US2 เช็กว่า entry อยู่ตารางเดียวกัน"
        NVARCHAR(20) student_id "US2 เช็กความเป็นเจ้าของ"
        int academic_year "US2 ใช้สร้าง response"
        int semester "US2 ใช้สร้าง response"
        DATETIMEOFFSET updated_at "US2 อัปเดตทุกครั้งที่ลบ"
    }
    TIMETABLE_ENTRY {
        bigint entry_id PK "US2 ลบแถวด้วยค่านี้"
        bigint timetable_id FK
        bigint section_id FK
    }
```

US2 ทำอะไรกับแต่ละตาราง

| ตาราง | US2 ทำอะไร | ผ่านอะไร |
| --- | --- | --- |
| `timetable_entry` | อ่านตาม `entry_id` แล้ว **ลบ** แถว | `findAllById`, `deleteAll` |
| `timetable` | อ่านเพื่อเช็ก `student_id` และ `timetable_id` แล้ว **อัปเดต** `updated_at` | `entry.getTimetable()`, `touch()` |
| `section`, `course`, `schedule_slot` | อ่านอย่างเดียว ตอนสร้าง response | `getTimetable` ของ US1 |

ผลของ constraint เดิมต่อการลบ

| Constraint | ผลต่อ US2 |
| --- | --- |
| `fk_timetable_entry_timetable` (`ON DELETE CASCADE`) | ทำงานเฉพาะตอนลบแถว `timetable` ซึ่ง US2 ไม่ลบ แถว `timetable` จึงยังอยู่แม้ลบวิชาจนหมด |
| `fk_timetable_entry_section` | ลบ entry ไม่กระทบ `section` เพราะ FK ชี้จาก entry ไป section ไม่มีตารางไหนชี้กลับมาที่ `timetable_entry` จึงลบได้ทันที |
| `uq_timetable_entry_section` (`timetable_id`, `section_id`) | พอลบ entry แล้ว คู่นี้ว่างลง เพิ่มกลุ่มเดิมกลับมาได้ แต่จะได้ `entry_id` ใหม่ เพราะ IDENTITY ไม่ใช้เลขเดิมซ้ำ |
| `uq_timetable_student_term` (`student_id`, `academic_year`, `semester`) | ทำให้ "ตารางเดียวกัน" เท่ากับ "ปีและภาคเดียวกัน" US2 จึงเช็กแค่ `timetable_id` ไม่ต้องเทียบปีกับภาคเอง |

- **ความเป็นเจ้าของ** เช็กจาก `timetable.student_id` ของ entry เทียบกับรหัสจาก `CurrentStudentProvider` ไม่มีคอลัมน์ `student_id` ใน `timetable_entry` และไม่ต้องเพิ่ม
- **ตารางที่ลบจนว่าง** ยังมีแถว `timetable` พร้อม `updated_at` ต่างจากภาคที่ไม่เคยเพิ่มวิชาซึ่งไม่มีแถว `timetable` เลย (`updatedAt: null` ตาม US1)

## เอกสารที่เกี่ยวข้อง

- [Sequence Diagram](./US2-T06-Sequence-Diagram.md)
- [DAO Class Diagram](./US2-T06-DAO-Class-Diagram.md)
- [Extended API Class Diagram](./US2-T06-Extended-API-Class-Diagram.md)
- [ER Diagram (DB)](./US2-T06-ER-Diagram.md)
- [US1-T06 — ER Diagram](../../US1/T06/US1-T06-ER-Diagram.md)
