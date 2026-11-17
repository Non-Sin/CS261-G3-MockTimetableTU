-- ข้อมูลแนะนำวิชาเลือกเสรี ตาม US6-T06 ER Diagram
-- metadata เป็น 0..1 ต่อ course (shared primary key) ส่วน tags / bullet รีวิวเป็นตารางลูก
-- วิชาที่เผยแพร่ต้องเป็น FREE_ELECTIVE, มีรีวิวอย่างน้อย 1 ข้อ และมี section ในปีที่ขอ
-- เงื่อนไขเหล่านี้ตรวจใน query/seed ไม่ใช่ constraint เพราะข้ามตาราง

CREATE TABLE elective_info (
    course_code    NVARCHAR(10)  NOT NULL,
    course_name_th NVARCHAR(200) NOT NULL,
    interest_group NVARCHAR(20)  NOT NULL,
    requires_quota BIT           NOT NULL CONSTRAINT df_elective_info_quota DEFAULT 0,
    CONSTRAINT pk_elective_info PRIMARY KEY (course_code),
    CONSTRAINT fk_elective_info_course FOREIGN KEY (course_code)
        REFERENCES course(course_code),
    CONSTRAINT ck_elective_info_group CHECK (interest_group IN
        ('LANGUAGE', 'PSYCHOLOGY', 'SOCIETY', 'SCIENCE', 'MEDIA')),
    CONSTRAINT ck_elective_info_name CHECK (LEN(LTRIM(RTRIM(course_name_th))) > 0)
);

CREATE TABLE elective_tag (
    course_code NVARCHAR(10) NOT NULL,
    tag         NVARCHAR(20) NOT NULL,
    CONSTRAINT pk_elective_tag PRIMARY KEY (course_code, tag),
    CONSTRAINT fk_elective_tag_info FOREIGN KEY (course_code)
        REFERENCES elective_info(course_code) ON DELETE CASCADE,
    CONSTRAINT ck_elective_tag_value CHECK (tag IN
        ('NO_ATTENDANCE', 'NO_EXAM', 'NO_GROUP_WORK',
         'KIND_INSTRUCTOR', 'NO_PREREQUISITE', 'EASY_GRADE'))
);

-- sort_order เริ่ม 0 ให้ตรงกับ JPA @OrderColumn
CREATE TABLE elective_review_point (
    course_code NVARCHAR(10)   NOT NULL,
    sort_order  INT            NOT NULL,
    review_text NVARCHAR(1000) NOT NULL,
    CONSTRAINT pk_elective_review_point PRIMARY KEY (course_code, sort_order),
    CONSTRAINT fk_elective_review_info FOREIGN KEY (course_code)
        REFERENCES elective_info(course_code) ON DELETE CASCADE,
    CONSTRAINT ck_elective_review_order CHECK (sort_order >= 0),
    CONSTRAINT ck_elective_review_text CHECK (LEN(LTRIM(RTRIM(review_text))) > 0)
);
