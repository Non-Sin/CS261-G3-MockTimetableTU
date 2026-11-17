-- US8-T19: test minor courses (schema from US8-T09 requires plan_type); same courses as US8-T15 for both plan types
INSERT INTO study_minor_course (minor_id, course_code, plan_type, study_year, semester, sort_order)
SELECT m.minor_id, v.course_code, pt.plan_type, v.study_year, v.semester, v.sort_order
FROM (VALUES
    (N'วิทยาการข้อมูล', N'หลักสูตรทดสอบ ST-A', N'JP171', 3, 1, 1),
    (N'วิทยาการข้อมูล', N'หลักสูตรทดสอบ ST-A', N'LAS101', 3, 1, 2),
    (N'ปัญญาประดิษฐ์', N'หลักสูตรทดสอบ ST-A', N'CS180', 4, 1, 1),
    (N'เดฟออปส์', N'หลักสูตรทดสอบ ST-B', N'TU106', 3, 1, 1)
) AS v (minor_name, curriculum_name, course_code, study_year, semester, sort_order)
JOIN study_minor m ON m.minor_name = v.minor_name AND m.curriculum_name = v.curriculum_name
CROSS JOIN (VALUES ('SPECIAL_PROJECT'), ('CO_OP')) AS pt (plan_type);

SELECT m.minor_id, m.minor_name, c.course_code, c.plan_type, c.study_year, c.semester
FROM study_minor_course c JOIN study_minor m ON m.minor_id = c.minor_id
WHERE m.curriculum_name LIKE N'หลักสูตรทดสอบ ST-%' ORDER BY m.minor_id, c.plan_type, c.sort_order;
