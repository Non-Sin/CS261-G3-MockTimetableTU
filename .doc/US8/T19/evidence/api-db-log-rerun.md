# US8-T19 re-run (adjusted test data) 2026-11-17 21:54

### ST-US8-10b: PASS
- precondition: "CS180 820001, TU101 900001, RE468 810001, JP171 920001 (12 credits)"
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["MA211", "020001", "PLAN"], ["ST216", "040001", "PLAN"]], "skipped": [{"courseCode": "LAS101", "source": "PLAN", "reason": "CREDIT_LIMIT_EXCEEDED", "currentCredits": 21, "maxCredits": 22}], "timetable": {"semester": 1, "entries": ["CS180", "TU101", "RE468", "JP171", "CS111", "MA211", "ST216"], "totalCredits": 21, "conflicts": [], "updatedAt": "2026-11-17T21:54:33+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:54:33.000|CS180|820001", "1|1|2026-11-17 21:54:33.000|TU101|900001", "1|1|2026-11-17 21:54:33.000|RE468|810001", "1|1|2026-11-17 21:54:33.000|JP171|920001", "1|1|2026-11-17 21:54:33.000|CS111|030001", "1|1|2026-11-17 21:54:33.000|MA211|020001", "1|1|2026-11-17 21:54:33.000|ST216|040001"]
insert CS217 into B-Y2S1: 0  

### ST-US8-11b: PASS
- precondition: "test plan B-Y2S1 = CS111, CS223, CS217 (CS217 has no section in 2568/1)"
- status: 200
- response: {"dryRun": false, "minorId": null, "added": [["CS111", "030001", "PLAN"], ["CS223", "040001", "PLAN"]], "skipped": [{"courseCode": "CS217", "source": "PLAN", "reason": "NO_SECTION_AVAILABLE"}], "timetable": {"semester": 1, "entries": ["CS111", "CS223"], "totalCredits": 6, "conflicts": [], "updatedAt": "2026-11-17T21:54:35+07:00"}}
- db_timetable: ["1|1|2026-11-17 21:54:35.000|CS111|030001", "1|1|2026-11-17 21:54:35.000|CS223|040001"]

# summary {"ST-US8-10b": "PASS", "ST-US8-11b": "PASS"}
