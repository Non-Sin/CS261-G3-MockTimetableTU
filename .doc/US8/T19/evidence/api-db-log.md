# US8-T19 API + DB log 2026-11-17 21:53 | develop 79df2b8 | profile stub-tu
start DB timetables: [] []

### ST-US8-16: PASS
- responses: [[400, "MINOR_NOT_ALLOWED", "ชั้นปีที่ 2 เลือกวิชาโทไม่ได้"], [404, null, "Study minor not found with id: 999999"], [400, "MINOR_PLAN_MISMATCH", "วิชาโทเดฟออปส์ ไม่ได้อยู่ในหลักสูตรเดียวกับแผนการเรียนที่เลือก"]]
- db_timetable_2568_1: []

### ST-US8-01: PASS
- status: 200
- department: "ภาควิชาวิทยาการคอมพิวเตอร์"
- all_plans: [["หลักสูตรทดสอบ ST-A", null, ["CS111", "MA211", "ST216", "LAS101"]], ["หลักสูตรทดสอบ ST-B", null, ["CS111", "CS223"]], ["หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยากา", null, ["CS221", "CS213", "EL295", "ST329", "CS261", "CS240"]]]
- minors: []
- db_timetable: []

### ST-US8-02: PASS
- status: 200
- plans: []
- minors: []

### ST-US8-03: PASS
- status: 200
- test_plans: [["SPECIAL_PROJECT", ["CS180", "ST216", "TU109"]], ["CO_OP", ["CS111", "TU106"]]]
- test_minors: [["วิทยาการข้อมูล", "ST-A", "SPECIAL_PROJECT", ["JP171", "LAS101"], 6], ["วิทยาการข้อมูล", "ST-A", "CO_OP", ["JP171", "LAS101"], 6], ["เดฟออปส์", "ST-B", "SPECIAL_PROJECT", ["TU106"], 3], ["เดฟออปส์", "ST-B", "CO_OP", ["TU106"], 3]]

### ST-US8-04: PASS
- responses: [["semester=1", 400, "Required parameter 'studyYear' is not present."], ["studyYear=abc&semester=1", 400, "Failed to convert 'studyYear' with value: 'abc'"], ["studyYear=0&semester=1", 400, "Validation failure"], ["studyYear=5&semester=1", 400, "Validation failure"], ["studyYear=2&semester=3", 400, "Validation failure"]]

### ST-US8-05: PASS
- status: 200
- response: {"dryRun": true, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"], ["LAS101", "780004", "PLAN"]], "skipped": [], "timetable": null}
- db_timetable_2568_1: []
- get_timetable: {"entries": [], "updatedAt": null}

### ST-US8-06: PASS
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"], ["LAS101", "780004", "PLAN"]], "skipped": [], "timetable": {"semester": 1, "entries": ["CS111", "MA211", "ST216", "LAS101"], "totalCredits": 12, "conflicts": [], "updatedAt": "2026-11-17T21:53:32+07:00"}}
- db_timetable_2568_1: ["1|1|2026-11-17 21:53:32.000|CS111|030001", "1|1|2026-11-17 21:53:32.000|MA211|020001", "1|1|2026-11-17 21:53:32.000|ST216|040001", "1|1|2026-11-17 21:53:32.000|LAS101|780004"]

### ST-US8-07: PASS
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [], "skipped": [{"courseCode": "CS111", "source": "PLAN", "reason": "COURSE_ALREADY_IN_TIMETABLE", "existingSectionNo": "030001"}, {"courseCode": "MA211", "source": "PLAN", "reason": "COURSE_ALREADY_IN_TIMETABLE", "existingSectionNo": "020001"}, {"courseCode": "ST216", "source": "PLAN", "reason": "COURSE_ALREADY_IN_TIMETABLE", "existingSectionNo": "040001"}, {"courseCode": "LAS101", "source": "PLAN", "reason": "COURSE_ALREADY_IN_TIMETABLE", "existingSectionNo": "780004"}], "timetable": {"semester": 1, "entries": ["CS111", "MA211", "ST216", "LAS101"], "totalCredits": 12, "conflicts": [], "updatedAt": "2026-11-17T21:53:32+07:00"}}
- db_before: ["1|1|2026-11-17 21:53:32.000|CS111|030001", "1|1|2026-11-17 21:53:32.000|MA211|020001", "1|1|2026-11-17 21:53:32.000|ST216|040001", "1|1|2026-11-17 21:53:32.000|LAS101|780004"]
- db_after: ["1|1|2026-11-17 21:53:32.000|CS111|030001", "1|1|2026-11-17 21:53:32.000|MA211|020001", "1|1|2026-11-17 21:53:32.000|ST216|040001", "1|1|2026-11-17 21:53:32.000|LAS101|780004"]

### ST-US8-15: PASS
- responses: [[400, "Validation failed"], [400, "Validation failed"], [404, "Study plan not found with id: 999999"]]
- db_unchanged: true

### ST-US8-12 (API/DB): PASS
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["CS223", "030001", "PLAN"]], "skipped": [], "timetable": {"semester": 2, "entries": ["CS111", "CS223"], "totalCredits": 6, "conflicts": [], "updatedAt": "2026-11-17T21:53:36+07:00"}}
- db_2568_2: ["2|2|2026-11-17 21:53:36.000|CS111|030001", "2|2|2026-11-17 21:53:36.000|CS223|030001"]
- db_2568_1_unchanged: true

### ST-US8-14: PASS
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["TU106", "540001", "PLAN"]], "skipped": [], "timetable": {"semester": 1, "entries": ["CS111", "TU106"], "totalCredits": 6, "conflicts": [], "updatedAt": "2026-11-17T21:53:37+07:00"}}
- db_6609000004: ["1|3|2026-11-17 21:53:37.000|CS111|030001", "1|3|2026-11-17 21:53:37.000|TU106|540001"]
- db_6609000001_unchanged: true

### ST-US8-08: PASS
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"]], "skipped": [{"courseCode": "LAS101", "source": "PLAN", "reason": "TIME_CONFLICT", "conflictWith": ["TU109"]}], "timetable": {"semester": 1, "entries": ["TU109", "CS111", "MA211", "ST216"], "totalCredits": 12, "conflicts": [], "updatedAt": "2026-11-17T21:53:40+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:53:40.000|TU109|780001", "1|1|2026-11-17 21:53:40.000|CS111|030001", "1|1|2026-11-17 21:53:40.000|MA211|020001", "1|1|2026-11-17 21:53:40.000|ST216|040001"]

### ST-US8-09: PASS
- preview: {"dryRun": true, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"], ["LAS101", "780004", "PLAN"]], "skipped": [], "timetable": null}
- confirm: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"]], "skipped": [{"courseCode": "LAS101", "source": "PLAN", "reason": "TIME_CONFLICT", "conflictWith": ["TU109"]}], "timetable": {"semester": 1, "entries": ["TU109", "CS111", "MA211", "ST216"], "totalCredits": 12, "conflicts": [], "updatedAt": "2026-11-17T21:53:41+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:53:41.000|TU109|780001", "1|1|2026-11-17 21:53:41.000|CS111|030001", "1|1|2026-11-17 21:53:41.000|MA211|020001", "1|1|2026-11-17 21:53:41.000|ST216|040001"]

### ST-US8-10: FAIL
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["LAS101", "780004", "PLAN"]], "skipped": [{"courseCode": "ST216", "source": "PLAN", "reason": "TIME_CONFLICT", "conflictWith": ["TU106"]}], "timetable": {"semester": 1, "entries": ["CS180", "TU101", "TU106", "JP171", "CS111", "MA211", "LAS101"], "totalCredits": 21, "conflicts": [], "updatedAt": "2026-11-17T21:53:42+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:53:42.000|CS180|820001", "1|1|2026-11-17 21:53:42.000|TU101|900001", "1|1|2026-11-17 21:53:42.000|TU106|540001", "1|1|2026-11-17 21:53:42.000|JP171|920001", "1|1|2026-11-17 21:53:42.000|CS111|030001", "1|1|2026-11-17 21:53:42.000|MA211|020001", "1|1|2026-11-17 21:53:42.000|LAS101|780004"]

### ST-US8-11: FAIL
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["CS223", "040001", "PLAN"]], "skipped": [], "timetable": {"semester": 1, "entries": ["CS111", "CS223"], "totalCredits": 6, "conflicts": [], "updatedAt": "2026-11-17T21:53:43+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:53:43.000|CS111|030001", "1|1|2026-11-17 21:53:43.000|CS223|040001"]

### ST-US8-13: PASS
- status: 200
- response: {"dryRun": false, "minorId": 5, "added": [["CS180", "820001", "PLAN"], ["ST216", "040001", "PLAN"], ["TU109", "780001", "PLAN"], ["JP171", "920001", "MINOR"]], "skipped": [{"courseCode": "LAS101", "source": "MINOR", "reason": "TIME_CONFLICT", "conflictWith": ["TU109"]}], "timetable": {"semester": 1, "entries": ["CS180", "ST216", "TU109", "JP171"], "totalCredits": 12, "conflicts": [], "updatedAt": "2026-11-17T21:53:43+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:53:43.000|CS180|820001", "1|1|2026-11-17 21:53:43.000|ST216|040001", "1|1|2026-11-17 21:53:43.000|TU109|780001", "1|1|2026-11-17 21:53:43.000|JP171|920001"]

# summary {"ST-US8-16": "PASS", "ST-US8-01": "PASS", "ST-US8-02": "PASS", "ST-US8-03": "PASS", "ST-US8-04": "PASS", "ST-US8-05": "PASS", "ST-US8-06": "PASS", "ST-US8-07": "PASS", "ST-US8-15": "PASS", "ST-US8-12 (API/DB)": "PASS", "ST-US8-14": "PASS", "ST-US8-08": "PASS", "ST-US8-09": "PASS", "ST-US8-10": "FAIL", "ST-US8-11": "FAIL", "ST-US8-13": "PASS"}
