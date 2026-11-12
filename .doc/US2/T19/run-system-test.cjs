// US2-T19 รัน System Test ตาม US2-T15 (ST-US2-01 ถึง ST-US2-11)
//
// ต้องเปิดระบบด้วย `docker compose up -d --build` และ .env ตั้ง SPRING_PROFILES_ACTIVE=stub-tu
// รัน:  NODE_PATH=<โฟลเดอร์ node_modules ที่มี puppeteer> node .doc/US2/T19/run-system-test.cjs
//
// เคส UI ควบคุม Chrome ผ่าน puppeteer ที่ http://localhost:3000 เคส API ยิงตรงที่ http://localhost:8080
// ทุกเคสบันทึกสภาพ DB ก่อน/หลัง และ SQL ที่ backend รัน (show-sql) ลง evidence/ST-US2-xx.json
// สคริปต์ล้างและเตรียมตารางของ student-A (6609000000) และ student-B (6609000001) ใหม่ทุกเคส

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer");

const API = "http://localhost:8080";
const WEB = "http://localhost:3000";
const ROOT = path.resolve(__dirname, "../../..");
const EVIDENCE = path.join(__dirname, "evidence");
const PASSWORD = "Passw0rd!";
const STUDENT_A = "6609000000";
const STUDENT_B = "6609000001";
// section_id ตาม seed V20261014_2010
const SEC = { CS180: 1, MA211: 2, CS111: 3, LAS101: 4, TU109: 7, CS111_2568_2: 11 };

const SA_PASSWORD = fs.readFileSync(path.join(ROOT, ".env"), "utf8").match(/^MSSQL_SA_PASSWORD=(.*)$/m)[1].trim();

fs.mkdirSync(EVIDENCE, { recursive: true });

// ---------- helpers ----------

function sql(query) {
  const out = execFileSync("docker", [
    "exec", "sqlserver", "/opt/mssql-tools18/bin/sqlcmd", "-S", "localhost", "-U", "sa", "-P", SA_PASSWORD,
    "-C", "-d", "appdb", "-W", "-s", "|", "-h", "-1", "-Q", `SET NOCOUNT ON; ${query}`,
  ], { encoding: "utf8" });
  return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split("|"));
}

/** ตารางและรายการของนักศึกษาที่ระบุ ใช้เทียบก่อน/หลัง */
function dbState(studentIds = [STUDENT_A, STUDENT_B]) {
  const ids = studentIds.map((s) => `'${s}'`).join(",");
  return sql(`SELECT t.timetable_id, t.student_id, t.academic_year, t.semester,
      CONVERT(varchar(40), t.updated_at, 127), e.entry_id, s.course_code
    FROM timetable t LEFT JOIN timetable_entry e ON e.timetable_id = t.timetable_id
    LEFT JOIN section s ON s.section_id = e.section_id
    WHERE t.student_id IN (${ids}) ORDER BY t.student_id, t.semester, e.entry_id`)
    .map(([timetableId, studentId, year, sem, updatedAt, entryId, course]) => ({
      timetableId: +timetableId, studentId, term: `${sem}/${year}`, updatedAt,
      entryId: entryId === "NULL" ? null : +entryId, course: course === "NULL" ? null : course,
    }));
}

const entryExists = (entryId) => sql(`SELECT COUNT(*) FROM timetable_entry WHERE entry_id = ${entryId}`)[0][0] === "1";
const updatedAtOf = (state, studentId, term) => state.find((r) => r.studentId === studentId && r.term === term)?.updatedAt;
const coursesOf = (state, studentId, term) =>
  state.filter((r) => r.studentId === studentId && r.term === term && r.course).map((r) => r.course);

async function api(method, urlPath, token, body) {
  const res = await fetch(API + urlPath, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ไม่ใช่ JSON */ }
  return { request: `${method} ${urlPath}`, status: res.status, contentType: res.headers.get("content-type"), body: json ?? text };
}

async function login(username) {
  const res = await api("POST", "/api/auth/login", null, { username, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login ${username} ได้ ${res.status}`);
  return res.body.token;
}

/** ล้างตารางทุกภาคของนักศึกษา แล้วเพิ่ม section ตามลำดับ คืน map รหัสวิชา → entryId */
async function resetTimetable(token, sectionIds) {
  for (const [year, sem] of [[2568, 1], [2568, 2]]) {
    const t = await api("GET", `/api/timetable?academicYear=${year}&semester=${sem}`, token);
    const ids = t.body.entries.map((e) => e.entryId);
    if (ids.length) {
      const del = await api("DELETE", `/api/timetable/entries?entryIds=${ids.join(",")}`, token);
      if (del.status !== 200) throw new Error(`ล้างตาราง ${sem}/${year} ได้ ${del.status}`);
    }
  }
  const map = {};
  for (const sectionId of sectionIds) {
    const res = await api("POST", "/api/timetable/entries", token, { sectionId });
    if (res.status !== 201) throw new Error(`เพิ่ม section ${sectionId} ได้ ${res.status} ${JSON.stringify(res.body)}`);
    const added = res.body.entries.find((e) => e.sectionId === sectionId);
    map[added.courseCode + (res.body.semester === 2 ? "_2568_2" : "")] = added.entryId;
  }
  // updated_at เก็บแค่ระดับวินาที รอให้ข้ามวินาทีเพื่อเห็นว่าการลบเปลี่ยนค่าจริง
  await new Promise((r) => setTimeout(r, 1100));
  return map;
}

/** SQL ที่ backend log ไว้ (spring.jpa.show-sql) หลังเวลาที่ระบุ */
function backendSql(sinceIso) {
  const out = execFileSync("docker", ["logs", "--since", sinceIso, "backend"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const statements = out.replace(/\r/g, "").split(/\nHibernate:\s*\n?/).slice(1).map((s) => s.split(/\n\S/)[0].replace(/\s+/g, " ").trim());
  return {
    deletes: statements.filter((s) => /^delete\b/i.test(s)),
    updates: statements.filter((s) => /^update\b/i.test(s)),
  };
}

// ---------- browser ----------

let browser;

async function openTimetable(token) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const requests = [];
  page.on("request", (r) => { if (r.url().includes("/api/timetable")) requests.push(`${r.method()} ${new URL(r.url()).pathname}${new URL(r.url()).search}`); });
  if (token) {
    await page.evaluateOnNewDocument((key, value) => sessionStorage.setItem(key, value), "mocktimetable.auth.token", token);
  }
  await page.goto(WEB + "/", { waitUntil: "networkidle0" });
  await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((h) => h.textContent.includes("วิชาที่เพิ่มแล้ว")), { timeout: 15000 });
  await waitIdle(page);
  return { page, requests };
}

/** login ผ่านหน้าเว็บจริง (ใช้ใน ST-US2-01 เพื่อยืนยันว่า flow ตั้งแต่ login ใช้ได้) */
async function openTimetableViaLogin(username) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  const requests = [];
  page.on("request", (r) => { if (r.url().includes("/api/timetable")) requests.push(`${r.method()} ${new URL(r.url()).pathname}${new URL(r.url()).search}`); });
  await page.goto(WEB + "/login", { waitUntil: "networkidle0" });
  await page.type("#login-username", username);
  await page.type("#login-password", PASSWORD);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.click('button[type="submit"]')]);
  await page.waitForFunction(() => [...document.querySelectorAll("h2")].some((h) => h.textContent.includes("วิชาที่เพิ่มแล้ว")), { timeout: 15000 });
  await waitIdle(page);
  return { page, requests };
}

/** สถานะของรายการวิชาบนหน้าจอ */
const uiState = (page) => page.evaluate(() => {
  const section = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.includes("วิชาที่เพิ่มแล้ว"));
  const articles = [...section.querySelectorAll("article")];
  const btn = (label) => [...section.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(label));
  const credits = [...document.querySelectorAll("p")].find((p) => /^หน่วยกิต \d+ \/ \d+$/.test(p.textContent.trim()));
  return {
    courses: articles.map((a) => a.querySelector("p.font-bold").textContent.trim()),
    checked: articles.filter((a) => a.querySelector("input[type=checkbox]").checked).map((a) => a.querySelector("p.font-bold").textContent.trim()),
    checkboxesDisabled: articles.map((a) => a.querySelector("input[type=checkbox]").disabled),
    deleteButtonsDisabled: articles.map((a) => [...a.querySelectorAll("button")].find((b) => b.textContent.includes("ลบวิชา")).disabled),
    deleteSelected: { text: btn("ลบที่เลือก")?.textContent.trim(), disabled: btn("ลบที่เลือก")?.disabled },
    deleteAll: { disabled: btn("ลบทั้งหมด")?.disabled },
    emptyText: section.textContent.includes("ยังไม่มีวิชาในตาราง"),
    alerts: [...document.querySelectorAll("[role=alert]")].map((a) => a.textContent.trim()).filter(Boolean),
    credits: credits?.textContent.trim() ?? null,
    summary: [...document.querySelectorAll("p,div,span")].map((e) => e.textContent.trim()).find((t) => /^วิชาในตารางเรียน: \d+ วิชา/.test(t)) ?? null,
    conflictBanner: document.body.textContent.includes("ตรวจพบเวลาเรียนซ้อนทับกัน"),
    gridHeaders: (() => {
      const grid = [...document.querySelectorAll("section")].find((x) => x.querySelector("h2")?.textContent.includes("ตารางเรียนจำลอง"));
      const text = grid?.textContent ?? "";
      return ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "08:00", "20:00"].every((d) => text.includes(d));
    })(),
  };
});

async function clickInArticle(page, course, selector) {
  const handles = await page.$$("article");
  for (const h of handles) {
    const code = await h.$eval("p.font-bold", (p) => p.textContent.trim());
    if (code === course) {
      if (selector === "delete") {
        const buttons = await h.$$("button");
        for (const b of buttons) if ((await b.evaluate((x) => x.textContent)).includes("ลบวิชา")) return b.click();
      }
      return (await h.$("input[type=checkbox]")).click();
    }
  }
  throw new Error(`ไม่พบ ${course} บนหน้าจอ`);
}

async function clickButton(page, label) {
  const buttons = await page.$$("button");
  for (const b of buttons) if ((await b.evaluate((x) => x.textContent.trim())).startsWith(label)) return b.click();
  throw new Error(`ไม่พบปุ่ม ${label}`);
}

/** ชะลอ DELETE ไว้ระยะหนึ่งเพื่อดูสถานะ deleting และเลือกเปลี่ยน URL ได้ (ใช้จำลองคำขอลบรายการของคนอื่น) */
async function holdDeletes(page, { delayMs = 1500, rewrite } = {}) {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.isInterceptResolutionHandled()) return;
    if (req.method() === "DELETE" && req.url().includes("/api/timetable/entries")) {
      const url = rewrite ? rewrite(req.url()) : req.url();
      setTimeout(() => req.continue({ url }), delayMs);
    } else {
      req.continue();
    }
  });
}

const waitDeleteResponse = (page) => { const p = page.waitForResponse((r) => r.request().method() === "DELETE" && r.url().includes("/api/timetable/entries"), { timeout: 15000 }); p.catch(() => {}); return p; };
const shot = (page, name) => page.screenshot({ path: path.join(EVIDENCE, `${name}.png`), fullPage: true });
const waitIdle = (page) => page.waitForNetworkIdle({ idleTime: 500, timeout: 15000 });

// ---------- result recording ----------

const results = [];

function check(list, label, ok, actual) {
  list.push({ label, pass: Boolean(ok), actual });
}

const ONLY = process.argv.slice(2);

async function runCase(id, title, fn) {
  if (ONLY.length && !ONLY.includes(id)) return;
  const checks = [];
  const evidence = { id, title, startedAt: new Date().toISOString() };
  try {
    await fn(checks, evidence);
  } catch (e) {
    checks.push({ label: "รันจนจบโดยไม่มี exception", pass: false, actual: String(e.stack || e) });
    for (const p of await browser.pages()) await p.screenshot({ path: path.join(EVIDENCE, `${id}-error-${Date.now()}.png`) }).catch(() => {});
  }
  evidence.checks = checks;
  const pass = checks.every((c) => c.pass);
  results.push({ id, title, pass, checks });
  fs.writeFileSync(path.join(EVIDENCE, `${id}.json`), JSON.stringify(evidence, null, 2));
  console.log(`${pass ? "PASS" : "FAIL"} ${id} ${title}`);
  for (const c of checks) console.log(`   ${c.pass ? "✔" : "✘"} ${c.label} → ${typeof c.actual === "string" ? c.actual : JSON.stringify(c.actual)}`);
}

const isProblem = (res, status) => res.status === status && /problem\+json/.test(res.contentType || "") && res.body?.status === status;

// ---------- cases ----------

(async () => {
  browser = await puppeteer.launch({ headless: true });
  const tokenA = await login(STUDENT_A);
  const tokenB = await login(STUDENT_B);

  await runCase("ST-US2-01", "ลบรายวิชาเดียวสำเร็จ", async (c, ev) => {
    const ids = await resetTimetable(tokenA, [SEC.CS180, SEC.MA211, SEC.CS111]);
    ev.before = dbState([STUDENT_A]);
    const { page, requests } = await openTimetableViaLogin(STUDENT_A);
    await holdDeletes(page, { delayMs: 800 });
    ev.uiBefore = await uiState(page);
    const since = new Date().toISOString();
    const resP = waitDeleteResponse(page);
    await clickInArticle(page, "CS180", "delete");
    await new Promise((r) => setTimeout(r, 200));
    ev.uiDuring = await uiState(page);
    const res = await resP;
    const body = await res.json();
    await waitIdle(page);
    ev.response = { request: `DELETE ${new URL(res.url()).pathname}`, status: res.status(), body };
    ev.after = dbState([STUDENT_A]);
    ev.uiAfter = await uiState(page);
    ev.backendSql = backendSql(since);
    ev.browserRequests = requests;
    await shot(page, "ST-US2-01-after");
    check(c, "UI ส่ง DELETE /api/timetable/entries/{entryId ของ CS180}", ev.response.request === `DELETE /api/timetable/entries/${ids.CS180}`, ev.response.request);
    check(c, "HTTP 200 + TimetableResponse", res.status() === 200 && Array.isArray(body.entries) && "totalCredits" in body, `${res.status()} keys=${Object.keys(body)}`);
    check(c, "entry ของ CS180 ถูกลบจาก DB", !entryExists(ids.CS180), `entry ${ids.CS180} exists=${entryExists(ids.CS180)}`);
    check(c, "MA211, CS111 ยังอยู่ใน DB", coursesOf(ev.after, STUDENT_A, "1/2568").join(",") === "MA211,CS111", coursesOf(ev.after, STUDENT_A, "1/2568"));
    check(c, "updated_at ใน DB เปลี่ยน และ response มี updatedAt", updatedAtOf(ev.before, STUDENT_A, "1/2568") !== updatedAtOf(ev.after, STUDENT_A, "1/2568") && body.updatedAt,
      `${updatedAtOf(ev.before, STUDENT_A, "1/2568")} → ${updatedAtOf(ev.after, STUDENT_A, "1/2568")} (response ${body.updatedAt})`);
    check(c, "หน้าเว็บแสดง MA211, CS111 และหน่วยกิต 6 / 22", ev.uiAfter.courses.join(",") === "MA211,CS111" && ev.uiAfter.credits === "หน่วยกิต 6 / 22", `${ev.uiAfter.courses} | ${ev.uiAfter.credits}`);
    check(c, "ระหว่างรอ ปุ่มลบถูกปิด (deleting)", ev.uiDuring.deleteButtonsDisabled.every(Boolean), ev.uiDuring.deleteButtonsDisabled);
    check(c, "หลังลบ checkbox ว่าง ปุ่มลบกดได้ (idle) ไม่มี error", ev.uiAfter.checked.length === 0 && ev.uiAfter.deleteButtonsDisabled.every((d) => !d) && ev.uiAfter.alerts.length === 0,
      { checked: ev.uiAfter.checked, deleteDisabled: ev.uiAfter.deleteButtonsDisabled, alerts: ev.uiAfter.alerts });
    await page.close();
  });

  await runCase("ST-US2-02", "ลบหลายรายวิชาสำเร็จ", async (c, ev) => {
    // LAS101 กับ TU109 เวลาชนกัน ลบ TU109 + CS180 แล้วเวลาชนต้องหายไป
    const ids = await resetTimetable(tokenA, [SEC.LAS101, SEC.TU109, SEC.CS180, SEC.MA211]);
    ev.before = dbState([STUDENT_A]);
    const { page } = await openTimetable(tokenA);
    await holdDeletes(page, { delayMs: 1500 });
    ev.uiBefore = await uiState(page);
    await clickInArticle(page, "TU109", "checkbox");
    await clickInArticle(page, "CS180", "checkbox");
    ev.uiSelected = await uiState(page);
    await shot(page, "ST-US2-02-selected");
    const since = new Date().toISOString();
    const resP = waitDeleteResponse(page);
    await clickButton(page, "ลบที่เลือก");
    await new Promise((r) => setTimeout(r, 300));
    ev.uiDuring = await uiState(page);
    const res = await resP;
    const body = await res.json();
    await waitIdle(page);
    const u = new URL(res.url());
    ev.response = { request: `DELETE ${u.pathname}${u.search}`, status: res.status(), body };
    ev.after = dbState([STUDENT_A]);
    ev.uiAfter = await uiState(page);
    ev.backendSql = backendSql(since);
    await shot(page, "ST-US2-02-after");
    const sent = decodeURIComponent(u.searchParams.get("entryIds") || "").split(",").map(Number).sort();
    check(c, "UI ส่ง DELETE ?entryIds= ของ TU109, CS180 ในคำขอเดียว", u.pathname === "/api/timetable/entries" && sent.join() === [ids.TU109, ids.CS180].sort().join(), ev.response.request);
    check(c, "ระหว่างประมวลผล ปุ่มลบ/ลบที่เลือก/checkbox ถูกปิด", ev.uiDuring.deleteSelected.disabled && ev.uiDuring.deleteButtonsDisabled.every(Boolean) && ev.uiDuring.checkboxesDisabled.every(Boolean),
      { deleteSelected: ev.uiDuring.deleteSelected, deleteButtons: ev.uiDuring.deleteButtonsDisabled, checkboxes: ev.uiDuring.checkboxesDisabled });
    check(c, "HTTP 200 + TimetableResponse", res.status() === 200 && Array.isArray(body.entries), res.status());
    check(c, "TU109, CS180 ถูกลบจาก DB", !entryExists(ids.TU109) && !entryExists(ids.CS180), coursesOf(ev.after, STUDENT_A, "1/2568"));
    check(c, "LAS101, MA211 ยังอยู่", coursesOf(ev.after, STUDENT_A, "1/2568").join(",") === "LAS101,MA211", coursesOf(ev.after, STUDENT_A, "1/2568"));
    check(c, "updated_at เปลี่ยน", updatedAtOf(ev.before, STUDENT_A, "1/2568") !== updatedAtOf(ev.after, STUDENT_A, "1/2568"), `${updatedAtOf(ev.before, STUDENT_A, "1/2568")} → ${updatedAtOf(ev.after, STUDENT_A, "1/2568")}`);
    check(c, "เวลาชนคำนวณใหม่: ก่อนลบมีแถบเตือน หลังลบ conflicts=[] และแถบเตือนหาย", ev.uiBefore.conflictBanner && body.conflicts.length === 0 && !ev.uiAfter.conflictBanner,
      { bannerBefore: ev.uiBefore.conflictBanner, conflicts: body.conflicts, bannerAfter: ev.uiAfter.conflictBanner });
    check(c, "หน้าเว็บแสดง LAS101, MA211 และหน่วยกิต 6 / 22", ev.uiAfter.courses.join(",") === "LAS101,MA211" && ev.uiAfter.credits === "หน่วยกิต 6 / 22", `${ev.uiAfter.courses} | ${ev.uiAfter.credits}`);
    check(c, "checkbox ถูกล้าง สถานะกลับเป็น idle", ev.uiAfter.checked.length === 0 && ev.uiAfter.deleteButtonsDisabled.every((d) => !d) && ev.uiAfter.alerts.length === 0, { checked: ev.uiAfter.checked, alerts: ev.uiAfter.alerts });
    await page.close();
  });

  // เคส 400: ยิง API ตรง แล้วตรวจว่า DB และ updated_at ไม่เปลี่ยน และ backend ไม่รัน SQL delete/update
  const badRequestCase = (id, title, urlPath) => runCase(id, title, async (c, ev) => {
    await resetTimetable(tokenA, [SEC.CS180, SEC.MA211]);
    ev.before = dbState([STUDENT_A]);
    const since = new Date().toISOString();
    ev.response = await api("DELETE", urlPath, tokenA);
    await new Promise((r) => setTimeout(r, 500));
    ev.after = dbState([STUDENT_A]);
    ev.backendSql = backendSql(since);
    check(c, "HTTP 400 + ProblemDetail", isProblem(ev.response, 400), `${ev.response.status} ${ev.response.contentType} ${JSON.stringify(ev.response.body)}`);
    check(c, "backend ไม่รัน delete/update ใน DB", ev.backendSql.deletes.length === 0 && ev.backendSql.updates.length === 0, ev.backendSql);
    check(c, "ข้อมูลตารางเรียนใน DB เหมือนเดิมทุกแถว (รวม updated_at)", JSON.stringify(ev.before) === JSON.stringify(ev.after), coursesOf(ev.after, STUDENT_A, "1/2568"));
  });

  await badRequestCase("ST-US2-03", "ส่ง Entry ID ที่ไม่ใช่ตัวเลข", "/api/timetable/entries/abc");
  await badRequestCase("ST-US2-04", "ไม่ส่ง Entry ID", "/api/timetable/entries");
  await badRequestCase("ST-US2-05", "ส่งรายการ Entry ID ว่าง", "/api/timetable/entries?entryIds=");

  await runCase("ST-US2-06", "ลบ Entry ID ที่ไม่มีอยู่จริง", async (c, ev) => {
    const ids = await resetTimetable(tokenA, [SEC.CS180, SEC.MA211, SEC.CS111]);
    const missingId = +sql("SELECT ISNULL(MAX(entry_id), 0) + 99999 FROM timetable_entry")[0][0];
    ev.missingId = missingId;
    ev.before = dbState([STUDENT_A]);
    // ส่วน API
    const since = new Date().toISOString();
    ev.response = await api("DELETE", `/api/timetable/entries/${missingId}`, tokenA);
    await new Promise((r) => setTimeout(r, 500));
    ev.afterApi = dbState([STUDENT_A]);
    ev.backendSql = backendSql(since);
    check(c, `Entry ID ${missingId} ไม่มีใน DB ก่อนทดสอบ`, !entryExists(missingId), missingId);
    check(c, "HTTP 404 + ProblemDetail", isProblem(ev.response, 404), `${ev.response.status} ${JSON.stringify(ev.response.body)}`);
    check(c, "DB ไม่เปลี่ยน ไม่มี delete/update", JSON.stringify(ev.before) === JSON.stringify(ev.afterApi) && ev.backendSql.deletes.length === 0 && ev.backendSql.updates.length === 0, ev.backendSql);
    // ส่วน UI: แท็บ 2 ถือข้อมูลเก่า แท็บ 1 ลบ CS180 ไปก่อน แท็บ 2 กดลบ CS180 ซ้ำจึงได้ 404 จริง
    const tab1 = await openTimetable(tokenA);
    const tab2 = await openTimetable(tokenA);
    await tab1.page.bringToFront();
    const tab1Res = waitDeleteResponse(tab1.page);
    await clickInArticle(tab1.page, "CS180", "delete");
    await tab1Res;
    await waitIdle(tab1.page);
    await tab2.page.bringToFront();
    await clickInArticle(tab2.page, "MA211", "checkbox");
    ev.uiTab2Before = await uiState(tab2.page);
    tab2.requests.length = 0;
    const resP = waitDeleteResponse(tab2.page);
    await clickInArticle(tab2.page, "CS180", "delete");
    const res = await resP;
    await waitIdle(tab2.page);
    ev.uiTab2After = await uiState(tab2.page);
    ev.uiRequests = tab2.requests;
    ev.afterUi = dbState([STUDENT_A]);
    await shot(tab2.page, "ST-US2-06-ui-404");
    check(c, "UI ได้ HTTP 404 จากการลบรายการที่ไม่มีแล้ว", res.status() === 404, `${res.status()} ${new URL(res.url()).pathname}`);
    check(c, "UI แจ้งว่าตารางเรียนมีการเปลี่ยนแปลง", ev.uiTab2After.alerts.some((a) => a.includes("ตารางเรียนมีการเปลี่ยนแปลง")), ev.uiTab2After.alerts);
    check(c, "UI ส่ง GET /api/timetable โหลดข้อมูลล่าสุด", ev.uiRequests.some((r) => r.startsWith("GET /api/timetable?")), ev.uiRequests);
    check(c, "รายการบนจอตรงกับ DB และ checkbox ถูกล้าง", ev.uiTab2After.courses.join(",") === coursesOf(ev.afterUi, STUDENT_A, "1/2568").join(",") && ev.uiTab2After.checked.length === 0,
      { ui: ev.uiTab2After.courses, db: coursesOf(ev.afterUi, STUDENT_A, "1/2568"), checked: ev.uiTab2After.checked });
    await tab1.page.close();
    await tab2.page.close();
    void ids;
  });

  await runCase("ST-US2-07", "ลบ Entry ID ของนักศึกษาคนอื่น", async (c, ev) => {
    await resetTimetable(tokenA, [SEC.CS180, SEC.MA211]);
    const idsB = await resetTimetable(tokenB, [SEC.CS111, SEC.LAS101]);
    const target = idsB.CS111;
    ev.targetEntryOfB = target;
    ev.before = dbState();
    const since = new Date().toISOString();
    ev.response = await api("DELETE", `/api/timetable/entries/${target}`, tokenA);
    await new Promise((r) => setTimeout(r, 500));
    ev.afterApi = dbState();
    ev.backendSql = backendSql(since);
    const raw = JSON.stringify(ev.response.body);
    check(c, "HTTP 404 + ProblemDetail", isProblem(ev.response, 404), `${ev.response.status} ${raw}`);
    check(c, "entry ของ B ยังอยู่ ข้อมูล A และ B ไม่เปลี่ยน (รวม updated_at)", entryExists(target) && JSON.stringify(ev.before) === JSON.stringify(ev.afterApi), { A: coursesOf(ev.afterApi, STUDENT_A, "1/2568"), B: coursesOf(ev.afterApi, STUDENT_B, "1/2568") });
    check(c, "Response ไม่เปิดเผยข้อมูลของ B (รหัสนักศึกษา วิชา section)", !raw.includes(STUDENT_B) && !/CS111|LAS101|sectionId|courseCode/.test(raw), raw);
    // ส่วน UI: เปลี่ยน URL ของคำขอลบที่ UI ส่งให้ชี้ไปที่ entry ของ B แทน
    const { page, requests } = await openTimetable(tokenA);
    await holdDeletes(page, { delayMs: 0, rewrite: (url) => url.replace(/entries\/\d+/, `entries/${target}`) });
    await clickInArticle(page, "MA211", "checkbox");
    requests.length = 0;
    const resP = waitDeleteResponse(page);
    await clickInArticle(page, "CS180", "delete");
    const res = await resP;
    await waitIdle(page);
    ev.uiAfter = await uiState(page);
    ev.uiRequests = requests;
    ev.afterUi = dbState();
    await shot(page, "ST-US2-07-ui-404");
    check(c, "UI ได้ HTTP 404", res.status() === 404, `${res.status()} ${new URL(res.url()).pathname}`);
    check(c, "UI แจ้งว่าตารางเปลี่ยน และโหลดตารางของ A ใหม่", ev.uiAfter.alerts.some((a) => a.includes("ตารางเรียนมีการเปลี่ยนแปลง")) && ev.uiRequests.some((r) => r.startsWith("GET /api/timetable?")),
      { alerts: ev.uiAfter.alerts, requests: ev.uiRequests });
    check(c, "จอแสดงตารางของ A (CS180, MA211) ไม่มีวิชาของ B และ checkbox ถูกล้าง", ev.uiAfter.courses.join(",") === "CS180,MA211" && ev.uiAfter.checked.length === 0, { courses: ev.uiAfter.courses, checked: ev.uiAfter.checked });
    check(c, "หลังทดสอบ UI ข้อมูล A และ B ใน DB ยังเหมือนเดิม", JSON.stringify(ev.before) === JSON.stringify(ev.afterUi), "");
    await page.close();
    await resetTimetable(tokenB, []);
  });

  await runCase("ST-US2-08", "ลบ Entry ID จากคนละตารางเรียน", async (c, ev) => {
    // CS111 030001 ภาค 2568/2 อยู่ใน seed อยู่แล้ว POST แล้วระบบสร้างตาราง 2/2568 ให้เอง
    const ids = await resetTimetable(tokenA, [SEC.CS180, SEC.MA211, SEC.CS111_2568_2]);
    ev.entryIds = { "CS180 (1/2568)": ids.CS180, "CS111 (2/2568)": ids.CS111_2568_2 };
    ev.before = dbState([STUDENT_A]);
    const since = new Date().toISOString();
    ev.response = await api("DELETE", `/api/timetable/entries?entryIds=${ids.CS180},${ids.CS111_2568_2}`, tokenA);
    await new Promise((r) => setTimeout(r, 500));
    ev.after = dbState([STUDENT_A]);
    ev.backendSql = backendSql(since);
    ev.getTerm1 = await api("GET", "/api/timetable?academicYear=2568&semester=1", tokenA);
    ev.getTerm2 = await api("GET", "/api/timetable?academicYear=2568&semester=2", tokenA);
    check(c, "ก่อนทดสอบ 2 รายการอยู่คนละ timetable_id", new Set(ev.before.filter((r) => [ids.CS180, ids.CS111_2568_2].includes(r.entryId)).map((r) => r.timetableId)).size === 2, ev.before);
    check(c, "HTTP 400 + ProblemDetail", isProblem(ev.response, 400), `${ev.response.status} ${JSON.stringify(ev.response.body)}`);
    check(c, "ไม่มีรายการถูกลบจากทั้งสองตาราง updated_at ไม่เปลี่ยน", JSON.stringify(ev.before) === JSON.stringify(ev.after) && ev.backendSql.deletes.length === 0 && ev.backendSql.updates.length === 0,
      { "1/2568": coursesOf(ev.after, STUDENT_A, "1/2568"), "2/2568": coursesOf(ev.after, STUDENT_A, "2/2568"), sql: ev.backendSql });
    check(c, "หน่วยกิตทั้งสองตารางเท่าเดิม (6 และ 3)", ev.getTerm1.body.totalCredits === 6 && ev.getTerm2.body.totalCredits === 3, `${ev.getTerm1.body.totalCredits}, ${ev.getTerm2.body.totalCredits}`);
  });

  await runCase("ST-US2-09", "ส่ง Entry ID ซ้ำกัน", async (c, ev) => {
    const ids = await resetTimetable(tokenA, [SEC.CS180, SEC.MA211, SEC.CS111]);
    ev.before = dbState([STUDENT_A]);
    const since = new Date().toISOString();
    ev.response = await api("DELETE", `/api/timetable/entries?entryIds=${ids.CS180},${ids.CS180}`, tokenA);
    ev.after = dbState([STUDENT_A]);
    ev.backendSql = backendSql(since);
    const { page } = await openTimetable(tokenA);
    ev.uiAfter = await uiState(page);
    await shot(page, "ST-US2-09-after");
    check(c, "HTTP 200 + TimetableResponse", ev.response.status === 200 && Array.isArray(ev.response.body.entries), `${ev.response.status} ${ev.response.request}`);
    check(c, "CS180 ถูกลบ MA211, CS111 ยังอยู่", !entryExists(ids.CS180) && coursesOf(ev.after, STUDENT_A, "1/2568").join(",") === "MA211,CS111", coursesOf(ev.after, STUDENT_A, "1/2568"));
    check(c, "response ตรงกับรายวิชาที่เหลือ และ updatedAt เปลี่ยน", ev.response.body.entries.map((e) => e.courseCode).join(",") === "MA211,CS111" && ev.response.body.totalCredits === 6 && updatedAtOf(ev.before, STUDENT_A, "1/2568") !== updatedAtOf(ev.after, STUDENT_A, "1/2568"),
      { entries: ev.response.body.entries.map((e) => e.courseCode), totalCredits: ev.response.body.totalCredits, updatedAt: ev.response.body.updatedAt });
    check(c, "หน้าเว็บแสดงตารางใหม่ ไม่มี checkbox ค้าง", ev.uiAfter.courses.join(",") === "MA211,CS111" && ev.uiAfter.checked.length === 0, ev.uiAfter.courses);
    await page.close();
  });

  await runCase("ST-US2-10", "ลบรายวิชาสุดท้ายจนตารางว่าง", async (c, ev) => {
    await resetTimetable(tokenA, [SEC.CS180]);
    ev.before = dbState([STUDENT_A]);
    const { page } = await openTimetable(tokenA);
    await holdDeletes(page, { delayMs: 1500 });
    const resP = waitDeleteResponse(page);
    await clickInArticle(page, "CS180", "delete");
    await new Promise((r) => setTimeout(r, 300));
    ev.uiDuring = await uiState(page);
    const res = await resP;
    const body = await res.json();
    await waitIdle(page);
    ev.response = { status: res.status(), body };
    ev.after = dbState([STUDENT_A]);
    ev.uiAfter = await uiState(page);
    await shot(page, "ST-US2-10-empty");
    check(c, "ระหว่างรอ ปุ่มลบถูกปิด", ev.uiDuring.deleteButtonsDisabled.every(Boolean) && ev.uiDuring.deleteAll.disabled, ev.uiDuring);
    check(c, "HTTP 200 entries=[] totalCredits=0 conflicts=[]", res.status() === 200 && body.entries.length === 0 && body.totalCredits === 0 && body.conflicts.length === 0, body);
    check(c, "updatedAt ใน response ไม่เป็น null และ updated_at ใน DB เปลี่ยน", body.updatedAt !== null && updatedAtOf(ev.before, STUDENT_A, "1/2568") !== updatedAtOf(ev.after, STUDENT_A, "1/2568"),
      `${updatedAtOf(ev.before, STUDENT_A, "1/2568")} → ${updatedAtOf(ev.after, STUDENT_A, "1/2568")} (response ${body.updatedAt})`);
    const term1 = ev.after.filter((r) => r.term === "1/2568");
    check(c, "แถว timetable 1/2568 ยังอยู่ใน DB แต่ไม่มี entry", term1.length === 1 && term1[0].entryId === null, term1);
    check(c, "UI แสดงตารางว่าง ยังมีหัววัน หน่วยกิต 0 / 22", ev.uiAfter.emptyText && ev.uiAfter.gridHeaders && ev.uiAfter.credits === "หน่วยกิต 0 / 22", { empty: ev.uiAfter.emptyText, headers: ev.uiAfter.gridHeaders, credits: ev.uiAfter.credits });
    check(c, "ปุ่ม ลบที่เลือก / ลบทั้งหมด ถูกปิด", ev.uiAfter.deleteSelected.disabled && ev.uiAfter.deleteAll.disabled, { deleteSelected: ev.uiAfter.deleteSelected, deleteAll: ev.uiAfter.deleteAll });
    check(c, "ไม่มี error (สถานะกลับเป็น idle)", ev.uiAfter.alerts.length === 0, ev.uiAfter.alerts);
    await page.close();
  });

  await runCase("ST-US2-11", "ลบทีละวิชาต่อเนื่อง 2 รายการ", async (c, ev) => {
    const ids = await resetTimetable(tokenA, [SEC.CS180, SEC.MA211, SEC.CS111]);
    ev.entryIds = ids;
    ev.before = dbState([STUDENT_A]);
    const { page } = await openTimetable(tokenA);
    const deletes = [];
    page.on("request", (r) => { if (r.method() === "DELETE") deletes.push(new URL(r.url()).pathname + new URL(r.url()).search); });
    ev.uiBefore = await uiState(page);
    let resP = waitDeleteResponse(page);
    await clickInArticle(page, "CS180", "delete");
    const r1 = await resP; const b1 = await r1.json();
    await waitIdle(page);
    ev.uiAfter1 = await uiState(page);
    await shot(page, "ST-US2-11-after-CS180");
    resP = waitDeleteResponse(page);
    await clickInArticle(page, "MA211", "delete");
    const r2 = await resP; const b2 = await r2.json();
    await waitIdle(page);
    ev.uiAfter2 = await uiState(page);
    await shot(page, "ST-US2-11-after-MA211");
    ev.deleteRequests = deletes;
    ev.after = dbState([STUDENT_A]);
    check(c, "ส่ง DELETE แยก 2 ครั้ง /entries/{id} ได้ 200 ทั้งคู่", deletes.join() === [`/api/timetable/entries/${ids.CS180}`, `/api/timetable/entries/${ids.MA211}`].join() && r1.status() === 200 && r2.status() === 200, { deletes, status: [r1.status(), r2.status()] });
    check(c, "หลังลบ CS180: response และจอเหลือ MA211, CS111 หน่วยกิต 6", b1.entries.map((e) => e.courseCode).join() === "MA211,CS111" && ev.uiAfter1.courses.join() === "MA211,CS111" && ev.uiAfter1.credits === `หน่วยกิต ${b1.totalCredits} / 22` && b1.totalCredits === 6,
      { response: b1.entries.map((e) => e.courseCode), ui: ev.uiAfter1.courses, credits: ev.uiAfter1.credits });
    check(c, "หลังลบ MA211: response และจอเหลือ CS111 หน่วยกิต 3", b2.entries.map((e) => e.courseCode).join() === "CS111" && ev.uiAfter2.courses.join() === "CS111" && ev.uiAfter2.credits === `หน่วยกิต ${b2.totalCredits} / 22` && b2.totalCredits === 3,
      { response: b2.entries.map((e) => e.courseCode), ui: ev.uiAfter2.courses, credits: ev.uiAfter2.credits });
    check(c, "DB เหลือ CS111 เท่านั้น", coursesOf(ev.after, STUDENT_A, "1/2568").join() === "CS111", coursesOf(ev.after, STUDENT_A, "1/2568"));
    check(c, "ไม่มี error และกลับเป็น idle หลังแต่ละคำขอ", ev.uiAfter1.alerts.length === 0 && ev.uiAfter2.alerts.length === 0 && ev.uiAfter2.deleteButtonsDisabled.every((d) => !d), { alerts1: ev.uiAfter1.alerts, alerts2: ev.uiAfter2.alerts });
    await page.close();
  });

  await browser.close();
  if (!ONLY.length) fs.writeFileSync(path.join(EVIDENCE, "summary.json"), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nสรุป: ผ่าน ${results.length - failed} / ${results.length}`);
  process.exitCode = failed ? 1 : 0;
})().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exitCode = 2;
});
