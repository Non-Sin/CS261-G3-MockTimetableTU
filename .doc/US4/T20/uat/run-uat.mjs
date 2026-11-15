// US4-T20: รัน User Acceptance Test ตาม US4-T16 ด้วย puppeteer และเก็บภาพหน้าจอทุกขั้น
// ดูวิธีใช้ใน README.md ในโฟลเดอร์เดียวกัน
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const USERNAME = process.env.UAT_USERNAME ?? "6609000000";
const PASSWORD = process.env.UAT_PASSWORD ?? "Passw0rd!";
const BROWSER = process.env.BROWSER === "firefox" ? "firefox" : "chrome";
const HEADLESS = process.env.HEADLESS !== "false";
const CASES = (process.env.CASES ?? "1,2,3").split(",").map((c) => c.trim());
// ค่าจริงของระบบคือ 15 นาที (useInactivityTimer.ts) เปลี่ยนได้เมื่อ build frontend ด้วย NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS
const INACTIVITY_TIMEOUT_MS = Number(process.env.INACTIVITY_TIMEOUT_MS ?? 15 * 60 * 1000);
const EVIDENCE_DIR = path.resolve(HERE, process.env.EVIDENCE_DIR ?? "../evidence");
const PREFIX = BROWSER === "firefox" ? "firefox-" : "";

// ข้อมูลตารางสำหรับ TC2 (seed ภาคเรียน 1/2568)
const TERM = { academicYear: 2568, semester: 1 };
const SEED_COURSE = { courseCode: "CS180", sectionNo: "820001" };

const NAVBAR_BUTTON = 'button[aria-haspopup="dialog"]';
const ACCOUNT_MENU = '[role="dialog"][aria-label="เมนูบัญชีผู้ใช้"]';
const LOGIN_TITLE = "#login-title";
const EXPIRED_BANNER = '[data-testid="session-expired-banner"]';

const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathnameOf = (page) => new URL(page.url()).pathname;
const now = () => new Date().toISOString();

const shot = async (page, name) => {
  const file = `${PREFIX}${name}.png`;
  await page.screenshot({ path: path.join(EVIDENCE_DIR, file), fullPage: true });
  return file;
};

const bodyText = (page) => page.evaluate(() => document.body?.innerText ?? "");

const readToken = (page) =>
  page.evaluate(
    () =>
      sessionStorage.getItem("mocktimetable.auth.token") ??
      localStorage.getItem("mocktimetable.auth.token"),
  );

// เรียก API จากในหน้าเว็บ (ผ่าน rewrite /api/* ของ Next.js) และคืน status กับ body
const callApi = (page, url, { token, method = "GET", body } = {}) =>
  page.evaluate(
    async ({ url, token, method, body }) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      let json = null;
      try {
        json = await res.json();
      } catch {
        // body ว่าง
      }
      return { status: res.status, json };
    },
    { url, token, method, body },
  );

const login = async (page) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#login-username");
  await page.type("#login-username", USERNAME);
  await page.type("#login-password", PASSWORD);
  await page.click('form button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20_000 });
  // รอให้โหลด profile เสร็จ (Navbar แสดงรหัสนักศึกษา)
  await page.waitForFunction(
    (sel, id) => document.querySelector(sel)?.innerText.includes(id),
    { timeout: 20_000 },
    NAVBAR_BUTTON,
    USERNAME,
  );
};

const openAccountMenu = async (page) => {
  await page.click(NAVBAR_BUTTON);
  await page.waitForFunction(
    (sel) => getComputedStyle(document.querySelector(sel)).opacity === "1",
    { timeout: 5_000 },
    ACCOUNT_MENU,
  );
};

const clickLogout = async (page) => {
  const started = Date.now();
  await page.click(`${ACCOUNT_MENU} button`);
  await page.waitForFunction(() => location.pathname === "/login", { timeout: 10_000 });
  await page.waitForSelector(LOGIN_TITLE, { visible: true });
  return Date.now() - started;
};

// ---------- ตัวช่วยบันทึกผล ----------
const newCase = (id, title) => {
  const tc = { id, title, browser: BROWSER, startedAt: now(), steps: [], notes: [] };
  results.push(tc);
  return tc;
};

const step = (tc, no, expected, actual, pass, evidence = []) => {
  tc.steps.push({ no, expected, actual, result: pass ? "Pass" : "Fail", evidence });
  console.log(`  [${pass ? "PASS" : "FAIL"}] ขั้น ${no}: ${actual}`);
};

const finish = (tc) => {
  tc.result = tc.steps.length && tc.steps.every((s) => s.result === "Pass") ? "Pass" : "Fail";
  tc.finishedAt = now();
  console.log(`=> ${tc.id}: ${tc.result}\n`);
};

const runCase = async (browser, id, title, fn) => {
  console.log(`\n=== ${id} ${title} ===`);
  const tc = newCase(id, title);
  // แต่ละเคสใช้ browser context ใหม่ จะได้ไม่มี session ค้างจากเคสก่อน
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.on("pageerror", (err) => tc.notes.push(`page error: ${err.message}`));
  try {
    await fn(page, tc);
  } catch (err) {
    const file = await shot(page, `${id.toLowerCase()}-error`).catch(() => null);
    step(tc, "-", "ทำขั้นตอนได้ครบ", `สคริปต์หยุดเพราะ error: ${err.message}`, false, file ? [file] : []);
  } finally {
    finish(tc);
    await context.close();
  }
};

// ---------- TC1: กด Logout แล้วกลับหน้า Login ทันที ----------
const tc1 = async (page, tc) => {
  await login(page);
  step(tc, 1, "เข้าสู่ระบบสำเร็จ เห็นหน้าหลัก", `อยู่ที่ ${pathnameOf(page)} Navbar แสดง ${USERNAME}`, true, [
    await shot(page, "uat01-1-logged-in"),
  ]);

  await openAccountMenu(page);
  const menuShot = await shot(page, "uat01-2-account-menu");
  const elapsed = await clickLogout(page);
  const token = await readToken(page);
  const loginShot = await shot(page, "uat01-3-after-logout");
  const ok = pathnameOf(page) === "/login" && !token;
  step(
    tc,
    2,
    "กด Logout แล้วระบบออกจากระบบสำเร็จ (token ถูกล้าง)",
    `กด "ออกจากระบบ" แล้ว token ใน session ${token ? "ยังอยู่" : "ถูกล้าง"}`,
    !token,
    [menuShot],
  );
  step(
    tc,
    3,
    "นำทางกลับไปหน้า Login ทันที",
    `อยู่ที่ ${pathnameOf(page)} เห็นหัวข้อ Login ใช้เวลา ${elapsed} ms หลังกด`,
    ok && elapsed <= 3_000,
    [loginShot],
  );
};

// ---------- TC2: Logout แล้วกด Back ต้องไม่เห็นข้อมูลเดิม ----------
const ensureSeedEntry = async (page) => {
  const token = await readToken(page);
  const q = new URLSearchParams({ ...TERM, q: SEED_COURSE.courseCode });
  const courses = await callApi(page, `/api/courses?${q}`, { token });
  const course = courses.json?.find?.((c) => c.courseCode === SEED_COURSE.courseCode);
  const section = course?.sections.find((s) => s.sectionNo === SEED_COURSE.sectionNo);
  if (!section) throw new Error(`ไม่พบ ${SEED_COURSE.courseCode} ${SEED_COURSE.sectionNo} ใน seed (status ${courses.status})`);
  const added = await callApi(page, "/api/timetable/entries", {
    token,
    method: "POST",
    body: { sectionId: section.sectionId },
  });
  // 409 = มีวิชานี้ในตารางอยู่แล้ว ใช้ต่อได้
  if (![201, 409].includes(added.status)) throw new Error(`เพิ่มวิชาไม่สำเร็จ status ${added.status}`);
  return added.status;
};

const tc2 = async (page, tc) => {
  await login(page);
  const seedStatus = await ensureSeedEntry(page);
  tc.notes.push(
    `เตรียมข้อมูล: เพิ่ม ${SEED_COURSE.courseCode} ${SEED_COURSE.sectionNo} ผ่าน POST /api/timetable/entries (status ${seedStatus}${seedStatus === 409 ? " มีอยู่แล้ว" : ""})`,
  );
  // login/logout ใช้ router.replace จึงไม่มีหน้าตารางค้างใน history ถ้าเข้าหน้าตารางครั้งเดียว
  // เปิดหน้าตารางอีกครั้งทางลิงก์ /dashboard (redirect ไป "/") ให้มีหน้าตารางใน history ให้ Back กลับไปได้จริง
  // (goto "/" ซ้ำ URL เดิม browser จะนับเป็น replace ไม่เพิ่ม history)
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    (code) => document.body.innerText.includes(code),
    { timeout: 20_000 },
    SEED_COURSE.courseCode,
  );
  const oldToken = await readToken(page);
  step(
    tc,
    1,
    "เข้าสู่ระบบและเห็นตารางเรียนกับข้อมูลส่วนตัว",
    `เห็น ${SEED_COURSE.courseCode} ในตาราง และรหัส ${USERNAME} บน Navbar`,
    true,
    [await shot(page, "uat02-1-timetable-before-logout")],
  );

  await openAccountMenu(page);
  await clickLogout(page);
  step(tc, 2, "Logout แล้วอยู่หน้า Login", `อยู่ที่ ${pathnameOf(page)}`, pathnameOf(page) === "/login", [
    await shot(page, "uat02-2-after-logout"),
  ]);

  // ขั้น 3–4: กดปุ่มย้อนกลับของ browser
  await page.goBack({ waitUntil: "networkidle0" }).catch(() => null);
  await sleep(1_500); // เผื่อเวลาให้ AuthGuard ทำงานและ redirect
  const afterBack = await bodyText(page);
  const leaked = [SEED_COURSE.courseCode, USERNAME].filter((t) => afterBack.includes(t));
  const backPath = pathnameOf(page);
  step(
    tc,
    3,
    "กด Back (กลับไปหน้าตารางเดิมใน history) แล้วระบบพากลับหน้า Login",
    `กด Back แล้วอยู่ที่ ${page.url().startsWith(BASE_URL) ? backPath : page.url()}`,
    backPath === "/login",
    [await shot(page, "uat02-3-after-back")],
  );
  step(
    tc,
    4,
    "ไม่แสดงตารางเรียนหรือข้อมูลส่วนตัวเดิม",
    leaked.length ? `ยังเห็นข้อมูลเดิม: ${leaked.join(", ")}` : `ไม่พบ ${SEED_COURSE.courseCode} หรือ ${USERNAME} บนหน้าจอ`,
    leaked.length === 0,
  );

  // เข้า URL หน้าหลักตรง ๆ ด้วยสถานะเดิมของ browser
  const directChecks = [];
  for (const target of ["/", "/dashboard"]) {
    await page.goto(`${BASE_URL}${target}`, { waitUntil: "networkidle0" });
    await sleep(1_500);
    const text = await bodyText(page);
    const leakedDirect = [SEED_COURSE.courseCode, USERNAME].filter((t) => text.includes(t));
    directChecks.push({ target, path: pathnameOf(page), leakedDirect });
  }
  const directShot = await shot(page, "uat02-4-direct-url");
  const directOk = directChecks.every((c) => c.path === "/login" && c.leakedDirect.length === 0);
  step(
    tc,
    5,
    "เข้าข้อมูลเดิมด้วยสถานะการเข้าสู่ระบบเดิมไม่ได้ (พิมพ์ URL หน้าหลักตรง ๆ)",
    directChecks.map((c) => `${c.target} → ${c.path}${c.leakedDirect.length ? ` (เห็น ${c.leakedDirect.join(", ")})` : ""}`).join(", "),
    directOk,
    [directShot],
  );

  // ข้อมูลเสริม ไม่นับเป็นผลของเคส: token เดิมที่ถูกคัดลอกไว้ก่อน Logout ยังใช้กับ API ได้หรือไม่
  const noToken = await callApi(page, `/api/timetable?${new URLSearchParams(TERM)}`);
  const withOldToken = await callApi(page, `/api/timetable?${new URLSearchParams(TERM)}`, { token: oldToken });
  tc.notes.push(
    `ข้อมูลเสริม: GET /api/timetable ไม่มี token ได้ ${noToken.status}, ใช้ token เดิมที่คัดลอกไว้ก่อน Logout ได้ ${withOldToken.status}` +
      (withOldToken.status === 200 ? " (backend ยังไม่เพิกถอน token ตอน logout ใช้ได้จนหมดอายุ 3 ชม.)" : ""),
  );
};

// ---------- TC3: ไม่ใช้งานเกินเวลาที่กำหนดแล้ว Logout อัตโนมัติ ----------
const tc3 = async (page, tc) => {
  await login(page);
  // เหมือน TC2: เปิดหน้าตารางทาง /dashboard ให้มีหน้าตารางใน history สำหรับขั้นกด Back
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle0" });
  await page.waitForFunction(
    (sel, id) => document.querySelector(sel)?.innerText.includes(id),
    { timeout: 20_000 },
    NAVBAR_BUTTON,
    USERNAME,
  );
  const started = Date.now();
  tc.notes.push(`Inactivity Timeout ที่ใช้ทดสอบ: ${INACTIVITY_TIMEOUT_MS / 1000} วินาที`);
  step(tc, 1, "เข้าสู่ระบบสำเร็จ", `เข้าสู่ระบบเวลา ${new Date(started).toLocaleTimeString("th-TH")}`, true, [
    await shot(page, "uat03-1-logged-in"),
  ]);

  // ขั้น 2–3: ไม่ส่ง input ใด ๆ ให้หน้าเว็บ (ไม่ขยับเมาส์ ไม่กดคีย์ ไม่เลื่อน)
  const margin = Math.min(30_000, INACTIVITY_TIMEOUT_MS / 4);
  const checkpoint = INACTIVITY_TIMEOUT_MS - margin;
  console.log(`  รอ ${Math.round(checkpoint / 1000)} วินาที โดยไม่ใช้งาน...`);
  await sleep(checkpoint);
  const stillIn = pathnameOf(page) === "/" && Boolean(await readToken(page));
  step(
    tc,
    2,
    "ก่อนครบเวลาที่กำหนด ผู้ใช้ยังอยู่ในระบบ",
    `ผ่านไป ${Math.round((Date.now() - started) / 1000)} วินาที อยู่ที่ ${pathnameOf(page)} ${stillIn ? "ยังเข้าสู่ระบบอยู่" : "ถูก Logout แล้ว"}`,
    stillIn,
    [await shot(page, "uat03-2-before-timeout")],
  );

  await page.waitForFunction(() => location.pathname === "/login", { timeout: margin + 90_000 });
  await page.waitForSelector(LOGIN_TITLE, { visible: true });
  const elapsed = Date.now() - started;
  const banner = await page.$(EXPIRED_BANNER);
  const token = await readToken(page);
  // timer ของระบบเริ่มตอนหน้า mount ซึ่งเร็วกว่าจุดที่สคริปต์เริ่มจับเวลาเล็กน้อย จึงเผื่อ 2 วินาที
  const ok = elapsed >= INACTIVITY_TIMEOUT_MS - 2_000 && !token;
  step(
    tc,
    3,
    "เกินเวลาที่กำหนด ระบบ Logout อัตโนมัติและกลับหน้า Login",
    `ถูก Logout หลังไม่ใช้งาน ${Math.round(elapsed / 1000)} วินาที token ${token ? "ยังอยู่" : "ถูกล้าง"}` +
      (banner ? " มีข้อความแจ้งเซสชันหมดอายุ" : " ไม่มีข้อความแจ้งเซสชันหมดอายุ"),
    ok,
    [await shot(page, "uat03-3-auto-logout")],
  );

  await page.goBack({ waitUntil: "networkidle0" }).catch(() => null);
  await sleep(1_500);
  const text = await bodyText(page);
  const backOk = pathnameOf(page) === "/login" && !text.includes(USERNAME);
  step(
    tc,
    4,
    "หลัง Logout อัตโนมัติ กด Back แล้วไม่กลับเข้าระบบ",
    `กด Back แล้วอยู่ที่ ${page.url().startsWith(BASE_URL) ? pathnameOf(page) : page.url()}${text.includes(USERNAME) ? ` ยังเห็น ${USERNAME}` : ""}`,
    backOk,
    [await shot(page, "uat03-4-after-back")],
  );
};

// ---------- main ----------
const CASE_DEFS = {
  1: ["UAT-US4-01", "กด Logout แล้วออกจากระบบและกลับหน้า Login ทันที", tc1],
  2: ["UAT-US4-02", "หลัง Logout กด Back ต้องไม่แสดงข้อมูลเดิม", tc2],
  3: ["UAT-US4-03", "ไม่มีการใช้งานเกินเวลาที่กำหนด ระบบ Logout อัตโนมัติ", tc3],
};

const main = async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const browser = await puppeteer.launch({ browser: BROWSER, headless: HEADLESS });
  const version = await browser.version();
  console.log(`Browser: ${version} | ${BASE_URL} | บัญชี ${USERNAME} | เคส ${CASES.join(",")}`);

  try {
    for (const key of CASES) {
      const def = CASE_DEFS[key];
      if (!def) throw new Error(`ไม่รู้จักเคส ${key} (ใช้ 1, 2, 3)`);
      await runCase(browser, ...def);
    }
  } finally {
    await browser.close();
  }

  const report = { runAt: now(), baseUrl: BASE_URL, browser: version, username: USERNAME, results };
  const reportFile = path.join(EVIDENCE_DIR, `${PREFIX}uat-results.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf8");

  console.log("| Test Case | ผล | หมายเหตุ |\n| --- | --- | --- |");
  for (const r of results) console.log(`| ${r.id} | ${r.result} | ${r.notes.join(" / ") || "-"} |`);
  console.log(`\nบันทึกผลที่ ${reportFile}`);
  process.exitCode = results.every((r) => r.result === "Pass") ? 0 : 1;
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
