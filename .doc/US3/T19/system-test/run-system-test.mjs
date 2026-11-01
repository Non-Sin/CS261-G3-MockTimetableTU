// System Test ของ US3 ตามเอกสาร US3-T15 (ST-01 ถึง ST-09 และ ST-11)
// ตรวจ 3 ชั้นในแต่ละ case: หน้าเว็บ (Puppeteer), API response (ดักจาก Network) และ DB (sqlcmd ใน container sqlserver)
// ST-10 และส่วน API ของ ST-06 ข้อ 1 อยู่ใน Postman collection (npm run test:api)
//
// ต้องเปิดระบบก่อน: docker compose up -d --build โดยมี SPRING_PROFILES_ACTIVE=stub-tu ใน .env
// รัน: npm run test:ui            (HEADLESS=false เพื่อดูเบราว์เซอร์, ST06_WAIT_SECONDS=10 เวลารอใน ST-06 ข้อ 1)
//      npm run reset-db           (ล้างข้อมูลบัญชีทดสอบอย่างเดียว)

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const DB_CONTAINER = process.env.DB_CONTAINER ?? "sqlserver";
const HEADLESS = process.env.HEADLESS !== "false";
const ST06_WAIT_SECONDS = Number(process.env.ST06_WAIT_SECONDS ?? 10);

const PASSWORD = "Passw0rd!";
const WRONG_PASSWORD = "WrongPass1";
const TEST_USERS = ["6609000001", "6609000002", "6609000003", "6609000004", "6609650001", "6609000099"];

// ข้อความบนหน้าเว็บ ตาม frontend/features/auth
const INVALID_LOGIN_MESSAGE = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง";
const TU_UNAVAILABLE_MESSAGE = "ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง";
const DENIED_MESSAGE = "ระบบนี้เปิดให้ใช้งานเฉพาะนักศึกษาสาขาวิทยาการคอมพิวเตอร์ ภาคปกติ";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = join(OUT_DIR, "screenshots");

// ---------------------------------------------------------------- DB

/** รัน query ใน container โดยส่ง query ผ่าน env จึงไม่ต้อง escape quote ซ้อนหลายชั้น */
function sql(query) {
  const out = execFileSync("docker", [
    "exec", "-e", `Q=SET NOCOUNT ON; ${query}`, DB_CONTAINER, "bash", "-c",
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -b -h -1 -W -s "|" -Q "$Q"',
  ], { encoding: "utf8" });
  return out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split("|"));
}

/** สตริงไทยเป็น NCHAR(..)+NCHAR(..) เลี่ยงปัญหา encoding ระหว่าง Windows, docker และ sqlcmd */
const nstr = (text) => [...text].map((c) => `NCHAR(${c.codePointAt(0)})`).join("+");
const inList = TEST_USERS.map((u) => `N'${u}'`).join(", ");

function resetDb() {
  sql(`DELETE FROM login_attempt WHERE username IN (${inList}); DELETE FROM users WHERE student_id IN (${inList});`);
}

function getAttempt(username) {
  const [row] = sql(`SELECT failed_attempts, CASE WHEN locked_until IS NULL THEN 'NULL' ELSE 'SET' END,
    ISNULL(DATEDIFF(SECOND, updated_at, locked_until), -1) FROM login_attempt WHERE username = N'${username}'`);
  return row ? { failedAttempts: Number(row[0]), locked: row[1] === "SET", lockSeconds: Number(row[2]) } : null;
}

function getUser(studentId) {
  const rows = sql(`SELECT first_name, last_name,
    CASE WHEN first_name_th = ${nstr("สมชาย")} OR first_name_th = ${nstr("สมใจ")} THEN 'OK' ELSE first_name_th END,
    CASE WHEN department = ${nstr("ภาควิชาวิทยาการคอมพิวเตอร์")} THEN 'OK' ELSE 'BAD' END,
    CASE WHEN track = ${nstr("ภาคปกติ")} THEN 'OK' ELSE 'BAD' END,
    DATEDIFF_BIG(MILLISECOND, '2000-01-01T00:00:00+00:00', updated_at)
    FROM users WHERE student_id = N'${studentId}'`);
  if (rows.length === 0) return { count: 0 };
  const [r] = rows;
  return { count: rows.length, firstName: r[0], lastName: r[1], thaiOk: r[2] === "OK", departmentOk: r[3] === "OK", trackOk: r[4] === "OK", updatedAt: Number(r[5]) };
}

// ---------------------------------------------------------------- ผลการตรวจ

const results = [];
let current;

function startCase(id, title) {
  current = { id, title, checks: [], error: null };
  results.push(current);
  console.log(`\n▶ ${id} ${title}`);
}

function check(layer, description, pass, actual) {
  current.checks.push({ layer, description, pass: Boolean(pass), actual });
  console.log(`  ${pass ? "✔" : "✘"} [${layer}] ${description}${pass ? "" : `  (ได้: ${JSON.stringify(actual)})`}`);
}

// ---------------------------------------------------------------- เบราว์เซอร์

let browser;

async function newPage() {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  return page;
}

const isLoginPost = (r) => r.url().endsWith("/api/auth/login") && r.request().method() === "POST";
const isMeGet = (r) => r.url().includes("/api/users/me") && r.request().method() === "GET";

async function readBody(response) {
  try { return await response.json(); } catch { return null; }
}

/** กรอกฟอร์มแล้วกดเข้าสู่ระบบ คืน response ของ POST /api/auth/login (และ GET /api/users/me ถ้า expectMe) */
async function submitLogin(page, username, password, { reload = true, expectMe = false } = {}) {
  if (reload) await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#login-username");
  for (const [selector, value] of [["#login-username", username], ["#login-password", password]]) {
    await page.click(selector, { count: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, value);
  }
  const loginWait = page.waitForResponse(isLoginPost, { timeout: 15000 });
  const meWait = expectMe ? page.waitForResponse(isMeGet, { timeout: 15000 }) : null;
  await page.click("button[type=submit]");
  const login = await loginWait;
  const result = { status: login.status(), body: await readBody(login) };
  if (meWait) {
    const me = await meWait;
    result.me = { status: me.status(), body: await readBody(me) };
  }
  return result;
}

const pageText = (page) => page.evaluate(() => document.body.innerText);

async function waitForText(page, text, timeout = 8000) {
  try {
    await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
    return true;
  } catch {
    return false;
  }
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

const isJwt = (token) => typeof token === "string" && token.split(".").length === 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** หน้าเมนูหลัก (/) แสดงชื่อ-นามสกุลภาษาอังกฤษและรหัสนักศึกษาที่ Navbar */
async function checkMainMenu(page, fullName, studentId) {
  await page.waitForFunction(() => location.pathname === "/", { timeout: 10000 }).catch(() => {});
  check("UI", "เปลี่ยนไปหน้าเมนูหลัก (/)", new URL(page.url()).pathname === "/", page.url());
  const shown = await waitForText(page, fullName);
  check("UI", `Navbar แสดง "${fullName}" และ "${studentId}"`, shown && (await pageText(page)).includes(studentId), shown);
}

async function checkLoginError(page, message) {
  const shown = await waitForText(page, message);
  check("UI", `อยู่หน้า /login และแสดง "${message.slice(0, 40)}…"`, shown && new URL(page.url()).pathname === "/login", page.url());
}

function checkProblem(res, status, code) {
  check("API", `POST /api/auth/login ตอบ ${status} ${code}`, res.status === status && res.body?.code === code, { status: res.status, code: res.body?.code });
}

// ---------------------------------------------------------------- Test cases

let st01UpdatedAt;

const cases = [
  ["ST-01", "Login ครั้งแรก → INSERT users + GET /api/users/me + Navbar", async () => {
    check("DB", "ก่อนเริ่ม ไม่มีแถว 6609000001 ใน users", getUser("6609000001").count === 0, getUser("6609000001"));
    const page = await newPage();
    const res = await submitLogin(page, "6609000001", PASSWORD, { expectMe: true });
    check("API", "POST /api/auth/login ตอบ 200 { token } เป็น JWT", res.status === 200 && isJwt(res.body?.token) && Object.keys(res.body).length === 1, res.body);
    const expectedMe = { studentId: "6609000001", firstName: "Somchai", lastName: "Jaidee", firstNameTh: "สมชาย", lastNameTh: "ใจดี" };
    check("API", "GET /api/users/me ตอบ 200 ข้อมูลตรง", res.me.status === 200 && Object.entries(expectedMe).every(([k, v]) => res.me.body?.[k] === v), res.me);
    await checkMainMenu(page, "Somchai Jaidee", "6609000001");
    await shot(page, "ST-01");
    const user = getUser("6609000001");
    check("DB", "users มี 1 แถว Somchai Jaidee, ชื่อไทย, CS, ภาคปกติ, updated_at ไม่ NULL",
      user.count === 1 && user.firstName === "Somchai" && user.lastName === "Jaidee" && user.thaiOk && user.departmentOk && user.trackOk && user.updatedAt > 0, user);
    check("DB", "login_attempt ไม่มีแถว 6609000001", getAttempt("6609000001") === null, getAttempt("6609000001"));
    st01UpdatedAt = user.updatedAt;
  }],

  ["ST-02", "Login ครั้งถัดไป → UPDATE users แถวเดิม ไม่สร้างซ้ำ", async () => {
    await sleep(2000);
    const page = await newPage();
    const res = await submitLogin(page, "6609000001", PASSWORD, { expectMe: true });
    check("API", "POST /api/auth/login ตอบ 200 ได้ JWT ใหม่", res.status === 200 && isJwt(res.body?.token), res.status);
    check("API", "GET /api/users/me ตอบ 200", res.me.status === 200, res.me.status);
    await checkMainMenu(page, "Somchai Jaidee", "6609000001");
    await shot(page, "ST-02");
    const user = getUser("6609000001");
    check("DB", "users ยังมี 6609000001 เพียง 1 แถว", user.count === 1, user.count);
    check("DB", "updated_at ใหม่กว่าค่าใน ST-01", st01UpdatedAt !== undefined && user.updatedAt > st01UpdatedAt, { before: st01UpdatedAt, after: user.updatedAt });
  }],

  ["ST-03", "รหัสผิดครั้งที่ 1–4 → 401 และนับ failed_attempts", async () => {
    const page = await newPage();
    for (let round = 1; round <= 4; round += 1) {
      const res = await submitLogin(page, "6609000001", WRONG_PASSWORD);
      checkProblem(res, 401, "INVALID_CREDENTIALS");
      await checkLoginError(page, INVALID_LOGIN_MESSAGE);
      if (round === 1) {
        const attempt = getAttempt("6609000001");
        check("DB", "หลังผิดครั้งที่ 1: failed_attempts = 1, locked_until = NULL", attempt?.failedAttempts === 1 && !attempt.locked, attempt);
      }
    }
    await shot(page, "ST-03");
    const attempt = getAttempt("6609000001");
    check("DB", "หลังผิดครั้งที่ 4: failed_attempts = 4, locked_until = NULL", attempt?.failedAttempts === 4 && !attempt.locked, attempt);
  }],

  ["ST-04", "รหัสถูกหลังเคยผิด → ล้าง login_attempt (deleteById)", async () => {
    const before = getAttempt("6609000001");
    check("DB", "ก่อนเริ่ม failed_attempts = 4 (ต่อจาก ST-03)", before?.failedAttempts === 4, before);
    const page = await newPage();
    const res = await submitLogin(page, "6609000001", PASSWORD, { expectMe: true });
    check("API", "POST /api/auth/login ตอบ 200", res.status === 200, res.status);
    await checkMainMenu(page, "Somchai Jaidee", "6609000001");
    await shot(page, "ST-04");
    check("DB", "แถว 6609000001 ใน login_attempt ถูกลบ", getAttempt("6609000001") === null, getAttempt("6609000001"));
  }],

  ["ST-05", "รหัสผิดครบ 5 ครั้ง → 429 ACCOUNT_LOCKED 900 วินาที", async () => {
    check("DB", "ก่อนเริ่ม ไม่มีแถว 6609000004 ใน login_attempt", getAttempt("6609000004") === null, getAttempt("6609000004"));
    const page = await newPage();
    for (let round = 1; round <= 4; round += 1) {
      const res = await submitLogin(page, "6609000004", WRONG_PASSWORD);
      checkProblem(res, 401, "INVALID_CREDENTIALS");
    }
    const res = await submitLogin(page, "6609000004", WRONG_PASSWORD);
    checkProblem(res, 429, "ACCOUNT_LOCKED");
    check("API", "retryAfterSeconds อยู่ระหว่าง 899–900", res.body?.retryAfterSeconds >= 899 && res.body?.retryAfterSeconds <= 900, res.body?.retryAfterSeconds);
    const lockedPage = await waitForText(page, "ระงับการเข้าสู่ระบบชั่วคราว");
    const timer = await page.$eval("[role=timer]", (el) => el.innerText.replace(/\s+/g, " ")).catch(() => "");
    check("UI", "แสดงหน้าระงับชั่วคราว พร้อม Countdown เริ่มที่ 15:00 / 14:5x", lockedPage && /^(15 นาที : 00|14 นาที : 5\d) วินาที$/.test(timer), timer);
    await shot(page, "ST-05");
    const attempt = getAttempt("6609000004");
    check("DB", "failed_attempts = 5 และ locked_until = updated_at + 15 นาที", attempt?.failedAttempts === 5 && attempt.locked && Math.abs(attempt.lockSeconds - 900) <= 1, attempt);
  }],

  ["ST-06", "Login ขณะถูกระงับ → 429 ทันที แล้วปลดเมื่อครบ 15 นาที", async () => {
    console.log(`  … รอ ${ST06_WAIT_SECONDS} วินาที`);
    await sleep(ST06_WAIT_SECONDS * 1000);
    const page = await newPage();
    const locked = await submitLogin(page, "6609000004", PASSWORD);
    checkProblem(locked, 429, "ACCOUNT_LOCKED");
    const retry = locked.body?.retryAfterSeconds;
    check("API", `retryAfterSeconds ลดลงตามเวลา (≤ ${900 - ST06_WAIT_SECONDS})`, retry > 0 && retry <= 900 - ST06_WAIT_SECONDS, retry);
    check("UI", "แสดงหน้าระงับชั่วคราว", await waitForText(page, "ระงับการเข้าสู่ระบบชั่วคราว"), null);
    await shot(page, "ST-06-1-locked");
    const attempt = getAttempt("6609000004");
    // ถ้าเรียก TuApiClient ด้วยรหัสถูก loginSucceeded จะลบแถวนี้ แถวที่ยังอยู่จึงยืนยันว่าไม่ได้เรียก TU
    check("DB", "login_attempt ยังเป็น failed_attempts = 5 (ไม่เรียก TuApiClient)", attempt?.failedAttempts === 5, attempt);
    check("DB", "ยังไม่มีแถว 6609000004 ใน users", getUser("6609000004").count === 0, getUser("6609000004"));

    // จำลองว่าครบ 15 นาทีแล้ว ตามขั้นตอนที่ 2 ใน T15
    sql("UPDATE login_attempt SET locked_until = DATEADD(SECOND, -1, SYSDATETIMEOFFSET()) WHERE username = N'6609000004';");
    const page2 = await newPage();
    const res = await submitLogin(page2, "6609000004", PASSWORD, { expectMe: true });
    check("API", "POST /api/auth/login ตอบ 200 { token }", res.status === 200 && isJwt(res.body?.token), res.status);
    const expectedMe = { studentId: "6609000004", firstName: "Somjai", lastName: "Longdoo", firstNameTh: "สมใจ", lastNameTh: "ลองดู" };
    check("API", "GET /api/users/me ตอบ 200 ข้อมูล Somjai Longdoo", res.me.status === 200 && Object.entries(expectedMe).every(([k, v]) => res.me.body?.[k] === v), res.me);
    await checkMainMenu(page2, "Somjai Longdoo", "6609000004");
    await shot(page2, "ST-06-2-unlocked");
    check("DB", "แถว 6609000004 ใน login_attempt ถูกลบ", getAttempt("6609000004") === null, getAttempt("6609000004"));
    const user = getUser("6609000004");
    check("DB", "users มีแถว 6609000004 Somjai Longdoo", user.count === 1 && user.firstName === "Somjai" && user.lastName === "Longdoo", user);
  }],

  ["ST-07", "บัญชีไม่ Active → 403 ACCOUNT_INACTIVE", async () => {
    const page = await newPage();
    const res = await submitLogin(page, "6609000003", PASSWORD);
    checkProblem(res, 403, "ACCOUNT_INACTIVE");
    // US3-T13 ข้อสรุป 4.1 ข้อ 1: ใช้หน้าจอเดียวกับ INVALID_CREDENTIALS ทุกประการ
    await checkLoginError(page, INVALID_LOGIN_MESSAGE);
    await shot(page, "ST-07");
    check("DB", "ไม่มีแถว 6609000003 ใน users", getUser("6609000003").count === 0, getUser("6609000003"));
    check("DB", "ไม่มีแถว 6609000003 ใน login_attempt", getAttempt("6609000003") === null, getAttempt("6609000003"));
  }],

  ...[["ST-08", "6609000002", "นักศึกษาต่างสาขา"], ["ST-09", "6609650001", "นักศึกษา CS ภาคพิเศษ"]].map(([id, username, label]) => [
    id, `${label} → 403 NOT_CS_STUDENT ไม่บันทึก users และไม่ Rollback การล้าง attempt`, async () => {
      const page = await newPage();
      const wrong = await submitLogin(page, username, WRONG_PASSWORD);
      checkProblem(wrong, 401, "INVALID_CREDENTIALS");
      const before = getAttempt(username);
      check("DB", `เตรียม: login_attempt ของ ${username} มี failed_attempts = 1`, before?.failedAttempts === 1, before);
      check("DB", `เตรียม: ไม่มีแถว ${username} ใน users`, getUser(username).count === 0, getUser(username));
      const res = await submitLogin(page, username, PASSWORD);
      checkProblem(res, 403, "NOT_CS_STUDENT");
      check("UI", "แสดงหน้า Access Denied เฉพาะนักศึกษา CS ภาคปกติ", (await waitForText(page, "Access Denied")) && (await pageText(page)).includes(DENIED_MESSAGE), null);
      await shot(page, id);
      check("DB", `ไม่มีแถว ${username} ใน users`, getUser(username).count === 0, getUser(username));
      check("DB", `แถว ${username} ใน login_attempt ถูกลบ (ไม่ Rollback)`, getAttempt(username) === null, getAttempt(username));
    }]),

  ["ST-11", "TU Login API ใช้งานไม่ได้ → 503 ไม่นับ attempt", async () => {
    const page = await newPage();
    for (let round = 1; round <= 5; round += 1) {
      // ครั้งที่ 2–5 กดส่งซ้ำจากฟอร์มเดิม เพราะ UI เก็บค่าที่กรอกไว้
      const res = round === 1
        ? await submitLogin(page, "6609000099", PASSWORD)
        : await (async () => {
          const wait = page.waitForResponse(isLoginPost, { timeout: 15000 });
          await page.click("button[type=submit]");
          const r = await wait;
          return { status: r.status(), body: await readBody(r) };
        })();
      checkProblem(res, 503, "TU_API_UNAVAILABLE");
      if (round === 1) {
        await checkLoginError(page, TU_UNAVAILABLE_MESSAGE);
        const kept = await page.$eval("#login-username", (el) => el.value);
        check("UI", "ช่อง username ยังเก็บค่าที่กรอกไว้", kept === "6609000099", kept);
        check("DB", "หลังครั้งที่ 1: ไม่มีแถว 6609000099 ใน login_attempt", getAttempt("6609000099") === null, getAttempt("6609000099"));
      }
    }
    await shot(page, "ST-11");
    check("DB", "หลังครั้งที่ 5: ไม่มีแถว 6609000099 ใน login_attempt", getAttempt("6609000099") === null, getAttempt("6609000099"));
    check("DB", "ไม่มีแถว 6609000099 ใน users", getUser("6609000099").count === 0, getUser("6609000099"));
  }],
];

// ---------------------------------------------------------------- รายงาน

function writeReport(startedAt) {
  const lines = [
    "# ผลรัน System Test US3 ด้วย Puppeteer",
    "",
    `- วันที่รัน: ${startedAt.toISOString()}`,
    `- หน้าเว็บ: ${BASE_URL}`,
    "- ST-10 และส่วน API ของ ST-06 ข้อ 1 ดูผลจาก newman (Postman collection)",
    "",
    "| Test Case | เรื่อง | ผล | ตรวจผ่าน |",
    "| --- | --- | --- | --- |",
    ...results.map((r) => {
      const passed = r.checks.filter((c) => c.pass).length;
      const ok = !r.error && passed === r.checks.length;
      return `| ${r.id} | ${r.title} | ${ok ? "Pass" : "Fail"} | ${passed}/${r.checks.length} |`;
    }),
    "",
  ];
  for (const r of results) {
    lines.push(`## ${r.id} ${r.title}`, "", "| ชั้น | สิ่งที่ตรวจ | ผล | ค่าที่ได้ (กรณีไม่ผ่าน) |", "| --- | --- | --- | --- |");
    for (const c of r.checks) {
      lines.push(`| ${c.layer} | ${c.description.replaceAll("|", "\\|")} | ${c.pass ? "✔" : "✘"} | ${c.pass ? "" : `\`${JSON.stringify(c.actual)?.replaceAll("|", "\\|")}\``} |`);
    }
    if (r.error) lines.push("", `**Error:** \`${r.error}\``);
    lines.push("");
  }
  writeFileSync(join(OUT_DIR, "US3-T19-puppeteer-result.md"), lines.join("\n"), "utf8");
}

async function main() {
  resetDb();
  console.log("ล้างข้อมูลบัญชีทดสอบใน users และ login_attempt แล้ว");
  if (process.argv.includes("--reset-only")) return;

  mkdirSync(SHOT_DIR, { recursive: true });
  const startedAt = new Date();
  browser = await puppeteer.launch({ headless: HEADLESS });
  try {
    for (const [id, title, run] of cases) {
      startCase(id, title);
      try {
        await run();
      } catch (error) {
        current.error = error.message.split("\n")[0];
        console.log(`  ✘ error: ${current.error}`);
      }
    }
  } finally {
    await browser.close();
  }
  writeReport(startedAt);

  const failed = results.filter((r) => r.error || r.checks.some((c) => !c.pass));
  console.log(`\nสรุป: ผ่าน ${results.length - failed.length}/${results.length} case${failed.length ? ` ไม่ผ่าน: ${failed.map((r) => r.id).join(", ")}` : ""}`);
  console.log("รายงาน: US3-T19-puppeteer-result.md, ภาพหน้าจอ: screenshots/");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
