// System Test ของ US4 ตามเอกสาร US4-T15 (ST-01 ถึง ST-21) แบบเดียวกับ US3-T19
// ตรวจ 3 ชั้นในแต่ละ case: หน้าเว็บ (Puppeteer), API request/response (ดักจาก Network หรือยิงตรง) และ DB (sqlcmd ใน container sqlserver)
//
// ต้องเปิดระบบก่อน: docker compose up -d --build โดยมี SPRING_PROFILES_ACTIVE=stub-tu ใน .env
// รัน: npm test                  ทั้ง 2 ช่วง (Flow 1 ใช้ token อายุจริง 3 ชั่วโมง, Flow 2 สั่ง restart backend ให้ token อายุสั้น แล้วคืนค่าเดิมตอนจบ)
//      npm run test:logout       เฉพาะช่วง Logout
//      npm run test:expiry       เฉพาะช่วง Session หมดอายุ
//      HEADLESS=false ดูเบราว์เซอร์, SHORT_JWT_MS=30000 อายุ token ในช่วง Session หมดอายุ
//
// บัญชีจาก StubTuApiClient (รหัสผ่าน Passw0rd!): A = 6609000001 Somchai Jaidee, A2 = 6609000000 Somporn Tuayang
// (บัญชี 6809610000 Alysa Liu ใน T15 ไม่มีใน stub จึงใช้บัญชีที่มีจริงแทน)

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const WEB = process.env.BASE_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://localhost:8080";
const DB_CONTAINER = process.env.DB_CONTAINER ?? "sqlserver";
const HEADLESS = process.env.HEADLESS !== "false";
const SHORT_JWT_MS = Number(process.env.SHORT_JWT_MS ?? 30000);
const PHASE = process.argv.find((a) => a.startsWith("--phase="))?.split("=")[1] ?? "all";

const PASSWORD = "Passw0rd!";
const A = { id: "6609000001", name: "Somchai Jaidee" };
const A2 = { id: "6609000000", name: "Somporn Tuayang" };
// section_id ตาม seed V20261014_2010 (ภาค 1/2568)
const SEC = { CS180: 1, MA211: 2, CS111: 3, LAS101: 4 };

const TOKEN_KEY = "mocktimetable.auth.token";
const EXPIRED_KEY = "mocktimetable.auth.expired";
const EXPIRED_MESSAGE = "เซสชันของคุณหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(OUT_DIR, "../../../..");
const SHOT_DIR = join(OUT_DIR, "screenshots");
const EVIDENCE_DIR = join(OUT_DIR, "evidence");
const SHORT_COMPOSE = join(OUT_DIR, "compose.short-jwt.yaml");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- DB

/** รัน query ใน container โดยส่ง query ผ่าน env จึงไม่ต้อง escape quote ซ้อนหลายชั้น */
function sql(query) {
  const out = execFileSync("docker", [
    "exec", "-e", `Q=SET NOCOUNT ON; ${query}`, DB_CONTAINER, "bash", "-c",
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -b -h -1 -W -s "|" -Q "$Q"',
  ], { encoding: "utf8" });
  return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split("|"));
}

/** สภาพ DB ของนักศึกษาที่ระบุ: users, login_attempt และตารางเรียน ใช้เทียบก่อน/หลัง */
function dbSnapshot(ids = [A.id]) {
  const list = ids.map((s) => `N'${s}'`).join(",");
  return {
    users: sql(`SELECT student_id, CONVERT(varchar(40), updated_at, 127) FROM users WHERE student_id IN (${list}) ORDER BY student_id`),
    loginAttempt: sql(`SELECT username, failed_attempts FROM login_attempt WHERE username IN (${list}) ORDER BY username`),
    timetable: sql(`SELECT t.student_id, t.semester, CONVERT(varchar(40), t.updated_at, 127), e.entry_id, s.course_code
      FROM timetable t LEFT JOIN timetable_entry e ON e.timetable_id = t.timetable_id
      LEFT JOIN section s ON s.section_id = e.section_id
      WHERE t.student_id IN (${list}) ORDER BY t.student_id, t.semester, e.entry_id`),
  };
}

const coursesInDb = (snap, studentId) =>
  snap.timetable.filter((r) => r[0] === studentId && r[1] === "1" && r[4] !== "NULL").map((r) => r[4]);
const sameDb = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** คำสั่ง insert/update/delete ที่ backend log ไว้ (spring.jpa.show-sql) ตั้งแต่เวลาที่ระบุ */
function backendWrites(since) {
  const out = execFileSync("docker", ["logs", "--since", since.toISOString(), "backend"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return out.split(/\r?\n/).filter((l) => /^\s*(insert|update|delete)\b/i.test(l)).map((l) => l.trim());
}

// ---------------------------------------------------------------- API ตรง

async function api(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* ไม่มี body หรือไม่ใช่ JSON */ }
  return { status: res.status, contentType: res.headers.get("content-type"), body: json ?? text, date: res.headers.get("date") };
}

async function apiLogin(username) {
  const res = await api("POST", "/api/auth/login", null, { username, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login ${username} ได้ ${res.status}`);
  return res.body.token;
}

const jwtClaims = (token) => JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());

/** ล้างตาราง 1/2568 ของนักศึกษา แล้วเพิ่ม section ตามลำดับ */
async function resetTimetable(username, sectionIds) {
  const token = await apiLogin(username);
  const t = await api("GET", "/api/timetable?academicYear=2568&semester=1", token);
  const ids = t.body.entries.map((e) => e.entryId);
  if (ids.length) await api("DELETE", `/api/timetable/entries?entryIds=${ids.join(",")}`, token);
  for (const sectionId of sectionIds) {
    const res = await api("POST", "/api/timetable/entries", token, { sectionId });
    if (res.status !== 201) throw new Error(`เพิ่ม section ${sectionId} ได้ ${res.status}`);
  }
}

// ---------------------------------------------------------------- backend config

function compose(args) {
  execFileSync("docker", ["compose", ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, SHORT_JWT_MS: String(SHORT_JWT_MS) } });
}

async function waitBackendReady() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await api("POST", "/api/auth/login", null, {});
      if (res.status === 400) return;
    } catch { /* backend ยังไม่ขึ้น */ }
    await sleep(2000);
  }
  throw new Error("backend ไม่พร้อมภายใน 3 นาที");
}

async function useShortJwt() {
  console.log(`\n… restart backend ให้ token อายุ ${SHORT_JWT_MS / 1000} วินาที`);
  compose(["-f", "compose.yaml", "-f", SHORT_COMPOSE, "up", "-d", "backend"]);
  await waitBackendReady();
}

async function useNormalJwt() {
  console.log("\n… คืนค่า backend เป็น token อายุ 3 ชั่วโมง");
  compose(["up", "-d", "backend"]);
  await waitBackendReady();
}

// ---------------------------------------------------------------- ผลการตรวจ

const results = [];
const evidence = {};
let current;

function startCase(id, title) {
  current = { id, title, checks: [], notes: [], error: null };
  results.push(current);
  evidence[id] = {};
  console.log(`\n▶ ${id} ${title}`);
}

function check(layer, description, pass, actual) {
  current.checks.push({ layer, description, pass: Boolean(pass), actual });
  console.log(`  ${pass ? "✔" : "✘"} [${layer}] ${description}${pass ? "" : `  (ได้: ${JSON.stringify(actual)})`}`);
}

function note(text) {
  current.notes.push(text);
  console.log(`  ℹ ${text}`);
}

// ---------------------------------------------------------------- เบราว์เซอร์

let browser;

/** เปิดแท็บใหม่ใน context แยก (เหมือนเบราว์เซอร์อีกตัว) พร้อมบันทึก request /api ทุกตัว */
async function newPage(context) {
  const ctx = context ?? (await browser.createBrowserContext());
  const page = await ctx.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.apiLog = [];
  page.pageErrors = [];
  page.on("pageerror", (e) => page.pageErrors.push(e.message));
  page.on("response", (r) => {
    const url = new URL(r.url());
    if (!url.pathname.startsWith("/api/")) return;
    const req = r.request();
    page.apiLog.push({
      at: new Date().toISOString(), method: req.method(), path: url.pathname + url.search, status: r.status(),
      authorization: req.headers().authorization ?? null, requestBody: req.postData() ?? null,
    });
  });
  return page;
}

const isApi = (method, prefix) => (r) => r.request().method() === method && new URL(r.url()).pathname.startsWith(prefix);

async function readBody(response) {
  try { return await response.text(); } catch { return ""; }
}

async function waitForPath(page, path, timeout = 10000) {
  try {
    await page.waitForFunction((p) => location.pathname === p, { timeout }, path);
    return true;
  } catch {
    return false;
  }
}

async function waitForText(page, text, timeout = 10000) {
  try {
    await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
    return true;
  } catch {
    return false;
  }
}

/** สถานะฝั่ง client: ที่เก็บ token, banner และสิ่งที่แสดงบนจอ */
const clientState = (page) => page.evaluate((tokenKey, expiredKey) => {
  const added = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.includes("วิชาที่เพิ่มแล้ว"));
  return {
    path: location.pathname,
    sessionToken: sessionStorage.getItem(tokenKey),
    localToken: localStorage.getItem(tokenKey),
    expiredFlag: sessionStorage.getItem(expiredKey),
    banner: document.querySelector("[data-testid=session-expired-banner]")?.textContent.trim() ?? null,
    navbar: document.querySelector('[aria-label="ข้อมูลนักศึกษา"] button[aria-haspopup="dialog"]')?.innerText.replace(/\s+/g, " ").trim() ?? null,
    addedCourses: added ? [...added.querySelectorAll("article p.font-bold")].map((p) => p.textContent.trim()) : null,
    text: document.body.innerText,
  };
}, TOKEN_KEY, EXPIRED_KEY);

/** หน้า Login ที่ล้าง state ครบ: ไม่มี token ทั้ง 2 ที่ ไม่มีชื่อผู้ใช้และตารางเรียนบนจอ */
function checkCleared(state, user, { banner }) {
  check("UI", "อยู่หน้า /login", state.path === "/login", state.path);
  check("UI", "ไม่มี token ใน sessionStorage และ localStorage", !state.sessionToken && !state.localToken, { session: state.sessionToken, local: state.localToken });
  check("UI", `ไม่แสดงข้อมูลผู้ใช้เดิม (${user.name}, ${user.id}) และตารางเรียน`,
    !state.text.includes(user.name) && !state.text.includes(user.id) && state.navbar === null && state.addedCourses === null,
    { navbar: state.navbar, courses: state.addedCourses });
  if (banner) {
    check("UI", `แสดง banner สีเหลือง "${EXPIRED_MESSAGE}"`, state.banner === EXPIRED_MESSAGE, state.banner);
  } else {
    check("UI", "ไม่แสดง banner Session หมดอายุ", state.banner === null, state.banner);
  }
}

/** login ผ่านหน้าเว็บ รอจนหน้าเมนูหลักแสดงชื่อและตารางเรียน คืน token ที่เก็บใน sessionStorage */
async function uiLogin(page, user) {
  if (new URL(page.url()).pathname !== "/login") await page.goto(`${WEB}/login`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#login-username");
  for (const [selector, value] of [["#login-username", user.id], ["#login-password", PASSWORD]]) {
    await page.click(selector, { count: 3 });
    await page.keyboard.press("Backspace");
    await page.type(selector, value);
  }
  const loginWait = page.waitForResponse(isApi("POST", "/api/auth/login"), { timeout: 15000 });
  await page.click("button[type=submit]");
  const res = await loginWait;
  if (res.status() !== 200) throw new Error(`login ${user.id} ผ่านหน้าเว็บได้ ${res.status()}`);
  await waitForPath(page, "/");
  if (!(await waitForText(page, user.name))) throw new Error(`Navbar ไม่แสดง ${user.name}`);
  await page.waitForFunction(() => {
    const added = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.includes("วิชาที่เพิ่มแล้ว"));
    return added && !document.body.innerText.includes("กำลังโหลด");
  }, { timeout: 10000 }).catch(() => {});
  await sleep(300);
  return page.evaluate((k) => sessionStorage.getItem(k), TOKEN_KEY);
}

/** เปิดเมนูบัญชีที่ Navbar แล้วกด "ออกจากระบบ" คืน response ของ POST /api/auth/logout */
async function clickLogout(page, { double = false } = {}) {
  await page.click('[aria-label="ข้อมูลนักศึกษา"] button[aria-haspopup="dialog"]');
  await sleep(300);
  const wait = page.waitForResponse(isApi("POST", "/api/auth/logout"), { timeout: 15000 });
  await page.evaluate((twice) => {
    const btn = [...document.querySelectorAll('[aria-label="เมนูบัญชีผู้ใช้"] button')].find((b) => b.textContent.includes("ออกจากระบบ"));
    btn.click();
    if (twice) btn.click();
  }, double);
  const res = await wait;
  const body = await readBody(res);
  await waitForPath(page, "/login");
  await sleep(500);
  return { status: res.status(), body, contentType: res.headers()["content-type"] ?? null, request: res.request() };
}

/** กด "+ เพิ่มวิชา" ของรหัสวิชาในส่วนค้นหารายวิชา คืน response ของ POST /api/timetable/entries */
async function clickAdd(page, courseCode) {
  const wait = page.waitForResponse(isApi("POST", "/api/timetable/entries"), { timeout: 15000 });
  const found = await page.evaluate((code) => {
    const card = [...document.querySelectorAll("article")].find((a) => a.querySelector("p.font-bold")?.textContent.trim() === code
      && [...a.querySelectorAll("button")].some((b) => b.textContent.includes("เพิ่มวิชา")));
    const btn = card && [...card.querySelectorAll("button")].find((b) => b.textContent.includes("เพิ่มวิชา"));
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  }, courseCode);
  if (!found) throw new Error(`กดเพิ่ม ${courseCode} ไม่ได้`);
  const res = await wait;
  await sleep(800);
  return { status: res.status(), body: await readBody(res) };
}

/** กด "ลบวิชา" ของรหัสวิชาในรายการวิชาที่เพิ่มแล้ว */
async function clickDelete(page, courseCode) {
  const wait = page.waitForResponse(isApi("DELETE", "/api/timetable/entries"), { timeout: 15000 });
  const found = await page.evaluate((code) => {
    const added = [...document.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent.includes("วิชาที่เพิ่มแล้ว"));
    const card = [...added.querySelectorAll("article")].find((a) => a.querySelector("p.font-bold")?.textContent.trim() === code);
    const btn = card && [...card.querySelectorAll("button")].find((b) => b.textContent.includes("ลบวิชา"));
    if (!btn) return false;
    btn.click();
    return true;
  }, courseCode);
  if (!found) throw new Error(`กดลบ ${courseCode} ไม่ได้`);
  const res = await wait;
  await sleep(800);
  return { status: res.status() };
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

const apiSince = (page, from) => page.apiLog.slice(from).map(({ method, path, status }) => `${method} ${path} → ${status}`);
const isProblem = (r) => (r.contentType ?? "").includes("application/problem+json");

// ---------------------------------------------------------------- Flow 1: Logout (token อายุจริง 3 ชั่วโมง)

const shared = {};

const logoutCases = [
  ["ST-01", "logout ปกติ → 204, ล้าง state ครบ, กลับหน้า Login, DB ไม่เปลี่ยน", async () => {
    await resetTimetable(A.id, [SEC.CS180, SEC.MA211]);
    const page = await newPage();
    shared.flowPage = page;
    const token = await uiLogin(page, A);
    shared.st01Token = token;
    // ติดตั้งใน window ของหน้า "/" นี้ ถ้ากด Back แล้วเบราว์เซอร์คืนหน้านี้จาก bfcache จะรู้ว่า DOM เดิมยังมีชื่ออยู่กี่เฟรม
    await page.evaluate((name) => {
      window.addEventListener("pageshow", (e) => {
        const has = () => document.body.innerText.includes(name);
        window.__bf = { persisted: e.persisted, atPageshow: has(), at: location.href };
        requestAnimationFrame(() => {
          window.__bf.frame1 = has();
          requestAnimationFrame(() => { window.__bf.frame2 = has(); });
        });
        setTimeout(() => { window.__bf.after100ms = has(); }, 100);
      });
    }, A.name);
    // login ใช้ router.replace จึงไม่มีหน้า "/" ในประวัติ เปิดหน้าเมนูหลักอีกครั้ง (URL ต่างจากเดิมเพื่อให้เป็นรายการใหม่)
    // ประวัติจะเป็น [/, /?from=menu] และ logout แทนรายการล่าสุดด้วย /login ทำให้กด Back แล้วกลับไปหน้า "/" ที่ต้อง login
    await page.goto(`${WEB}/?from=menu`, { waitUntil: "networkidle0" });
    await waitForText(page, A.name);
    const before = await clientState(page);
    check("UI", "ก่อน logout: Navbar แสดงชื่อ รหัส และตารางเรียน CS180, MA211", before.navbar?.includes(A.name) && before.navbar?.includes(A.id)
      && before.addedCourses?.join(",") === "CS180,MA211", { navbar: before.navbar, courses: before.addedCourses });
    const dbBefore = dbSnapshot([A.id]);
    const since = new Date(Date.now() - 1000);
    const res = await clickLogout(page);
    const auth = res.request.headers().authorization;
    check("API", "POST /api/auth/logout แนบ Authorization: Bearer <token ปัจจุบัน>", auth === `Bearer ${token}`, auth?.slice(0, 20));
    check("API", "request ไม่มี body", !res.request.postData(), res.request.postData());
    check("API", "ตอบ 204 No Content ไม่มี body", res.status === 204 && res.body === "", { status: res.status, body: res.body });
    const state = await clientState(page);
    checkCleared(state, A, { banner: false });
    await shot(page, "ST-01");
    check("DB", "users, login_attempt, timetable ของ A ไม่เปลี่ยน", sameDb(dbBefore, dbSnapshot([A.id])), dbSnapshot([A.id]));
    const writes = backendWrites(since);
    check("DB", "backend ไม่รัน insert/update/delete ระหว่าง logout", writes.length === 0, writes);
    shared.st01Banner = state.banner;
    evidence["ST-01"] = { api: page.apiLog.slice(-1), db: dbBefore };
  }],

  ["ST-02", "กด Back หลัง logout → ไม่แสดงข้อมูลเดิม กลับหน้า Login", async () => {
    const page = shared.flowPage;
    const from = page.apiLog.length;
    // จับข้อความบนจอทุกครั้งที่ DOM เปลี่ยน เพื่อดูว่าข้อมูลเดิมโผล่ขึ้นมาแม้ชั่วขณะหรือไม่
    // Next.js จัดการ Back ในเอกสารเดิม (popstate) จึงติดตั้งในหน้าปัจจุบัน และเผื่อกรณีโหลดเอกสารใหม่ด้วย
    const watch = (name) => {
      window.__leaked = false;
      new MutationObserver(() => { if (document.body?.innerText.includes(name)) window.__leaked = true; })
        .observe(document, { subtree: true, childList: true, characterData: true });
    };
    await page.evaluateOnNewDocument(watch, A.name);
    await page.evaluate(watch, A.name);
    await page.goBack({ waitUntil: "networkidle0" }).catch(() => {});
    const backUrl = page.url();
    await sleep(1500);
    const state = await clientState(page);
    const { leaked, bf, nav } = await page.evaluate(() => ({
      leaked: window.__leaked, bf: window.__bf, nav: performance.getEntriesByType("navigation")[0]?.type,
    })).catch(() => ({}));
    evidence["ST-02"] = { backUrl, leaked, bf, nav };
    note(`กด Back ไปที่ ${backUrl} แล้วจบที่ ${page.url()} · request: ${JSON.stringify(apiSince(page, from))}`);
    check("UI", "กด Back ไปถึงหน้าเมนูหลักที่ต้อง login จริง", new URL(backUrl).pathname === "/" || new URL(backUrl).pathname === "/login", backUrl);
    if (bf) {
      note(`เบราว์เซอร์คืนหน้า / จาก bfcache (persisted=${bf.persisted}) ชื่อผู้ใช้อยู่ใน DOM: ตอน pageshow=${bf.atPageshow}, เฟรมแรก=${bf.frame1}, เฟรมที่สอง=${bf.frame2}, หลัง 100ms=${bf.after100ms}`);
      check("UI", `หน้าเดิมที่คืนจาก bfcache ไม่แสดงชื่อ ${A.name} ในเฟรมที่วาดขึ้นจอ`, bf.frame1 === false, bf);
    } else {
      note(`โหลดหน้า / ใหม่ (navigation type: ${nav}) ไม่ได้คืนจาก bfcache`);
      check("UI", `ไม่มีชื่อ ${A.name} โผล่บนจอแม้ชั่วขณะ`, leaked === false, leaked);
    }
    checkCleared(state, A, { banner: false });
    const authed = page.apiLog.slice(from).filter((r) => r.authorization);
    check("API", "ไม่มี request ที่แนบ token เดิม", authed.length === 0, authed);
    await shot(page, "ST-02");
  }],

  ["ST-03", "พิมพ์ URL หน้าเมนูหลักตรงๆ หลัง logout → กลับหน้า Login", async () => {
    const page = shared.flowPage;
    const from = page.apiLog.length;
    await page.goto(`${WEB}/`, { waitUntil: "networkidle0" });
    await waitForPath(page, "/login");
    await sleep(500);
    checkCleared(await clientState(page), A, { banner: false });
    note(`request หลังเปิด /: ${JSON.stringify(apiSince(page, from))}`);
    await shot(page, "ST-03");
  }],

  ["ST-04", "login ใหม่หลัง logout → token ใหม่ Navbar แสดงชื่อและรหัส", async () => {
    const page = shared.flowPage;
    const token = await uiLogin(page, A);
    const state = await clientState(page);
    check("API", "ได้ token ใหม่ไม่ซ้ำกับ token ของ ST-01", token && token !== shared.st01Token, token?.slice(-10));
    check("UI", `Navbar แสดง "${A.name}" และ "${A.id}"`, state.navbar?.includes(A.name) && state.navbar?.includes(A.id), state.navbar);
    check("UI", "ตารางเรียนของ A แสดงครบ CS180, MA211", state.addedCourses?.join(",") === "CS180,MA211", state.addedCourses);
    await shot(page, "ST-04");
  }],

  ["ST-05", "สลับบัญชี A → A2 ในแท็บเดียวกัน ข้อมูลไม่ปนกัน", async () => {
    await resetTimetable(A2.id, [SEC.LAS101]);
    const page = shared.flowPage;
    const res = await clickLogout(page);
    check("API", "logout A ได้ 204", res.status === 204, res.status);
    const from = page.apiLog.length;
    const token = await uiLogin(page, A2);
    const state = await clientState(page);
    check("UI", `Navbar แสดง "${A2.name}" และ "${A2.id}"`, state.navbar?.includes(A2.name) && state.navbar?.includes(A2.id), state.navbar);
    check("UI", `ไม่มีชื่อหรือรหัสของ A (${A.name}, ${A.id}) บนจอ`, !state.text.includes(A.name) && !state.text.includes(A.id), state.navbar);
    check("UI", "รายการวิชาที่เพิ่มแล้วเป็นของ A2 (LAS101) ไม่มี CS180, MA211 ของ A", state.addedCourses?.join(",") === "LAS101", state.addedCourses);
    const gets = page.apiLog.slice(from).filter((r) => r.method === "GET");
    check("API", "GET /api/users/me และ /api/timetable หลังสลับบัญชีใช้ token ของ A2 ทั้งหมด",
      gets.length >= 2 && gets.every((r) => r.authorization === `Bearer ${token}`), gets.map((r) => `${r.path} ${r.authorization?.slice(-8)}`));
    await shot(page, "ST-05");
    await clickLogout(page);
  }],

  ["ST-06", "ข้อมูลไม่หายหลัง logout (เพิ่มวิชา → logout → login)", async () => {
    await resetTimetable(A.id, [SEC.CS180, SEC.MA211]);
    const page = await newPage();
    await uiLogin(page, A);
    const add = await clickAdd(page, "CS111");
    check("API", "เพิ่ม CS111 ผ่านหน้าเว็บ ได้ 201", add.status === 201, add.status);
    const dbBefore = dbSnapshot([A.id]);
    check("DB", "DB มี CS180, MA211, CS111", coursesInDb(dbBefore, A.id).join(",") === "CS180,MA211,CS111", coursesInDb(dbBefore, A.id));
    const since = new Date(Date.now() - 1000);
    const res = await clickLogout(page);
    check("API", "logout ได้ 204", res.status === 204, res.status);
    const dbAfterLogout = dbSnapshot([A.id]);
    check("DB", "หลัง logout แถวใน users, login_attempt, timetable, timetable_entry เหมือนเดิมทุกค่า", sameDb(dbBefore, dbAfterLogout), dbAfterLogout);
    check("DB", "backend ไม่รัน insert/update/delete ระหว่าง logout", backendWrites(since).length === 0, backendWrites(since));
    await uiLogin(page, A);
    const state = await clientState(page);
    check("UI", "login อีกครั้ง ตารางเรียนยังมี CS180, MA211, CS111", state.addedCourses?.join(",") === "CS180,MA211,CS111", state.addedCourses);
    const dbAfterLogin = dbSnapshot([A.id]);
    check("DB", "entry_id ในตารางเรียนเหมือนเดิม (ไม่ถูกลบหรือสร้างใหม่)", sameDb(dbBefore.timetable, dbAfterLogin.timetable), dbAfterLogin.timetable);
    check("DB", "แถว users ของ A ยังอยู่", dbAfterLogin.users.length === 1, dbAfterLogin.users);
    await shot(page, "ST-06");
    await clickLogout(page);
    await resetTimetable(A.id, [SEC.CS180, SEC.MA211]);
  }],

  ["ST-07", "ดับเบิลคลิก ออกจากระบบ → กลับหน้า Login ไม่มี error", async () => {
    const page = await newPage();
    await uiLogin(page, A);
    const from = page.apiLog.length;
    const res = await clickLogout(page, { double: true });
    await sleep(1500);
    const logouts = page.apiLog.slice(from).filter((r) => r.path === "/api/auth/logout");
    note(`POST /api/auth/logout ถูกส่ง ${logouts.length} ครั้ง: ${JSON.stringify(logouts.map((r) => r.status))}`);
    check("API", "request แรกได้ 204 และถ้ามี request ที่สองได้ 204/401", res.status === 204 && logouts.every((r) => [204, 401].includes(r.status)), logouts.map((r) => r.status));
    const state = await clientState(page);
    checkCleared(state, A, { banner: false });
    const alerts = await page.$$eval("[role=alert]", (els) => els.map((e) => e.textContent.trim()));
    check("UI", "ไม่มีข้อความ error บนหน้าจอ และไม่มี JavaScript error", alerts.length === 0 && page.pageErrors.length === 0, { alerts, errors: page.pageErrors });
    await shot(page, "ST-07");
  }],

  ["ST-08", "logout ซ้ำจากอีกแท็บ → แท็บ 2 ล้าง state และกลับหน้า Login", async () => {
    const ctx = await browser.createBrowserContext();
    const tab1 = await newPage(ctx);
    const token = await uiLogin(tab1, A);
    // token อยู่ใน sessionStorage ซึ่งแยกต่อแท็บ จึงจำลองแท็บ 2 แบบ "ทำสำเนาแท็บ" (Duplicate tab) ที่คัดลอก sessionStorage มาด้วย
    const tab2 = await newPage(ctx);
    await tab2.goto(`${WEB}/login`, { waitUntil: "networkidle0" });
    await tab2.evaluate((k, t) => sessionStorage.setItem(k, t), TOKEN_KEY, token);
    await tab2.goto(`${WEB}/`, { waitUntil: "networkidle0" });
    check("UI", "แท็บ 2 แสดงหน้าเมนูหลักของ A", await waitForText(tab2, A.name), null);
    await tab1.bringToFront();
    const r1 = await clickLogout(tab1);
    check("API", "แท็บ 1 logout ได้ 204", r1.status === 204, r1.status);
    await tab2.bringToFront();
    const tab2Before = await clientState(tab2);
    note(`หลังแท็บ 1 logout แท็บ 2 ยังอยู่ที่ ${tab2Before.path} และยังมี token ของตัวเอง: ${Boolean(tab2Before.sessionToken)}`);
    const r2 = await clickLogout(tab2);
    check("API", "แท็บ 2 กด logout ส่ง token เดิมได้ 204 (stateless) หรือ 401", [204, 401].includes(r2.status), r2.status);
    note(`แท็บ 2 ได้ ${r2.status}`);
    checkCleared(await clientState(tab2), A, { banner: false });
    await shot(tab2, "ST-08");
    await ctx.close();
  }],

  ["ST-10", "ใช้ token เดิมหลัง logout (ข้อจำกัดของระบบ stateless)", async () => {
    const token = await apiLogin(A.id);
    const out = await api("POST", "/api/auth/logout", token);
    check("API", "POST /api/auth/logout ได้ 204", out.status === 204, out.status);
    const me = await api("GET", "/api/users/me", token);
    check("API", "ช่วงที่ 1: GET /api/users/me ด้วย token เดิมหลัง logout ได้ 200 ข้อมูลของ A (ตามข้อจำกัดที่บันทึกใน US4-T05)",
      me.status === 200 && me.body?.studentId === A.id && me.body?.firstName === "Somchai" && me.body?.lastName === "Jaidee", me);
    evidence["ST-10"].afterLogout = me;
    note("ช่วงที่ 2 (หลัง token หมดอายุได้ 401) อยู่ใน Flow 2 ที่ใช้ token อายุสั้น");
  }],

  ["ST-18a", "อายุ token ตามค่าจริง = 3 ชั่วโมง", async () => {
    const claims = jwtClaims(await apiLogin(A.id));
    check("API", "exp − iat ของ token = 10800 วินาที (3 ชั่วโมง)", claims.exp - claims.iat === 10800, claims);
  }],

  ["ST-20", "login 2 เบราว์เซอร์ด้วยบัญชีเดียวกัน logout ที่หนึ่ง อีกที่ยังใช้ได้ (ข้อจำกัด)", async () => {
    const b1 = await newPage();
    const b2 = await newPage();
    await uiLogin(b1, A);
    const token2 = await uiLogin(b2, A);
    const r1 = await clickLogout(b1);
    check("API", "เบราว์เซอร์ 1 logout ได้ 204", r1.status === 204, r1.status);
    const from = b2.apiLog.length;
    await b2.reload({ waitUntil: "networkidle0" });
    await sleep(800);
    const calls = b2.apiLog.slice(from);
    check("API", "เบราว์เซอร์ 2 reload แล้ว GET /api/users/me และ /api/timetable ได้ 200", calls.length >= 2 && calls.every((r) => r.status === 200), apiSince(b2, from));
    const state = await clientState(b2);
    check("UI", "เบราว์เซอร์ 2 ยังแสดงหน้าเมนูหลักของ A ตามปกติ", state.path === "/" && state.navbar?.includes(A.name) && state.sessionToken === token2, state.navbar);
    await shot(b2, "ST-20");
    await clickLogout(b2);
  }],

  ["ST-21", "ปุ่ม ออกจากระบบ อยู่ที่ Navbar ทุกเมนู", async () => {
    const page = await newPage();
    await uiLogin(page, A);
    const positions = {};
    for (const label of ["จัดตารางเรียนจำลอง", "ดูวิชาเสรีแนะนำ", "ค้นหาช่องทางขอโควตา"]) {
      await page.evaluate((l) => [...document.querySelectorAll('nav[aria-label="เมนูหลัก"] button')].find((b) => b.textContent.includes(l)).click(), label);
      await sleep(400);
      const box = await page.$eval('[aria-label="ข้อมูลนักศึกษา"] button[aria-haspopup="dialog"]', (el) => {
        const r = el.getBoundingClientRect();
        return `${Math.round(r.x)},${Math.round(r.y)}`;
      }).catch(() => null);
      positions[label] = box;
    }
    const values = Object.values(positions);
    check("UI", "ปุ่มบัญชีผู้ใช้ (ที่มีเมนู ออกจากระบบ) อยู่ที่ Navbar มุมขวาบนตำแหน่งเดียวกันทุกเมนู", values.every((v) => v && v === values[0]), positions);
    // logout จากเมนู "ดูวิชาเสรีแนะนำ" ที่ไม่ใช่หน้าจัดตาราง
    await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="เมนูหลัก"] button')].find((b) => b.textContent.includes("ดูวิชาเสรีแนะนำ")).click());
    await sleep(300);
    await shot(page, "ST-21-before");
    const res = await clickLogout(page);
    check("API", "logout จากเมนูดูวิชาเสรีแนะนำ ได้ 204", res.status === 204, res.status);
    checkCleared(await clientState(page), A, { banner: false });
    await shot(page, "ST-21");
    note("ระบบมีหน้าเดียว (/) ที่สลับเมนูใน header ส่วน /dashboard redirect มาที่ / จึงทดสอบทุกเมนูแทนทุกหน้า");
  }],
];

// ---------------------------------------------------------------- Flow 2: Session หมดอายุ (token อายุสั้น)

async function runExpiryFlow() {
  const p = {};
  const t = {};

  startCase("PREP", `เตรียม Flow 2: backend ออก token อายุ ${SHORT_JWT_MS / 1000} วินาที`);
  await resetTimetable(A.id, [SEC.CS180, SEC.MA211]);
  const probe = jwtClaims(await apiLogin(A.id));
  check("API", `exp − iat ของ token = ${SHORT_JWT_MS / 1000} วินาที`, probe.exp - probe.iat === SHORT_JWT_MS / 1000, probe);

  // เตรียมทุก case ก่อน แล้วรอให้ token ทุกตัวหมดอายุพร้อมกันครั้งเดียว
  p.st09 = await newPage(); await uiLogin(p.st09, A);
  t.st10 = await apiLogin(A.id);
  const st10Logout = await api("POST", "/api/auth/logout", t.st10);
  const st10Before = await api("GET", "/api/users/me", t.st10);
  p.st11 = await newPage(); await uiLogin(p.st11, A);
  p.st12 = await newPage(); await uiLogin(p.st12, A);
  const st12From = p.st12.apiLog.length;
  const st12Shot = await clientState(p.st12);
  p.st14 = await newPage(); await uiLogin(p.st14, A);
  p.st16 = await newPage(); await uiLogin(p.st16, A);
  t.st17 = await apiLogin(A.id);
  // ST-19 ใช้บัญชี A2 เพราะมีการเพิ่ม/ลบวิชา ไม่ให้กระทบตารางของ A ที่ case อื่นตรวจ
  await resetTimetable(A2.id, [SEC.CS180, SEC.MA211]);
  p.st19 = await newPage();
  await uiLogin(p.st19, A2);
  const st19Add = await clickAdd(p.st19, "CS111");
  const st19Del = await clickDelete(p.st19, "CS180");
  const st19Out = await clickLogout(p.st19);
  await uiLogin(p.st19, A2);
  const st19Relogin = await clientState(p.st19);

  // ST-18: token ตัวสุดท้าย ใช้หาจังหวะหมดอายุจริง
  const loginRes = await api("POST", "/api/auth/login", null, { username: A.id, password: PASSWORD });
  t.st18 = loginRes.body.token;
  const c18 = jwtClaims(t.st18);
  const clockOffsetMs = Date.parse(loginRes.date) - Date.now(); // เวลา server − เวลาเครื่องที่รัน (ความละเอียด 1 วินาที)
  const serverNow = () => Date.now() + clockOffsetMs;
  await sleep(Math.max(0, c18.exp * 1000 - 5000 - serverNow()));
  const st18Before = await api("GET", "/api/users/me", t.st18);
  const st18BeforeAt = serverNow() / 1000 - c18.exp;
  let st18FirstReject = null;
  const st18Polls = [];
  while (serverNow() / 1000 < c18.exp + 180) {
    const r = await api("GET", "/api/users/me", t.st18);
    const at = Math.round(serverNow() / 1000 - c18.exp);
    st18Polls.push(`exp${at >= 0 ? "+" : ""}${at}s → ${r.status}`);
    if (r.status === 401) { st18FirstReject = at; break; }
    await sleep(5000);
  }
  console.log(`  token ตัวสุดท้ายถูกปฏิเสธที่ exp + ${st18FirstReject} วินาที`);

  // ---------------- หลัง token ทุกตัวหมดอายุ

  startCase("ST-09", "logout ตอน token หมดอายุแล้ว → 401 ล้าง state ไม่แสดง banner");
  {
    const page = p.st09;
    const res = await clickLogout(page);
    check("API", "POST /api/auth/logout ได้ 401 ProblemDetail", res.status === 401 && (res.contentType ?? "").includes("problem+json"), { status: res.status, contentType: res.contentType, body: res.body });
    checkCleared(await clientState(page), A, { banner: false });
    await shot(page, "ST-09");
  }

  startCase("ST-10", "ใช้ token เดิมหลัง logout: ก่อนหมดอายุ 200, หลังหมดอายุ 401");
  {
    check("API", "logout ด้วย token อายุสั้นได้ 204", st10Logout.status === 204, st10Logout.status);
    check("API", "ก่อนหมดอายุ GET /api/users/me ด้วย token ที่ logout แล้วได้ 200 (ข้อจำกัด stateless)", st10Before.status === 200 && st10Before.body?.studentId === A.id, st10Before.status);
    const after = await api("GET", "/api/users/me", t.st10);
    check("API", "หลังหมดอายุได้ 401", after.status === 401, after.status);
  }

  startCase("ST-11", "หมดอายุแล้วกดฟังก์ชันที่เรียก API → 401 กลับหน้า Login พร้อม banner");
  {
    const page = p.st11;
    const dbBefore = dbSnapshot([A.id]);
    const since = new Date(Date.now() - 1000);
    const from = page.apiLog.length;
    // เปลี่ยนภาคเรียน = เรียก GET /api/timetable
    const wait = page.waitForResponse(isApi("GET", "/api/timetable"), { timeout: 15000 });
    await page.select('select[aria-label="ภาคเรียน"]', "2");
    const res = await wait;
    check("API", "GET /api/timetable ด้วย token หมดอายุได้ 401 ProblemDetail", res.status() === 401 && (res.headers()["content-type"] ?? "").includes("problem+json"), res.status());
    await waitForPath(page, "/login");
    await sleep(500);
    const state = await clientState(page);
    checkCleared(state, A, { banner: true });
    note(`request: ${JSON.stringify(apiSince(page, from))}`);
    check("DB", "DB ของ A ไม่เปลี่ยน", sameDb(dbBefore, dbSnapshot([A.id])), dbSnapshot([A.id]));
    check("DB", "backend ไม่รัน insert/update/delete", backendWrites(since).length === 0, backendWrites(since));
    shared.st11Banner = state.banner;
    await shot(page, "ST-11");
  }

  startCase("ST-15", "หมดอายุแล้ว login ใหม่ → สำเร็จ ตารางเรียนเดิมอยู่ครบ");
  {
    const page = p.st11;
    await uiLogin(page, A);
    const state = await clientState(page);
    check("UI", "login สำเร็จ Navbar แสดงชื่อและรหัส", state.navbar?.includes(A.name) && state.navbar?.includes(A.id), state.navbar);
    check("UI", "ไม่มี banner Session หมดอายุ และ flag ถูกล้าง", state.banner === null && !state.expiredFlag, { banner: state.banner, flag: state.expiredFlag });
    check("UI", "ตารางเรียนเดิมครบ CS180, MA211", state.addedCourses?.join(",") === "CS180,MA211", state.addedCourses);
    check("DB", "DB ตรงกับที่หน้าเว็บแสดง", coursesInDb(dbSnapshot([A.id]), A.id).join(",") === state.addedCourses?.join(","), coursesInDb(dbSnapshot([A.id]), A.id));
    await shot(page, "ST-15");
  }

  startCase("ST-13", "banner แสดงเฉพาะตอน Session หมดอายุ");
  {
    check("UI", "หลัง logout ปกติ (ST-01) ไม่มี banner", shared.st01Banner === null || PHASE === "expiry", shared.st01Banner);
    check("UI", "หลังหมดอายุ (ST-11) มี banner ข้อความตามที่กำหนด", shared.st11Banner === EXPIRED_MESSAGE, shared.st11Banner);
    const page = p.st11;
    const res = await clickLogout(page);
    check("API", "login แล้ว logout ปกติอีกรอบได้ 204", res.status === 204, res.status);
    const state = await clientState(page);
    check("UI", "banner หายไป ไม่แสดงบนหน้า Login หลัง logout ปกติ", state.path === "/login" && state.banner === null, state.banner);
    await shot(page, "ST-13");
    if (PHASE === "expiry") note("รันเฉพาะ Flow 2 จึงไม่มีผลของ ST-01 ให้เทียบ");
  }

  startCase("ST-12", "หมดอายุแต่ไม่ทำอะไร → หน้าไม่เปลี่ยนเองจนกว่าจะมี request");
  {
    const page = p.st12;
    const state = await clientState(page);
    const idleSec = Math.round(serverNow() / 1000 - jwtClaims(st12Shot.sessionToken).exp);
    note(`ปล่อยหน้าไว้โดยไม่แตะ จนเลยเวลาหมดอายุของ token ${idleSec} วินาที`);
    check("UI", "ยังอยู่หน้าเมนูหลัก (/) แสดงชื่อและตารางเรียนเดิม ไม่มี banner", state.path === "/" && state.navbar === st12Shot.navbar && state.banner === null, { path: state.path, navbar: state.navbar, banner: state.banner });
    check("API", "ไม่มี request ใดถูกส่งระหว่างที่ปล่อยไว้ (UI ไม่ได้ตั้งตัวจับเวลาจาก token)", page.apiLog.length === st12From, apiSince(page, st12From));
    await shot(page, "ST-12");
  }

  startCase("ST-14", "หมดอายุกลางการเพิ่มวิชา → 401 ไม่มีวิชาถูกเพิ่ม");
  {
    const page = p.st14;
    const dbBefore = dbSnapshot([A.id]);
    const n = coursesInDb(dbBefore, A.id).length;
    const since = new Date(Date.now() - 1000);
    const res = await clickAdd(page, "CS111");
    check("API", "POST /api/timetable/entries ได้ 401", res.status === 401, res);
    await waitForPath(page, "/login");
    await sleep(500);
    checkCleared(await clientState(page), A, { banner: true });
    const dbAfter = dbSnapshot([A.id]);
    check("DB", `จำนวนวิชาใน timetable_entry ยังเป็น ${n} ไม่มี CS111 และทุกแถวเหมือนก่อนกด`, coursesInDb(dbAfter, A.id).length === n && !coursesInDb(dbAfter, A.id).includes("CS111") && sameDb(dbBefore, dbAfter), coursesInDb(dbAfter, A.id));
    check("DB", "backend ไม่รัน insert/update/delete", backendWrites(since).length === 0, backendWrites(since));
    await shot(page, "ST-14");
  }

  startCase("ST-16", "refresh หลังหมดอายุ → 401 แล้วกลับหน้า Login ไม่ค้าง");
  {
    const page = p.st16;
    const from = page.apiLog.length;
    await page.reload({ waitUntil: "networkidle0" });
    const back = await waitForPath(page, "/login");
    await sleep(500);
    const calls = page.apiLog.slice(from);
    check("API", "API ที่หน้าเรียกตอน refresh ได้ 401", calls.length >= 1 && calls.some((r) => r.status === 401), apiSince(page, from));
    check("UI", "ถูกพากลับหน้า Login ภายใน 10 วินาที (ไม่ค้างหน้าว่างหรือโหลดไม่จบ)", back, page.url());
    checkCleared(await clientState(page), A, { banner: true });
    await shot(page, "ST-16");
  }

  startCase("ST-17", "ทุก API ที่ต้อง Authentication ตอบ 401 เหมือนกันเมื่อ token หมดอายุ");
  {
    const dbBefore = dbSnapshot([A.id]);
    const entryId = dbBefore.timetable.find((r) => r[4] === "CS180")?.[3];
    const calls = [
      ["GET", "/api/users/me"],
      ["GET", "/api/timetable?academicYear=2568&semester=1"],
      ["POST", "/api/timetable/entries", { sectionId: SEC.CS111 }],
      ["DELETE", `/api/timetable/entries?entryIds=${entryId}`],
      ["POST", "/api/auth/logout"],
    ];
    const out = {};
    for (const [method, path, body] of calls) {
      const r = await api(method, path, t.st17, body);
      out[`${method} ${path}`] = r;
      check("API", `${method} ${path} → 401 ProblemDetail`, r.status === 401 && isProblem(r), { status: r.status, contentType: r.contentType });
    }
    evidence["ST-17"] = out;
    check("DB", "DB ของ A ไม่เปลี่ยน (CS180 ไม่ถูกลบ, CS111 ไม่ถูกเพิ่ม)", sameDb(dbBefore, dbSnapshot([A.id])), dbSnapshot([A.id]));
    const ui = ["ST-11", "ST-14", "ST-16"].map((id) => results.find((r) => r.id === id));
    check("UI", "หน้าเว็บตอบสนอง 401 เหมือนกันทุกจุด (ST-11 GET timetable, ST-14 POST entries, ST-16 GET users/me)",
      ui.every((r) => r && r.checks.filter((c) => c.description.includes("banner")).every((c) => c.pass)), ui.map((r) => r?.id));
  }

  startCase("ST-18", "ขอบเขตเวลา: ก่อนหมดอายุ 200 หลังหมดอายุ 401");
  {
    check("API", `เรียกก่อน exp ${Math.round(-st18BeforeAt)} วินาที ได้ 200`, st18Before.status === 200, st18Before.status);
    check("API", "หลัง exp ได้ 401", st18FirstReject !== null, st18Polls);
    note(`ลำดับการเรียกหลัง exp: ${st18Polls.join(", ")}`);
    note(`token ถูกปฏิเสธครั้งแรกที่ exp + ${st18FirstReject} วินาที (วัดทุก 5 วินาที)`);
    if (st18FirstReject !== null && st18FirstReject > 5) {
      note("backend ยังรับ token หลัง exp อยู่ช่วงหนึ่ง ตรงกับ clock skew 60 วินาทีที่ NimbusJwtDecoder ตั้งไว้เป็นค่าเริ่มต้น อายุจริงจึงเป็น 3 ชั่วโมง + ไม่เกิน 60 วินาที");
    }
    check("API", "ถูกปฏิเสธไม่เกิน exp + 60 วินาที (clock skew เริ่มต้น) + รอบการวัด 5 วินาที", st18FirstReject !== null && st18FirstReject <= 65, st18FirstReject);
  }

  startCase("ST-19", "วงจรเต็ม (บัญชี A2): login → เพิ่ม/ลบวิชา → logout → login → หมดอายุ → ใช้งานต่อ");
  {
    check("API", "เพิ่ม CS111 ผ่านหน้าเว็บได้ 201", st19Add.status === 201, st19Add.status);
    check("API", "ลบ CS180 ผ่านหน้าเว็บได้ 200", st19Del.status === 200, st19Del.status);
    check("API", "logout ได้ 204", st19Out.status === 204, st19Out.status);
    check("UI", "login ใหม่ ตารางเรียนเป็น MA211, CS111 ตามที่ทำล่าสุด", st19Relogin.addedCourses?.join(",") === "MA211,CS111", st19Relogin.addedCourses);
    const page = p.st19;
    const wait = page.waitForResponse(isApi("GET", "/api/timetable"), { timeout: 15000 });
    await page.select('select[aria-label="ภาคเรียน"]', "2");
    const res = await wait;
    check("API", "หลังหมดอายุ ใช้งานต่อได้ 401", res.status() === 401, res.status());
    await waitForPath(page, "/login");
    await sleep(500);
    checkCleared(await clientState(page), A2, { banner: true });
    check("DB", "ตารางเรียนใน DB ยังเป็น MA211, CS111 ตามที่ทำล่าสุด", coursesInDb(dbSnapshot([A2.id]), A2.id).join(",") === "MA211,CS111", coursesInDb(dbSnapshot([A2.id]), A2.id));
    await shot(page, "ST-19");
  }

  // เก็บ PREP ไว้ในรายงานเฉพาะเมื่อเตรียมไม่ผ่าน
  const prep = results.findIndex((r) => r.id === "PREP");
  if (results[prep].checks.every((c) => c.pass)) results.splice(prep, 1);
}

// ---------------------------------------------------------------- รายงาน

function writeReport(startedAt) {
  const lines = [
    "# ผลรัน System Test US4 ด้วย Puppeteer",
    "",
    `- วันที่รัน: ${startedAt.toISOString()}`,
    `- หน้าเว็บ: ${WEB} · API: ${API}`,
    `- Flow 1 (Logout) ใช้ token อายุจริง 3 ชั่วโมง · Flow 2 (Session หมดอายุ) ใช้ token อายุ ${SHORT_JWT_MS / 1000} วินาที (compose.short-jwt.yaml)`,
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
      lines.push(`| ${c.layer} | ${c.description.replaceAll("|", "\\|")} | ${c.pass ? "✔" : "✘"} | ${c.pass ? "" : `\`${JSON.stringify(c.actual)?.replaceAll("|", "\\|").slice(0, 300)}\``} |`);
    }
    if (r.notes.length) lines.push("", ...r.notes.map((n) => `- ${n}`));
    if (r.error) lines.push("", `**Error:** \`${r.error}\``);
    lines.push("");
  }
  writeFileSync(join(OUT_DIR, "US4-T19-puppeteer-result.md"), lines.join("\n"), "utf8");
  writeFileSync(join(EVIDENCE_DIR, "run-evidence.json"), JSON.stringify({ results, evidence }, null, 2).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, (t) => `<JWT …${t.slice(-8)}>`), "utf8");
}

async function main() {
  mkdirSync(SHOT_DIR, { recursive: true });
  mkdirSync(EVIDENCE_DIR, { recursive: true });
  sql(`DELETE FROM login_attempt WHERE username IN (N'${A.id}', N'${A2.id}')`);
  const startedAt = new Date();
  browser = await puppeteer.launch({ headless: HEADLESS });
  try {
    if (PHASE !== "expiry") {
      for (const [id, title, run] of logoutCases) {
        startCase(id, title);
        try {
          await run();
        } catch (error) {
          current.error = error.message.split("\n")[0];
          console.log(`  ✘ error: ${current.error}`);
        }
      }
    }
    if (PHASE !== "logout") {
      await useShortJwt();
      try {
        await runExpiryFlow();
      } catch (error) {
        current.error = error.message.split("\n")[0];
        console.log(`  ✘ error: ${current.error}`);
      } finally {
        await useNormalJwt();
        await resetTimetable(A.id, [SEC.CS180, SEC.MA211]);
      }
    }
  } finally {
    await browser.close();
  }
  writeReport(startedAt);

  const failed = results.filter((r) => r.error || r.checks.some((c) => !c.pass));
  console.log(`\nสรุป: ผ่าน ${results.length - failed.length}/${results.length} case${failed.length ? ` ไม่ผ่าน: ${failed.map((r) => r.id).join(", ")}` : ""}`);
  console.log("รายงาน: US4-T19-puppeteer-result.md, ภาพหน้าจอ: screenshots/, หลักฐาน: evidence/run-evidence.json");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
