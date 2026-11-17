-- US7-T09: ข้อมูลตัวอย่างสำหรับ dev/ทดสอบตาม US7-T05 (ปี 2568; วันที่ ค.ศ. 2025)
-- ไม่ใช่ประกาศกำหนดการปัจจุบันของมหาวิทยาลัย ห้ามใช้แทนประกาศจากคณะ
-- รักษารายวิชาและกลุ่มเรียนเดิมของ US1/US6/US8 และไม่สร้างตารางให้นักศึกษาคนใด

INSERT INTO course (course_code, course_name, course_name_th, category, credits)
SELECT v.course_code, v.course_name, v.course_name_th, v.category, 3
FROM (VALUES
    (N'EL395', N'ACADEMIC ENGLISH AND STUDY SKILL 2', N'ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2', N'GENERAL_EDUCATION'),
    (N'EL295', N'ACADEMIC ENGLISH AND STUDY SKILL 1', N'ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1', N'GENERAL_EDUCATION'),
    (N'CS232', N'COMPUTER ORGANIZATION AND ARCHITECTURE', N'องค์ประกอบและสถาปัตยกรรมคอมพิวเตอร์', N'MAJOR')
) v(course_code, course_name, course_name_th, category)
WHERE NOT EXISTS (SELECT 1 FROM course c WHERE c.course_code = v.course_code);

-- รองรับ fresh DB และข้อมูล US6 ที่ลง seed ไว้แล้ว โดยไม่แก้ไฟล์ seed เดิม
UPDATE c SET course_name_th = e.course_name_th
FROM course c JOIN elective_info e ON e.course_code = c.course_code
WHERE c.course_name_th IS NULL;

UPDATE c SET course_name_th = v.course_name_th
FROM course c JOIN (VALUES
    (N'EL395', N'ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 2'),
    (N'EL295', N'ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1'),
    (N'CS232', N'องค์ประกอบและสถาปัตยกรรมคอมพิวเตอร์'),
    (N'MA211', N'แคลคูลัส 1'),
    (N'LAS101', N'การคิดเชิงวิพากษ์ การอ่าน และการเขียน'),
    (N'TU101', N'โลก อาเซียน และไทย')
) v(course_code, course_name_th) ON v.course_code = c.course_code
WHERE c.course_name_th IS NULL;

INSERT INTO section (course_code, section_no, academic_year, semester)
SELECT v.course_code, N'Q70001', 2568, v.semester
FROM (VALUES (N'EL395', 1), (N'EL395', 2), (N'EL295', 1), (N'EL295', 2), (N'CS232', 1)) v(course_code, semester)
WHERE NOT EXISTS (SELECT 1 FROM section s
    WHERE s.course_code = v.course_code AND s.academic_year = 2568 AND s.semester = v.semester);

-- TU101 มี course/section แต่ไม่มี quota_info => NO_DATA
-- FR205 เปิดเฉพาะ 2568/1 จาก seed US6 => NOT_OFFERED เมื่อขอภาค 2
INSERT INTO course_quota_info (course_code, quota_required)
VALUES (N'EL395', 1), (N'MA211', 1), (N'LAS101', 1), (N'PC280', 1), (N'EL295', 0), (N'CS232', 0);

INSERT INTO quota_condition (course_code, sort_order, condition_text, related_course_code)
VALUES (N'EL395', 1,
    N'ต้องสอบได้วิชา EL295 Academic English and Study Skill 1 (ภาษาอังกฤษเชิงวิชาการและทักษะการศึกษา 1)', N'EL295');

-- EL395 หลายช่องทาง รวมกรณีออฟไลน์ url=NULL
INSERT INTO quota_channel (course_code, sort_order, channel_type, label, url, note)
VALUES
    (N'EL395', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตา LITU', N'https://quota-litu.web.app/login', NULL),
    (N'EL395', 2, N'FACULTY_OFFICE', N'ติดต่อสถาบันภาษา', NULL, N'ข้อมูลตัวอย่าง: สอบถามช่องทางสำรองที่หน่วยงาน'),
    (N'MA211', 1, N'ONLINE_FORM', N'ผ่าน Google Form', N'https://forms.gle/NWTyPnsVWtyDak3W8', NULL),
    (N'LAS101', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตาคณะศิลปศาสตร์', N'https://quota.arts.tu.ac.th/', NULL),
    (N'PC280', 1, N'INSTRUCTOR', N'ติดต่ออาจารย์ผู้สอน', NULL, N'MS Teams wchumpon@tu.ac.th');

INSERT INTO quota_contact (course_code, sort_order, organization_name, label, url)
VALUES
    (N'EL395', 1, N'สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์ (LITU)', N'Facebook: สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์', N'https://www.facebook.com/litu.thammasat'),
    (N'MA211', 1, N'ภาควิชาคณิตศาสตร์และสถิติ คณะวิทยาศาสตร์และเทคโนโลยี', N'Facebook: ภาควิชาคณิตศาสตร์และสถิติ มธ.', N'https://www.facebook.com/mathstat.thammasat'),
    (N'LAS101', 1, N'งานบริการการศึกษา คณะศิลปศาสตร์ มหาวิทยาลัยธรรมศาสตร์', N'Facebook: งานบริการการศึกษา คณะศิลปศาสตร์ มธ.', N'https://www.facebook.com/Academic.LartsTU'),
    (N'PC280', 1, N'สาขาวิชาฟิสิกส์', N'MS Teams wchumpon@tu.ac.th', NULL);

INSERT INTO quota_round (course_code, academic_year, semester, round_no, label, start_date, end_date, start_time, end_time)
VALUES
    (N'EL395', 2568, 1, 1, N'คำร้องช่วงต้น', '2025-08-04', '2025-08-08', NULL, NULL),
    (N'EL395', 2568, 1, 2, N'คำร้องรอบสอง', '2025-08-18', '2025-08-21', NULL, NULL),
    (N'LAS101', 2568, 1, 1, NULL, '2025-08-05', '2025-08-08', NULL, NULL),
    (N'LAS101', 2568, 1, 2, NULL, '2025-08-22', '2025-08-23', NULL, NULL),
    (N'MA211', 2568, 1, 1, NULL, NULL, '2025-08-20', NULL, '15:00');
