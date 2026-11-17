-- US7-T06: เพิ่มชื่อไทยร่วมและข้อมูลโควตา โดยไม่แก้ migration/seed ที่ merge แล้ว
ALTER TABLE course ADD course_name_th NVARCHAR(200) NULL;
GO

-- ฐานข้อมูลที่มีข้อมูล US6 แล้ว: คัดลอกชื่อไทยเดิมโดยไม่ลบคอลัมน์ที่ US6 ยังใช้อยู่
UPDATE c SET course_name_th = e.course_name_th
FROM course c JOIN elective_info e ON e.course_code = c.course_code
WHERE c.course_name_th IS NULL;

CREATE TABLE course_quota_info (
    course_code NVARCHAR(10) NOT NULL,
    quota_required BIT NOT NULL,
    CONSTRAINT pk_course_quota_info PRIMARY KEY (course_code),
    CONSTRAINT fk_course_quota_info_course FOREIGN KEY (course_code) REFERENCES course(course_code)
);

CREATE TABLE quota_condition (
    condition_id BIGINT IDENTITY(1,1) NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    sort_order INT NOT NULL,
    condition_text NVARCHAR(500) NOT NULL,
    related_course_code NVARCHAR(10) NULL,
    CONSTRAINT pk_quota_condition PRIMARY KEY (condition_id),
    CONSTRAINT fk_quota_condition_info FOREIGN KEY (course_code)
        REFERENCES course_quota_info(course_code) ON DELETE CASCADE,
    CONSTRAINT fk_quota_condition_related_course FOREIGN KEY (related_course_code) REFERENCES course(course_code),
    CONSTRAINT uq_quota_condition_order UNIQUE (course_code, sort_order)
);

CREATE TABLE quota_round (
    round_id BIGINT IDENTITY(1,1) NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    academic_year INT NOT NULL,
    semester INT NOT NULL,
    round_no INT NOT NULL,
    label NVARCHAR(100) NULL,
    start_date DATE NULL,
    end_date DATE NOT NULL,
    start_time TIME(0) NULL,
    end_time TIME(0) NULL,
    CONSTRAINT pk_quota_round PRIMARY KEY (round_id),
    CONSTRAINT fk_quota_round_info FOREIGN KEY (course_code)
        REFERENCES course_quota_info(course_code) ON DELETE CASCADE,
    CONSTRAINT uq_quota_round_term_no UNIQUE (course_code, academic_year, semester, round_no),
    CONSTRAINT ck_quota_round_semester CHECK (semester IN (1, 2)),
    CONSTRAINT ck_quota_round_dates CHECK (start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE quota_channel (
    channel_id BIGINT IDENTITY(1,1) NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    sort_order INT NOT NULL,
    channel_type NVARCHAR(20) NOT NULL,
    label NVARCHAR(200) NOT NULL,
    url NVARCHAR(500) NULL,
    note NVARCHAR(300) NULL,
    CONSTRAINT pk_quota_channel PRIMARY KEY (channel_id),
    CONSTRAINT fk_quota_channel_info FOREIGN KEY (course_code)
        REFERENCES course_quota_info(course_code) ON DELETE CASCADE,
    CONSTRAINT uq_quota_channel_order UNIQUE (course_code, sort_order),
    CONSTRAINT ck_quota_channel_type CHECK (channel_type IN
        ('ONLINE_FORM', 'QUOTA_SYSTEM', 'FACULTY_OFFICE', 'INSTRUCTOR', 'OTHER')),
    CONSTRAINT ck_quota_channel_url CHECK (url IS NULL OR url LIKE 'https://%')
);

CREATE TABLE quota_contact (
    contact_id BIGINT IDENTITY(1,1) NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    sort_order INT NOT NULL,
    organization_name NVARCHAR(200) NOT NULL,
    label NVARCHAR(200) NOT NULL,
    url NVARCHAR(500) NULL,
    CONSTRAINT pk_quota_contact PRIMARY KEY (contact_id),
    CONSTRAINT fk_quota_contact_info FOREIGN KEY (course_code)
        REFERENCES course_quota_info(course_code) ON DELETE CASCADE,
    CONSTRAINT uq_quota_contact_order UNIQUE (course_code, sort_order),
    CONSTRAINT ck_quota_contact_url CHECK (url IS NULL OR url LIKE 'https://%')
);
