-- US7-T10: เติมข้อมูลโควตาจากชีทต้นทางให้ครบ (อ้างอิง academic_year = 2568 เพื่อไม่กระทบข้อมูลตาราง/กลุ่มเรียนของ US1/US6/US8)
-- คงข้อมูลตัวอย่างเดิมของ V20261117_1812 (EL395, MA211, LAS101, PC280, CS232) และคง TU101 ไว้เป็น NO_DATA ตาม US7-T14

-- 1. เติมชื่อภาษาไทยจากชีทโควตาสำหรับวิชาที่ยังเป็น NULL
UPDATE c SET course_name_th = v.course_name_th
FROM course c
JOIN (VALUES
    (N'EL105', N'ทักษะการสื่อสารทางภาษาอังกฤษ'),
    (N'ST216', N'สถิติสำหรับสังคมศาสตร์ 1')
) v(course_code, course_name_th) ON v.course_code = c.course_code
WHERE c.course_name_th IS NULL;

-- 2. แก้ EL295 จาก NOT_REQUIRED (0) เป็น REQUIRED (1) ให้ตรงกับชีทและ US7-T05 / US7-T14
UPDATE course_quota_info
SET quota_required = 1
WHERE course_code = N'EL295';

-- 3. เพิ่มรายวิชาที่ต้องขอโควตาจากชีทโควตา (และวิชาเลือกเสรีที่ระบุโควตา=TRUE ในชีทค้นหาวิชา)
INSERT INTO course_quota_info (course_code, quota_required)
SELECT v.course_code, 1
FROM (VALUES
    (N'EL105'),
    (N'ST216'),
    (N'AN347'),
    (N'FD216'),
    (N'IS313'),
    (N'TH291'),
    (N'EG214'),
    (N'FR205'),
    (N'JC217'),
    (N'AS201'),
    (N'PB317')
) v(course_code)
WHERE EXISTS (SELECT 1 FROM course c WHERE c.course_code = v.course_code)
  AND NOT EXISTS (SELECT 1 FROM course_quota_info q WHERE q.course_code = v.course_code);

-- 4. เพิ่มรายวิชา CS และวิชาที่ระบุโควตา=FALSE ในชีทค้นหาวิชา เป็น NOT_REQUIRED (0)
--    (เว้น TU101 ไว้ไม่มีแถวใน course_quota_info เพื่อคงเคสทดสอบ NO_DATA ตาม US7-T14 / QuotaMigrationTest)
INSERT INTO course_quota_info (course_code, quota_required)
SELECT v.course_code, 0
FROM (VALUES
    (N'CS100'), (N'CS101'), (N'CS102'), (N'CS111'), (N'CS180'),
    (N'CS213'), (N'CS217'), (N'CS221'), (N'CS222'), (N'CS223'), (N'CS224'),
    (N'CS240'), (N'CS241'), (N'CS242'), (N'CS246'), (N'CS251'), (N'CS261'), (N'CS271'),
    (N'CS301'), (N'CS303'), (N'CS305'), (N'CS314'), (N'CS331'), (N'CS332'),
    (N'CS341'), (N'CS342'), (N'CS343'), (N'CS345'), (N'CS346'),
    (N'CS361'), (N'CS365'), (N'CS366'), (N'CS370'), (N'CS371'), (N'CS372'), (N'CS373'), (N'CS374'),
    (N'CS384'), (N'CS403'), (N'CS404'), (N'CS440'),
    (N'TU100'), (N'TU103'), (N'TU106'), (N'TU107'), (N'TU108'), (N'TU109'),
    (N'ST329'), (N'RE468'), (N'GE225'), (N'AN242'), (N'AT326'),
    (N'PY200'), (N'PY320'), (N'PY252'), (N'PY250')
) v(course_code)
WHERE EXISTS (SELECT 1 FROM course c WHERE c.course_code = v.course_code)
  AND NOT EXISTS (SELECT 1 FROM course_quota_info q WHERE q.course_code = v.course_code);

-- 5. ช่องทางการขอโควตาตามชีท (ไม่ทับข้อมูลเดิมของ EL395, MA211, LAS101, PC280)
INSERT INTO quota_channel (course_code, sort_order, channel_type, label, url, note)
SELECT v.course_code, v.sort_order, v.channel_type, v.label, v.url, v.note
FROM (VALUES
    (N'EL105', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตา LITU', N'https://quota-litu.web.app/', NULL),
    (N'EL295', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตา LITU', N'https://quota-litu.web.app/', NULL),
    (N'ST216', 1, N'ONLINE_FORM',  N'ผ่านแบบฟอร์มขอโควตา สาขาวิชาคณิตศาสตร์และสถิติ', N'https://short.tu.ac.th/Cbv8F', NULL),
    (N'AN347', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตาคณะสังคมวิทยาและมานุษยวิทยา', N'https://quota.socanth.tu.ac.th/', NULL),
    (N'FD216', 1, N'ONLINE_FORM',  N'ผ่าน Google Form', N'https://forms.gle/dJQHjWEpPSceBypq7', NULL),
    (N'IS313', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตาคณะพาณิชยศาสตร์และการบัญชี', N'https://quota.tbs.tu.ac.th/', NULL),
    (N'TH291', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตาคณะศิลปศาสตร์', N'https://quota.arts.tu.ac.th/', NULL),
    (N'EG214', 1, N'QUOTA_SYSTEM', N'ผ่านเว็บไซต์ระบบโควตาคณะศิลปศาสตร์', N'https://quota.arts.tu.ac.th/', NULL)
) v(course_code, sort_order, channel_type, label, url, note)
WHERE EXISTS (SELECT 1 FROM course_quota_info q WHERE q.course_code = v.course_code)
  AND NOT EXISTS (SELECT 1 FROM quota_channel ch WHERE ch.course_code = v.course_code AND ch.sort_order = v.sort_order);

-- 6. ช่องทางติดต่อหน่วยงานตามชีท
INSERT INTO quota_contact (course_code, sort_order, organization_name, label, url)
SELECT v.course_code, v.sort_order, v.organization_name, v.label, v.url
FROM (VALUES
    (N'EL105', 1, N'สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์ (LITU)', N'Facebook: สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์', N'https://www.facebook.com/litu.thammasat'),
    (N'EL295', 1, N'สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์ (LITU)', N'Facebook: สถาบันภาษา มหาวิทยาลัยธรรมศาสตร์', N'https://www.facebook.com/litu.thammasat'),
    (N'ST216', 1, N'สาขาวิชาคณิตศาสตร์และสถิติ คณะวิทยาศาสตร์และเทคโนโลยี', N'Facebook: ภาควิชาคณิตศาสตร์และสถิติ มธ.', N'https://www.facebook.com/mathstat.thammasat'),
    (N'AN347', 1, N'คณะสังคมวิทยาและมานุษยวิทยา มหาวิทยาลัยธรรมศาสตร์', N'Facebook: คณะสังคมวิทยาและมานุษยวิทยา มธ.', N'https://www.facebook.com/socantoff'),
    (N'FD216', 1, N'สาขาวิชาวิทยาศาสตร์และเทคโนโลยีการอาหาร', N'Facebook: สาขาวิชาวิทยาศาสตร์และเทคโนโลยีการอาหาร มธ.', N'https://www.facebook.com/Foodsciencetu'),
    (N'IS313', 1, N'คณะพาณิชยศาสตร์และการบัญชี มหาวิทยาลัยธรรมศาสตร์', N'Instagram: @accy_tu', N'https://www.instagram.com/accy_tu?mdxt=ajJ1dWZ0bHMwOXFn'),
    (N'TH291', 1, N'งานบริการการศึกษา คณะศิลปศาสตร์ มหาวิทยาลัยธรรมศาสตร์', N'Facebook: งานบริการการศึกษา คณะศิลปศาสตร์ มธ.', N'https://www.facebook.com/Academic.LartsTU'),
    (N'EG214', 1, N'งานบริการการศึกษา คณะศิลปศาสตร์ มหาวิทยาลัยธรรมศาสตร์', N'Facebook: งานบริการการศึกษา คณะศิลปศาสตร์ มธ.', N'https://www.facebook.com/Academic.LartsTU')
) v(course_code, sort_order, organization_name, label, url)
WHERE EXISTS (SELECT 1 FROM course_quota_info q WHERE q.course_code = v.course_code)
  AND NOT EXISTS (SELECT 1 FROM quota_contact ct WHERE ct.course_code = v.course_code AND ct.sort_order = v.sort_order);

-- 7. ช่วงเวลายื่นคำร้องตามชีท (ใช้ academic_year = 2568 / ค.ศ. 2025 เพื่อไม่กระทบตารางเรียนและกลุ่มเรียนเดิม)
INSERT INTO quota_round (course_code, academic_year, semester, round_no, label, start_date, end_date, start_time, end_time)
SELECT v.course_code, v.academic_year, v.semester, v.round_no, v.label, v.start_date, v.end_date, v.start_time, v.end_time
FROM (VALUES
    -- EL105, EL295 (เปิดทั้ง 2 เทอม)
    (N'EL105', 2568, 1, 1, N'คำร้องรอบที่ 1', '2025-10-05', '2025-10-09', NULL, NULL),
    (N'EL105', 2568, 1, 2, N'คำร้องรอบที่ 2', '2025-12-01', '2025-12-04', NULL, NULL),
    (N'EL105', 2568, 2, 1, N'คำร้องรอบที่ 1', '2025-10-05', '2025-10-09', NULL, NULL),
    (N'EL105', 2568, 2, 2, N'คำร้องรอบที่ 2', '2025-12-01', '2025-12-04', NULL, NULL),
    (N'EL295', 2568, 1, 1, N'คำร้องรอบที่ 1', '2025-10-05', '2025-10-09', NULL, NULL),
    (N'EL295', 2568, 1, 2, N'คำร้องรอบที่ 2', '2025-12-01', '2025-12-04', NULL, NULL),
    (N'EL295', 2568, 2, 1, N'คำร้องรอบที่ 1', '2025-10-05', '2025-10-09', NULL, NULL),
    (N'EL295', 2568, 2, 2, N'คำร้องรอบที่ 2', '2025-12-01', '2025-12-04', NULL, NULL),
    -- ST216 (เปิดทั้ง 2 เทอม)
    (N'ST216', 2568, 1, 1, NULL, '2025-10-06', '2025-10-14', NULL, NULL),
    (N'ST216', 2568, 2, 1, NULL, '2025-10-06', '2025-10-14', NULL, NULL),
    -- AN347 (เปิดเฉพาะเทอม 2, แยกรอบตามรหัสนักศึกษา 09:00-16:00)
    (N'AN347', 2568, 2, 1, N'รหัส 65-66', '2025-10-06', '2025-10-06', '09:00', '16:00'),
    (N'AN347', 2568, 2, 2, N'รหัส 67',    '2025-10-07', '2025-10-07', '09:00', '16:00'),
    (N'AN347', 2568, 2, 3, N'รหัส 68',    '2025-10-08', '2025-10-08', '09:00', '16:00'),
    (N'AN347', 2568, 2, 4, N'รหัส 69',    '2025-10-09', '2025-10-09', '09:00', '16:00'),
    -- FD216 (เปิดทั้ง 2 เทอม)
    (N'FD216', 2568, 1, 1, NULL, '2025-10-16', '2025-10-16', NULL, NULL),
    (N'FD216', 2568, 2, 1, NULL, '2025-10-16', '2025-10-16', NULL, NULL),
    -- IS313 (เปิดทั้ง 2 เทอม, 3 รอบ)
    (N'IS313', 2568, 1, 1, NULL, '2025-09-28', '2025-09-29', NULL, NULL),
    (N'IS313', 2568, 1, 2, NULL, '2025-10-08', '2025-10-09', NULL, NULL),
    (N'IS313', 2568, 1, 3, NULL, '2025-10-15', '2025-10-16', NULL, NULL),
    (N'IS313', 2568, 2, 1, NULL, '2025-09-28', '2025-09-29', NULL, NULL),
    (N'IS313', 2568, 2, 2, NULL, '2025-10-08', '2025-10-09', NULL, NULL),
    (N'IS313', 2568, 2, 3, NULL, '2025-10-15', '2025-10-16', NULL, NULL),
    -- TH291, EG214 (เปิดทั้ง 2 เทอม, 2 รอบ)
    (N'TH291', 2568, 1, 1, NULL, '2025-10-05', '2025-10-08', NULL, NULL),
    (N'TH291', 2568, 1, 2, NULL, '2025-10-22', '2025-10-23', NULL, NULL),
    (N'TH291', 2568, 2, 1, NULL, '2025-10-05', '2025-10-08', NULL, NULL),
    (N'TH291', 2568, 2, 2, NULL, '2025-10-22', '2025-10-23', NULL, NULL),
    (N'EG214', 2568, 1, 1, NULL, '2025-10-05', '2025-10-08', NULL, NULL),
    (N'EG214', 2568, 1, 2, NULL, '2025-10-22', '2025-10-23', NULL, NULL),
    (N'EG214', 2568, 2, 1, NULL, '2025-10-05', '2025-10-08', NULL, NULL),
    (N'EG214', 2568, 2, 2, NULL, '2025-10-22', '2025-10-23', NULL, NULL)
) v(course_code, academic_year, semester, round_no, label, start_date, end_date, start_time, end_time)
WHERE EXISTS (SELECT 1 FROM course_quota_info q WHERE q.course_code = v.course_code)
  AND NOT EXISTS (
      SELECT 1 FROM quota_round qr
      WHERE qr.course_code = v.course_code
        AND qr.academic_year = v.academic_year
        AND qr.semester = v.semester
        AND qr.round_no = v.round_no
  );
