-- ตารางรายวิชา กลุ่มเรียน คาบเรียน และตารางเรียนจำลอง ตาม US1-T06 ER Diagram

CREATE TABLE course (
    course_code NVARCHAR(10)  NOT NULL,
    course_name NVARCHAR(200) NOT NULL,
    category    NVARCHAR(20)  NOT NULL,
    credits     INT           NOT NULL,
    CONSTRAINT pk_course PRIMARY KEY (course_code),
    CONSTRAINT ck_course_category CHECK (category IN ('MAJOR', 'GENERAL_EDUCATION', 'FREE_ELECTIVE')),
    CONSTRAINT ck_course_credits CHECK (credits >= 0)
);

CREATE TABLE section (
    section_id    BIGINT IDENTITY(1,1) NOT NULL,
    course_code   NVARCHAR(10)  NOT NULL,
    section_no    NVARCHAR(10)  NOT NULL,
    instructor    NVARCHAR(100) NULL,
    academic_year INT           NOT NULL,   -- พ.ศ.
    semester      INT           NOT NULL,
    CONSTRAINT pk_section PRIMARY KEY (section_id),
    CONSTRAINT fk_section_course FOREIGN KEY (course_code) REFERENCES course (course_code),
    -- รหัสกลุ่มซ้ำได้ข้ามภาคเรียน
    CONSTRAINT uq_section_course_term_no UNIQUE (course_code, academic_year, semester, section_no)
);

CREATE TABLE schedule_slot (
    slot_id     BIGINT IDENTITY(1,1) NOT NULL,
    section_id  BIGINT       NOT NULL,
    day_of_week NVARCHAR(10) NOT NULL,
    start_time  TIME(0)      NOT NULL,
    end_time    TIME(0)      NOT NULL,
    room        NVARCHAR(50) NULL,
    CONSTRAINT pk_schedule_slot PRIMARY KEY (slot_id),
    CONSTRAINT fk_schedule_slot_section FOREIGN KEY (section_id) REFERENCES section (section_id) ON DELETE CASCADE,
    CONSTRAINT ck_schedule_slot_day CHECK (day_of_week IN
        ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    CONSTRAINT ck_schedule_slot_time CHECK (end_time > start_time)
);

CREATE INDEX ix_schedule_slot_section ON schedule_slot (section_id);

CREATE TABLE timetable (
    timetable_id  BIGINT IDENTITY(1,1) NOT NULL,
    student_id    NVARCHAR(20)   NOT NULL,   -- ยังไม่มีตารางนักศึกษา (รอ US3)
    academic_year INT            NOT NULL,
    semester      INT            NOT NULL,
    updated_at    DATETIMEOFFSET NOT NULL,
    CONSTRAINT pk_timetable PRIMARY KEY (timetable_id),
    -- 1 นักศึกษามี 1 ตารางต่อภาคเรียน
    CONSTRAINT uq_timetable_student_term UNIQUE (student_id, academic_year, semester)
);

CREATE TABLE timetable_entry (
    entry_id     BIGINT IDENTITY(1,1) NOT NULL,
    timetable_id BIGINT NOT NULL,
    section_id   BIGINT NOT NULL,
    CONSTRAINT pk_timetable_entry PRIMARY KEY (entry_id),
    CONSTRAINT fk_timetable_entry_timetable FOREIGN KEY (timetable_id) REFERENCES timetable (timetable_id) ON DELETE CASCADE,
    CONSTRAINT fk_timetable_entry_section FOREIGN KEY (section_id) REFERENCES section (section_id),
    -- กันเพิ่มกลุ่มเดียวกันซ้ำ
    CONSTRAINT uq_timetable_entry_section UNIQUE (timetable_id, section_id)
);

CREATE INDEX ix_timetable_entry_section ON timetable_entry (section_id);
