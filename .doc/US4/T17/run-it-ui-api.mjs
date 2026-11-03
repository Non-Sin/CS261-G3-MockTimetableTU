// US4-T17 runner: รัน Integration Test UI ↔ API (Logout) ตาม US4-T13 บน Edge (playwright-core channel msedge)
// ใช้: PLAYWRIGHT_CORE=<path ไปที่ node_modules/playwright-core> JWT_SECRET=<ค่าใน .env> node run-it-ui-api.mjs <evidenceDir>
// ต้องเปิดระบบก่อนด้วย docker compose up -d --build และ .env มี SPRING_PROFILES_ACTIVE=stub-tu
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const pwPath = process.env.PLAYWRIGHT_CORE;
const { chromium } = await import(pwPath ? pathToFileURL(path.join(pwPath, "index.mjs")).href : "playwright-core");

const [, , EVIDENCE = "./evidence"] = process.argv;
const BASE = "http://localhost:3000";
const USER = "6609000001"; // บัญชี A ของ StubTuApiClient (Somchai Jaidee)
const PW = "Passw0rd!";
const TOKEN_KEY = "mocktimetable.auth.token";
const EXPIRED_KEY = "mocktimetable.auth.expired";
const EXPIRED_MSG = "เซสชันของคุณหมดอายุแล้ว";
fs.mkdirSync(EVIDENCE, { recursive: true });

const results = [];
const consoleErrors = [];
const record = (id, pass, actual, shots = [], extra = {}) => {
  results.push({ id, pass, actual, shots, ...extra });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${actual}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "th-TH" });
  const page = await context.newPage();
  const log = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  // บันทึก request ทันทีที่ส่ง (sync) แล้วเติม status/body เมื่อได้ response เพราะหน้าอาจเปลี่ยน route ก่อน
  const byReq = new Map();
  page.on("request", (req) => {
    const p = new URL(req.url()).pathname;
    if (!p.startsWith("/api/")) return;
    const entry = { method: req.method(), path: p, url: req.url(), headers: req.headers(), postData: req.postData() };
    byReq.set(req, entry);
    log.push(entry);
  });
  page.on("requestfailed", (req) => {
    const entry = byReq.get(req);
    if (entry) entry.failed = req.failure()?.errorText;
  });
  page.on("response", async (res) => {
    const entry = byReq.get(res.request());
    if (!entry) return;
    entry.status = res.status();
    try { entry.headers = await res.request().allHeaders(); } catch { /* ใช้ headers เดิม */ }
    try { entry.body = await res.text(); } catch { entry.body = ""; }
  });
  return { context, page, log };
}

const calls = (log, p) => log.filter((e) => e.path === p);
const storage = (page) => page.evaluate(([t, e]) => ({
  sessionToken: sessionStorage.getItem(t), localToken: localStorage.getItem(t),
  sessionExpired: sessionStorage.getItem(e), localExpired: localStorage.getItem(e),
}), [TOKEN_KEY, EXPIRED_KEY]);
const shot = async (page, name) => { const f = `${name}.png`; await page.screenshot({ path: path.join(EVIDENCE, f), fullPage: true }); return f; };
const bodyText = (page) => page.locator("body").innerText();
const pathname = (page) => new URL(page.url()).pathname;
const navbarButton = (page) => page.locator("[aria-label='ข้อมูลนักศึกษา'] > button").first();
const logoutButton = (page) => page.locator("[role=dialog][aria-label='เมนูบัญชีผู้ใช้'] button");

// login ผ่านหน้าเว็บ แล้วรอให้หน้าแรกโหลดข้อมูลผู้ใช้ (GET /api/users/me) เสร็จ
async function loginViaUi() {
  const ctx = await newPage();
  const { page } = ctx;
  await page.goto(`${BASE}/login`);
  await page.fill("#login-username", USER);
  await page.fill("#login-password", PW);
  await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/users/me", { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await navbarButton(page).filter({ hasText: USER }).waitFor({ timeout: 10000 });
  const token = (await storage(page)).sessionToken;
  return { ...ctx, token };
}

// เปิดเมนูบัญชีแล้วกด "ออกจากระบบ" รอจนถึงหน้า login
async function clickLogout(page) {
  await navbarButton(page).click();
  await logoutButton(page).waitFor({ state: "visible" });
  await logoutButton(page).click();
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 15000 });
  await page.waitForTimeout(500);
}

// fetch จากในหน้าเว็บ ตามที่แอปทำ: แนบ Authorization เฉพาะเมื่อมี token ใน session
const fetchMeLikeApp = (page) => page.evaluate(async (key) => {
  const token = sessionStorage.getItem(key) ?? localStorage.getItem(key);
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch("/api/users/me", { headers });
  return { status: r.status, sentAuth: Boolean(token), body: await r.text() };
}, TOKEN_KEY);

// ออก JWT ที่หมดอายุแล้ว โดยใช้ secret และรูปแบบเดียวกับ JwtService (HS256, sub, iat, exp)
function expiredJwt(studentId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("ต้องตั้ง JWT_SECRET ให้ตรงกับ .env");
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "HS256" })}.${b64({ sub: studentId, iat: now - 7200, exp: now - 3600 })}`;
  const sig = crypto.createHmac("sha256", Buffer.from(secret, "utf8")).update(unsigned).digest("base64url");
  return `${unsigned}.${sig}`;
}

// ---------- IT-01 ถึง IT-09: logout ปกติ ----------
{
  const { page, log, context, token } = await loginViaUi();

  // IT-06: ก่อน logout แอปเรียก users/me ด้วย token และได้ 200
  const meBefore = calls(log, "/api/users/me").at(-1);
  const meBeforeBody = JSON.parse(meBefore?.body || "{}");
  const sBefore = await shot(page, "it06-before-logout");
  record("IT-06", meBefore?.status === 200 && meBefore.headers.authorization === `Bearer ${token}` && meBeforeBody.studentId === USER,
    `หลัง login แอปส่ง GET /api/users/me พร้อม Bearer <token> → ${meBefore?.status} ${meBefore?.body} · Navbar แสดง "${(await navbarButton(page).innerText()).replace(/\s+/g, " ").trim()}"`, [sBefore]);

  await navbarButton(page).click();
  await logoutButton(page).waitFor({ state: "visible" });
  const sMenu = await shot(page, "it01-account-menu");
  const before = log.length;
  await logoutButton(page).click();
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 15000 });
  await page.waitForTimeout(800);
  const logoutCalls = calls(log.slice(before), "/api/auth/logout");
  const lo = logoutCalls[0];
  const sAfter = await shot(page, "it04-after-logout");
  const st = await storage(page);
  const text = await bodyText(page);

  // IT-01
  record("IT-01", logoutCalls.length === 1 && lo.method === "POST" && lo.headers.authorization === `Bearer ${token}` && !lo.postData,
    `กด "ออกจากระบบ" → ส่ง ${lo?.method} ${lo?.path} ${logoutCalls.length} ครั้ง · Authorization = Bearer <token ที่ได้จาก login>: ${lo?.headers.authorization === `Bearer ${token}`} · body ${lo?.postData ? JSON.stringify(lo.postData) : "ไม่มี"}`, [sMenu]);
  // IT-02
  record("IT-02", lo?.status === 204 && lo.body === "",
    `API ตอบ ${lo?.status} · response body ${lo?.body === "" ? "ว่าง" : JSON.stringify(lo?.body)}`, [sAfter]);
  // IT-03
  const cleared = !st.sessionToken && !st.localToken && !st.sessionExpired && !st.localExpired;
  record("IT-03", cleared,
    `หลัง 204: sessionStorage/localStorage ไม่มี "${TOKEN_KEY}" (${!st.sessionToken && !st.localToken}) และไม่มี "${EXPIRED_KEY}" (${!st.sessionExpired && !st.localExpired})`, [sAfter], { storage: st });
  // IT-04
  const noOldUser = !text.includes(USER) && !text.includes("Somchai") && !text.includes("สมชาย");
  const noExpiredBanner = !text.includes(EXPIRED_MSG);
  record("IT-04", pathname(page) === "/login" && noOldUser && noExpiredBanner,
    `URL ${pathname(page)} · หน้าจอไม่มีรหัส/ชื่อผู้ใช้เดิม ${noOldUser} · ไม่มีข้อความเซสชันหมดอายุ ${noExpiredBanner}`, [sAfter]);
  // IT-05: request ไปที่ path เดียวกับที่ apiFetch() สร้าง (same-origin /api/* ผ่าน rewrite) และไม่มี request อื่นแทรก
  const sameOrigin = lo && new URL(lo.url).origin === BASE;
  record("IT-05", Boolean(sameOrigin && logoutCalls.length === 1),
    `request ไปที่ ${lo?.url} (same-origin /api/* แบบที่ apiFetch() ใช้) · ใช้ header Authorization ที่ authApi.logout() ส่งมา · เส้นทางโค้ด UserNavbar → useLogout → authApi.logout() → apiFetch() ดูหมายเหตุในเอกสารผล`, [sMenu]);

  // IT-07: เรียกผ่านแอปหลัง logout ไม่มี token จึงไม่ส่ง Authorization
  const meApp = await fetchMeLikeApp(page);
  record("IT-07", meApp.status === 401 && !meApp.sentAuth,
    `หลัง logout เรียก GET /api/users/me แบบแอป: ส่ง Authorization ${meApp.sentAuth ? "มี" : "ไม่มี"} → ${meApp.status} ${meApp.body || "(body ว่าง)"}`);

  // IT-08: token เดิมยังใช้ได้ (stateless JWT)
  const meOld = await context.request.get(`${BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
  const meOldBody = await meOld.text();
  record("IT-08", meOld.status() === 200 && JSON.parse(meOldBody || "{}").studentId === USER,
    `ใช้ token เดิมเรียก GET /api/users/me โดยตรง → ${meOld.status()} ${meOldBody} (ตามข้อจำกัด stateless JWT)`);

  // IT-09: เข้าหน้าที่ต้อง login และกด back หลัง logout
  const nBefore = log.length;
  await page.goto(`${BASE}/`);
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(800);
  const afterGoto = pathname(page);
  const textGoto = await bodyText(page);
  const sGoto = await shot(page, "it09-open-home-after-logout");
  await page.goBack().catch(() => {});
  await page.waitForTimeout(1200);
  const afterBack = pathname(page);
  const textBack = await bodyText(page);
  const sBack = await shot(page, "it09-back-after-logout");
  const meAfter = calls(log.slice(nBefore), "/api/users/me");
  const clean = (t) => !t.includes(USER) && !t.includes("Somchai") && !t.includes("สมชาย");
  record("IT-09", afterGoto === "/login" && clean(textGoto) && clean(textBack) && afterBack !== "/" ,
    `เปิด / → ${afterGoto} · กด back → ${afterBack} · ไม่แสดงข้อมูลผู้ใช้เดิม ${clean(textGoto) && clean(textBack)} · แอปเรียก users/me ${meAfter.length} ครั้ง${meAfter.length ? ` (${meAfter.map((m) => m.status).join(",")})` : " (ไม่มี token จึงพากลับหน้า login ก่อนเรียก API)"} · ผลจาก API เมื่อไม่มี token ดู IT-07 (401)`, [sGoto, sBack]);
  await context.close();
}

// ---------- IT-10: Logout API ตอบ 500 ----------
async function logoutWithFailure(id, mode) {
  const { page, log, context } = await loginViaUi();
  let routed = 0;
  await page.route("**/api/auth/logout", (route) => {
    routed++;
    return mode === "500"
      ? route.fulfill({ status: 500, contentType: "application/problem+json",
        body: JSON.stringify({ type: "about:blank", title: "Internal Server Error", status: 500, detail: "simulated" }) })
      : route.abort("internetdisconnected");
  });
  await navbarButton(page).click();
  await logoutButton(page).waitFor({ state: "visible" });
  const before = log.length;
  await logoutButton(page).click();
  const reachedLogin = await page.waitForURL((u) => u.pathname === "/login", { timeout: 15000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(800);
  const st = await storage(page);
  const text = await bodyText(page);
  const stuck = text.includes("กำลังออกจากระบบ");
  const s = await shot(page, `it${id.slice(3)}-logout-${mode === "500" ? "500" : "network-error"}`);
  const lo = calls(log.slice(before), "/api/auth/logout");
  const cleared = !st.sessionToken && !st.localToken;
  const pageErrors = consoleErrors.filter((e) => /Unhandled|TypeError/.test(e)).length;
  const desc = mode === "500" ? `API (mock) ตอบ ${lo[0]?.status}` : `request ล้มเหลว (${lo[0]?.failed ?? "ไม่มี response"})`;
  record(id, routed === 1 && reachedLogin && cleared && !stuck && !text.includes(USER),
    `${desc} · ปุ่มไม่ค้าง "กำลังออกจากระบบ…" ${!stuck} · ล้าง token ${cleared} · URL ${pathname(page)} · ไม่แสดงข้อมูลผู้ใช้เดิม ${!text.includes(USER)} · ไม่แสดงกล่อง error (ตาม US4-T06 ล้าง session เสมอ) · unhandled error ใน console ${pageErrors}`, [s]);
  await context.close();
}
await logoutWithFailure("IT-10", "500");
await logoutWithFailure("IT-11", "network");

// ---------- IT-12: Session หมดอายุระหว่างใช้งาน ----------
{
  const { page, log, context } = await loginViaUi();
  const expired = expiredJwt(USER);
  // ตรวจว่า backend ปฏิเสธ token หมดอายุจริง
  const direct = await context.request.get(`${BASE}/api/users/me`, { headers: { Authorization: `Bearer ${expired}` } });
  await page.evaluate(([k, t]) => sessionStorage.setItem(k, t), [TOKEN_KEY, expired]);
  const before = log.length;
  await page.reload();
  await page.waitForURL((u) => u.pathname === "/login", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const me = calls(log.slice(before), "/api/users/me");
  const st = await storage(page);
  const text = await bodyText(page);
  const s = await shot(page, "it12-session-expired");
  record("IT-12", direct.status() === 401 && me.some((m) => m.status === 401 && m.headers.authorization === `Bearer ${expired}`)
    && pathname(page) === "/login" && text.includes(EXPIRED_MSG) && !st.sessionToken && !text.includes(USER),
    `token หมดอายุ (exp ย้อนหลัง 1 ชม. เซ็นด้วย secret เดียวกับ backend) · เรียกตรง → ${direct.status()} · แอปเรียก GET /api/users/me → ${me.map((m) => m.status).join(",")} · URL ${pathname(page)} · แสดง "${EXPIRED_MSG}…" ${text.includes(EXPIRED_MSG)} · ล้าง token ${!st.sessionToken}`, [s]);
  await context.close();
}

await browser.close();
const summary = { ranAt: new Date().toISOString(), pass: results.filter((r) => r.pass).length, fail: results.filter((r) => !r.pass).length, results, consoleErrors };
fs.writeFileSync(path.join(EVIDENCE, "results.json"), JSON.stringify(summary, null, 2));
console.log(`\n${summary.pass} pass / ${summary.fail} fail`);
