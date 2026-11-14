-- ตารางแผนการเรียน (preset) และวิชาโท ตาม US8-T06 ER Diagram
-- preset และวิชาโทผูกกับหลักสูตร + ชั้นปี + ภาคเรียน ไม่ผูกกับปีการศึกษา (พ.ศ.)
-- ตอน apply ค่อยแปลง course_code เป็น section ของ academic_year ที่ขอมา

CREATE TABLE study_plan (
    plan_id         BIGINT IDENTITY(1,1) NOT NULL,
    department      NVARCHAR(100) NOT NULL,   -- ตรงกับ users.department (ไม่มี FK)
    curriculum_name NVARCHAR(200) NOT NULL,
    study_year      INT           NOT NULL,   -- ชั้นปีที่ 1–4
    semester        INT           NOT NULL,
    plan_type       NVARCHAR(20)  NULL,       -- SPECIAL_PROJECT / CO_OP เฉพาะชั้นปีที่ 3–4
    CONSTRAINT pk_study_plan PRIMARY KEY (plan_id),
    -- SQL Server นับ NULL เป็นค่าเดียวกัน ปี 1–2 จึงมีได้ 1 preset ต่อหลักสูตร/ภาค
    CONSTRAINT uq_study_plan UNIQUE (department, curriculum_name, study_year, semester, plan_type),
    CONSTRAINT ck_study_plan_semester CHECK (semester IN (1, 2)),
    -- บังคับช่วง study_year 1–4 ไปด้วย
    CONSTRAINT ck_study_plan_plan_type CHECK (
        (study_year IN (1, 2) AND plan_type IS NULL)
        OR (study_year IN (3, 4) AND plan_type IN ('SPECIAL_PROJECT', 'CO_OP'))
    )
);

CREATE TABLE study_plan_course (
    plan_id     BIGINT       NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    sort_order  INT          NOT NULL,        -- ลำดับในแผน ใช้ tie-break ของ PlanScheduler
    CONSTRAINT pk_study_plan_course PRIMARY KEY (plan_id, course_code),
    CONSTRAINT uq_study_plan_course_order UNIQUE (plan_id, sort_order),
    CONSTRAINT fk_study_plan_course_plan FOREIGN KEY (plan_id) REFERENCES study_plan (plan_id) ON DELETE CASCADE,
    CONSTRAINT fk_study_plan_course_course FOREIGN KEY (course_code) REFERENCES course (course_code)
);

CREATE TABLE study_minor (
    minor_id        BIGINT IDENTITY(1,1) NOT NULL,
    department      NVARCHAR(100) NOT NULL,   -- ตรงกับ users.department (ไม่มี FK)
    curriculum_name NVARCHAR(200) NOT NULL,   -- ตรงกับ study_plan.curriculum_name
    minor_name      NVARCHAR(100) NOT NULL,   -- เช่น วิทยาการข้อมูล, ปัญญาประดิษฐ์
    sort_order      INT           NOT NULL,   -- ลำดับปุ่มวิชาโท
    CONSTRAINT pk_study_minor PRIMARY KEY (minor_id),
    CONSTRAINT uq_study_minor UNIQUE (department, curriculum_name, minor_name),
    CONSTRAINT uq_study_minor_order UNIQUE (department, curriculum_name, sort_order)
);

CREATE TABLE study_minor_course (
    minor_id    BIGINT       NOT NULL,
    course_code NVARCHAR(10) NOT NULL,
    study_year  INT          NOT NULL,        -- วิชาโทแนะนำให้เรียนชั้นปี/ภาคไหน (3–4 เท่านั้น)
    semester    INT          NOT NULL,
    sort_order  INT          NOT NULL,        -- ลำดับในภาคนั้น
    CONSTRAINT pk_study_minor_course PRIMARY KEY (minor_id, course_code),
    CONSTRAINT uq_study_minor_course_order UNIQUE (minor_id, study_year, semester, sort_order),
    CONSTRAINT fk_study_minor_course_minor FOREIGN KEY (minor_id) REFERENCES study_minor (minor_id) ON DELETE CASCADE,
    CONSTRAINT fk_study_minor_course_course FOREIGN KEY (course_code) REFERENCES course (course_code),
    CONSTRAINT ck_study_minor_course_semester CHECK (semester IN (1, 2)),
    CONSTRAINT ck_study_minor_course_year CHECK (study_year IN (3, 4))
);
