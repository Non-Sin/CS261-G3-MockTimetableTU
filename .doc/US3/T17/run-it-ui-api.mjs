// US3-T17 runner: รัน Integration Test UI ↔ API ตาม US3-T13 บน Edge (playwright-core channel msedge)
// ใช้: node run.mjs <phase> <evidenceDir>   phase = main | unlock
import { chromium } from "playwright-core";
import { execSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const [, , PHASE = "main", EVIDENCE = "./evidence"] = process.argv;
const BASE = "http://localhost:3000";
const API = "http://localhost:8080";
const PW = "Passw0rd!";
const U = { A: "6609000001", A2: "6609000000", B: "6609000002", B2: "6609650001", C: "6609000003",
  C2: "6609000007", D: "6609000004", E: "6609000099", F: "6609000008" };
fs.mkdirSync(EVIDENCE, { recursive: true });

const sql = (q) => execFileSync("docker", ["exec", "sqlserver", "bash", "-c",
  `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -d appdb -h -1 -W -Q "SET NOCOUNT ON; ${q}"`]).toString().trim();
const resetAttempts = () => sql("DELETE FROM login_attempt;");
const failedCount = (u) => sql(`SELECT ISNULL((SELECT failed_attempts FROM login_attempt WHERE username='${u}'),0);`);

const results = [];
const allLoginRequests = [];
const consoleErrors = [];
const record = (id, pass, actual, shots = []) => {
  results.push({ id, pass, actual, shots });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${actual}`);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: "th-TH" });
  const page = await context.newPage();
  const log = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("response", async (res) => {
    const req = res.request();
    if (!new URL(req.url()).pathname.startsWith("/api/")) return;
    let body = null;
    try { body = await res.json(); } catch { /* no json */ }
    const entry = { method: req.method(), url: req.url(), headers: await req.allHeaders(), postData: req.postData(), status: res.status(), body };
    log.push(entry);
    if (new URL(req.url()).pathname === "/api/auth/login") allLoginRequests.push(entry);
  });
  return { context, page, log };
}

async function login(page, log, username, password) {
  if (!new URL(page.url() === "about:blank" ? BASE : page.url()).pathname.startsWith("/login")) {
    await page.goto(`${BASE}/login`);
  }
  await page.fill("#login-username", username);
  await page.fill("#login-password", password);
  const [res] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/auth/login"),
    page.click("button[type=submit]"),
  ]);
  await page.waitForTimeout(400);
  return log.filter((e) => new URL(e.url).pathname === "/api/auth/login").at(-1) ?? { status: res.status() };
}
const token = (page) => page.evaluate(() => sessionStorage.getItem("mocktimetable.auth.token") ?? localStorage.getItem("mocktimetable.auth.token"));
const alertText = async (page) => (await page.locator("form [role=alert]").allInnerTexts()).join(" | ");
const h1 = (page) => page.locator("h1").first().innerText();
const shot = async (page, name) => { const f = `${name}.png`; await page.screenshot({ path: path.join(EVIDENCE, f), fullPage: true }); return f; };
const meCalls = (log) => log.filter((e) => new URL(e.url).pathname === "/api/users/me");
const INVALID_MSG = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

async function freshLogin(username, password) {
  const ctx = await newPage();
  await ctx.page.goto(`${BASE}/login`);
  const res = await login(ctx.page, ctx.log, username, password);
  return { ...ctx, res };
}

async function runMain() {
  resetAttempts();

  // IT-01, IT-02
  {
    const { page, log, context, res } = await freshLogin(U.A, PW);
    const sent = JSON.parse(res.postData ?? "{}");
    await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
    const me = await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/users/me", { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1500);
    const tk = await token(page);
    const menu = await page.locator("[aria-current=page]").allInnerTexts();
    const s1 = await shot(page, "it01-02-after-login");
    const ok1 = res.status === 200 && typeof res.body?.token === "string" && res.body.token.length > 0
      && sent.username === U.A && sent.password === PW && new URL(page.url()).pathname === "/"
      && menu.some((t) => t.includes("จัดตารางเรียนจำลอง")) && !(await page.locator("form [role=alert]").count());
    record("IT-01", ok1, `ส่ง POST /api/auth/login {username:"${sent.username}", password:(ตรงที่กรอก ${sent.password === PW})} → ${res.status} token ยาว ${res.body?.token?.length ?? 0} ตัว · URL ${new URL(page.url()).pathname} · เมนูที่ถูกเลือก "${menu.join(",").replace(/\s+/g, " ").trim()}"`, [s1]);
    const meEntry = meCalls(log)[0];
    const navbar = (await page.locator("[aria-label='ข้อมูลนักศึกษา'] button").first().innerText()).replace(/\s+/g, " ").trim();
    const ok2 = !!meEntry && meEntry.headers.authorization === `Bearer ${res.body?.token}` && meEntry.status === 200
      && meEntry.body?.studentId === U.A && navbar.includes(U.A);
    const nameShown = navbar.includes("Somchai Jaidee"); // ทีมตัดสินใจให้ Navbar แสดงชื่ออังกฤษ (T13 หัวข้อ 4.1 ข้อ 6)
    record("IT-02", ok2 && nameShown, `GET /api/users/me Authorization = Bearer <token จาก IT-01>: ${meEntry?.headers.authorization === `Bearer ${res.body?.token}`} → ${meEntry?.status} ${JSON.stringify(meEntry?.body)} · Navbar แสดง "${navbar}" · token ใน sessionStorage ${tk ? "มี" : "ไม่มี"}${me ? "" : " (ไม่เห็น users/me)"}`, [s1]);
    await context.close();
  }

  // IT-03, IT-04
  {
    const a = await freshLogin(U.F, "NewPassw0rd!");
    await a.page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
    const s = await shot(a.page, "it03-new-password");
    record("IT-03", a.res.status === 200 && new URL(a.page.url()).pathname === "/", `บัญชี F รหัสใหม่ → ${a.res.status} · URL ${new URL(a.page.url()).pathname}`, [s]);
    await a.context.close();
    const b = await freshLogin(U.F, PW);
    const s2 = await shot(b.page, "it04-old-password");
    const tk = await token(b.page);
    const al = await alertText(b.page);
    record("IT-04", b.res.status === 401 && b.res.body?.code === "INVALID_CREDENTIALS" && al.includes(INVALID_MSG) && !tk,
      `บัญชี F รหัสเดิม → ${b.res.status} ${b.res.body?.code} · UI "${al}" · token ${tk ? "มี" : "ไม่มี"}`, [s2]);
    await b.context.close();
  }

  // IT-05, IT-06
  let invalidDetail;
  {
    resetAttempts();
    const { page, log, context, res } = await freshLogin(U.A, "wrong-pass");
    invalidDetail = res.body?.detail;
    const al = await alertText(page);
    const invalid = await page.locator("#login-username[aria-invalid=true], #login-password[aria-invalid=true]").count();
    const pwVal = await page.inputValue("#login-password");
    const tk = await token(page);
    await page.waitForTimeout(800);
    const s = await shot(page, "it05-wrong-password");
    const pdKeys = ["type", "title", "status", "detail", "instance"].filter((k) => k in (res.body ?? {}));
    record("IT-05", res.status === 401 && res.body?.code === "INVALID_CREDENTIALS" && al.includes("เข้าสู่ระบบไม่สำเร็จ") && al.includes(INVALID_MSG)
      && invalid === 2 && pwVal === "wrong-pass" && !tk && meCalls(log).length === 0,
      `→ ${res.status} ${res.body?.code} (ProblemDetail มี ${pdKeys.join(", ")}) · UI "${al}" · ขอบแดง ${invalid}/2 ช่อง · ช่องรหัสผ่านยังมีค่า ${pwVal === "wrong-pass"} · token ${tk ? "มี" : "ไม่มี"} · เรียก users/me ${meCalls(log).length} ครั้ง`, [s]);
    await context.close();
    const u = await freshLogin("6609999999", PW);
    const al2 = await alertText(u.page);
    record("IT-06", u.res.status === 401 && u.res.body?.code === "INVALID_CREDENTIALS" && u.res.body?.detail === invalidDetail && al2 === al,
      `Username ไม่มีในระบบ → ${u.res.status} ${u.res.body?.code} detail "${u.res.body?.detail}" (เหมือน IT-05: ${u.res.body?.detail === invalidDetail}) · UI เหมือน IT-05: ${al2 === al}`, [await shot(u.page, "it06-unknown-user")]);
    await u.context.close();
  }

  // IT-07
  {
    resetAttempts();
    const { page, log, context } = await newPage();
    await page.goto(`${BASE}/login`);
    const statuses = [];
    let allAlert = true;
    for (let i = 0; i < 4; i++) {
      const r = await login(page, log, U.A, `wrong-${i}`);
      statuses.push(r.status);
      if (!(await alertText(page)).includes(INVALID_MSG)) allAlert = false;
    }
    const s = await shot(page, "it07-four-wrong");
    record("IT-07", statuses.every((x) => x === 401) && allAlert, `4 ครั้ง → ${statuses.join(", ")} · กล่องรหัสผิดแสดงทุกครั้ง ${allAlert} · failed_attempts ใน DB = ${failedCount(U.A)}`, [s]);
    await context.close();
    resetAttempts();
  }

  // IT-08, IT-09, IT-10
  for (const [id, acc] of [["IT-08", U.B], ["IT-09", U.B2]]) {
    const { page, log, context, res } = await freshLogin(acc, PW);
    const heading = await h1(page);
    const tk = await token(page);
    await page.waitForTimeout(500);
    const s = await shot(page, `${id.toLowerCase().replace("-", "")}-not-cs`);
    const bodyText = await page.locator("section").first().innerText();
    record(id, res.status === 403 && res.body?.code === "NOT_CS_STUDENT" && heading.includes("ไม่สามารถเข้าใช้งานระบบได้") && bodyText.includes("ภาคปกติ") && !tk && meCalls(log).length === 0,
      `→ ${res.status} ${res.body?.code} · UI หัวข้อ "${heading}" · token ${tk ? "มี" : "ไม่มี"} · เรียก users/me ${meCalls(log).length} ครั้ง`, [s]);
    if (id === "IT-09") {
      await page.click("text=กลับสู่หน้าเข้าสู่ระบบ");
      const u = await page.inputValue("#login-username");
      const p = await page.inputValue("#login-password");
      const s2 = await shot(page, "it10-back-to-login");
      const r = await login(page, log, U.A, PW);
      await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
      record("IT-10", u === "" && p === "" && r.status === 200, `กลับมาฟอร์ม ช่อง username "${u}" password "${p}" · login ใหม่ด้วยบัญชี A → ${r.status} URL ${new URL(page.url()).pathname}`, [s2]);
    }
    await context.close();
  }

  // IT-11, IT-12, IT-13
  for (const [ids, acc] of [[["IT-11", "IT-12"], U.C], [["IT-13"], U.C2]]) {
    const { page, log, context, res } = await freshLogin(acc, PW);
    const al = await alertText(page);
    const invalid = await page.locator("#login-username[aria-invalid=true], #login-password[aria-invalid=true]").count();
    const denied = await page.locator("text=ไม่สามารถเข้าใช้งานระบบได้").count();
    const tk = await token(page);
    await page.waitForTimeout(500);
    const s = await shot(page, ids[0].toLowerCase().replace("-", "") + "-inactive");
    const uiSame = al.includes("เข้าสู่ระบบไม่สำเร็จ") && al.includes(INVALID_MSG) && invalid === 2 && denied === 0 && !tk && meCalls(log).length === 0;
    const uiDesc = `UI "${al}" · ขอบแดง ${invalid}/2 · หน้า Access Denied ${denied ? "แสดง" : "ไม่แสดง"} · token ${tk ? "มี" : "ไม่มี"} · users/me ${meCalls(log).length} ครั้ง`;
    if (ids[0] === "IT-11") {
      record("IT-11", res.status === 403 && res.body?.code === "ACCOUNT_INACTIVE" && !res.body?.token, `→ ${res.status} ${res.body?.code} · ไม่มี token ใน response`, [s]);
      record("IT-12", uiSame, uiDesc, [s]);
    } else {
      record("IT-13", res.status === 403 && res.body?.code === "ACCOUNT_INACTIVE" && uiSame, `→ ${res.status} ${res.body?.code} · ${uiDesc}`, [s]);
    }
    await context.close();
  }

  // IT-14, IT-15, IT-18
  {
    resetAttempts();
    const { page, log, context } = await newPage();
    await page.goto(`${BASE}/login`);
    const st = [];
    let last;
    for (let i = 0; i < 5; i++) { last = await login(page, log, U.D, `wrong-${i}`); st.push(last.status); }
    await page.waitForTimeout(1200);
    const heading = await h1(page);
    const timer = (await page.locator("[role=timer]").innerText()).replace(/\s+/g, " ");
    const s = await shot(page, "it14-locked");
    record("IT-14", st.slice(0, 4).every((x) => x === 401) && last.status === 429 && last.body?.code === "ACCOUNT_LOCKED" && last.body?.retryAfterSeconds === 900 && heading.includes("ระงับการเข้าสู่ระบบชั่วคราว") && /1[45]/.test(timer),
      `ครั้งที่ 1–5 → ${st.join(", ")} · ครั้งที่ 5 ${last.body?.code} retryAfterSeconds ${last.body?.retryAfterSeconds} · UI "${heading}" ตัวนับ "${timer}"`, [s]);
    await context.close();

    await new Promise((r) => setTimeout(r, 5000));
    const b = await freshLogin(U.D, PW);
    await b.page.waitForTimeout(1200);
    const timer2 = (await b.page.locator("[role=timer]").innerText().catch(() => "")).replace(/\s+/g, " ");
    const s2 = await shot(b.page, "it15-locked-correct-password");
    record("IT-15", b.res.status === 429 && b.res.body?.code === "ACCOUNT_LOCKED" && b.res.body?.retryAfterSeconds < 900,
      `รหัสถูกระหว่างถูกระงับ → ${b.res.status} ${b.res.body?.code} retryAfterSeconds ${b.res.body?.retryAfterSeconds} · ตัวนับ "${timer2}"`, [s2]);
    await b.context.close();

    // IT-22 ส่วน ACCOUNT_LOCKED (D ยังถูกระงับ)
    await it22("ACCOUNT_LOCKED", U.D, PW, async (page) => (await h1(page)).includes("ระงับการเข้าสู่ระบบชั่วคราว"));

    const c = await freshLogin(U.A2, PW);
    await c.page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
    record("IT-18", c.res.status === 200, `ระหว่าง D ถูกระงับ login A2 → ${c.res.status} URL ${new URL(c.page.url()).pathname}`, [await shot(c.page, "it18-other-user")]);
    await c.context.close();
  }

  // IT-17, IT-27
  for (const [id, acc, mid] of [["IT-17", U.D, 200], ["IT-27", U.C, 403]]) {
    resetAttempts();
    const { page, log, context } = await newPage();
    const st = [];
    for (let i = 0; i < 4; i++) { await page.goto(`${BASE}/login`); st.push((await login(page, log, acc, `wrong-${i}`)).status); }
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(`${BASE}/login`);
    const m = await login(page, log, acc, PW);
    const after = failedCount(acc);
    await page.evaluate(() => sessionStorage.clear());
    const st2 = [];
    for (let i = 0; i < 4; i++) { await page.goto(`${BASE}/login`); st2.push((await login(page, log, acc, `wrong-b${i}`)).status); }
    const s = await shot(page, `${id.toLowerCase().replace("-", "")}-reset-count`);
    record(id, st.every((x) => x === 401) && m.status === mid && after === "0" && st2.every((x) => x === 401),
      `ผิด 4 ครั้ง → ${st.join(", ")} · รหัสถูก → ${m.status} ${m.body?.code ?? ""} (failed_attempts หลังนั้น = ${after}) · ผิดอีก 4 ครั้ง → ${st2.join(", ")}`, [s]);
    await context.close();
  }
  resetAttempts();

  // IT-20
  {
    const direct = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: U.E, password: "" }) });
    const dBody = await direct.json();
    const blankUser = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "", password: PW }) });
    const bBody = await blankUser.json();
    const cnt = failedCount(U.E);
    // UI: ส่ง username ว่างไปถึง API จริงโดยแก้ body ระหว่างทาง (ข้ามการตรวจของฟอร์ม)
    const { page, log, context } = await newPage();
    await page.route("**/api/auth/login", (route) => route.continue({ postData: JSON.stringify({ username: "", password: PW }) }));
    await page.goto(`${BASE}/login`);
    const r = await login(page, log, U.A, PW);
    const al = await alertText(page);
    const s = await shot(page, "it20-blank-username");
    record("IT-20", blankUser.status === 400 && bBody.errors && direct.status === 400 && cnt === "0" && r.status === 400 && al.length > 0 && !al.includes(INVALID_MSG),
      `ยิงตรง username ว่าง → ${blankUser.status} errors ${JSON.stringify(bBody.errors)} · ยิงบัญชี E (ถ้ายิง TU จะได้ 503) password ว่าง → ${direct.status} แสดงว่าไม่ยิง TU · failed_attempts ของ E = ${cnt} · ผ่าน UI ได้ ${r.status} UI แสดง "${al}" ไม่ crash`, [s]);
    await context.close();
  }

  // IT-21
  {
    const { page, context, res } = await freshLogin(U.E, PW);
    const al = await alertText(page);
    const s = await shot(page, "it21-tu-unavailable");
    const cnt = failedCount(U.E);
    record("IT-21", res.status >= 500 && !al.includes(INVALID_MSG) && al.length > 0 && cnt === "0",
      `→ ${res.status} ${res.body?.code} · UI "${al}" (ไม่ใช่ข้อความรหัสผิด) · failed_attempts ของ E = ${cnt}`, [s]);
    await context.close();
  }

  // IT-22 (ส่วนที่เหลือ)
  resetAttempts();
  await it22("INVALID_CREDENTIALS", U.A, "wrong-pass", async (page) => (await alertText(page)).includes(INVALID_MSG));
  await it22("ACCOUNT_INACTIVE", U.C, PW, async (page) => (await alertText(page)).includes(INVALID_MSG));
  await it22("NOT_CS_STUDENT", U.B, PW, async (page) => (await h1(page)).includes("ไม่สามารถเข้าใช้งานระบบได้"));
  resetAttempts();
  const parts = results.filter((r) => r.id.startsWith("IT-22:"));
  results.splice(0, results.length, ...results.filter((r) => !r.id.startsWith("IT-22:")));
  record("IT-22", parts.length === 4 && parts.every((p) => p.pass), parts.map((p) => `${p.id.slice(6)}: ${p.actual}`).join(" · "), parts.flatMap((p) => p.shots));

  // IT-23
  {
    const cases = [];
    for (const [label, tk] of [["ไม่มี token", null], ["token ปลอม", "not.a.jwt"], ["token ถูกแก้ลายเซ็น", "TAMPER"]]) {
      const { page, log, context } = await newPage();
      let t = tk;
      if (tk === "TAMPER") {
        const r = await fetch(`${API}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: U.A, password: PW }) });
        const real = (await r.json()).token;
        t = real.slice(0, -4) + (real.slice(-4) === "AAAA" ? "BBBB" : "AAAA");
      }
      await page.goto(`${BASE}/login`);
      if (t) await page.evaluate((v) => sessionStorage.setItem("mocktimetable.auth.token", v), t);
      await page.goto(`${BASE}/`);
      await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);
      const me = meCalls(log)[0];
      const left = await token(page);
      const banner = await page.locator("[data-testid=session-expired-banner]").count();
      const ok = new URL(page.url()).pathname === "/login" && !left && (t ? me?.status === 401 : !me);
      cases.push({ ok, text: `${label}: users/me → ${me ? me.status : "ไม่เรียก"} · กลับหน้า ${new URL(page.url()).pathname} · token ${left ? "ยังอยู่" : "ถูกล้าง"} · banner เซสชันหมดอายุ ${banner ? "แสดง" : "ไม่แสดง"}`,
        shot: await shot(page, `it23-${["none", "fake", "tamper"][cases.length]}`) });
      await context.close();
    }
    record("IT-23", cases.every((c) => c.ok), cases.map((c) => c.text).join(" · "), cases.map((c) => c.shot));
  }

  // IT-24
  {
    const { page, log, context } = await newPage();
    await page.goto(`${BASE}/login`);
    await login(page, log, U.A, PW);
    await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/users/me", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);
    const nav1 = (await page.locator("[aria-label='ข้อมูลนักศึกษา'] button").first().innerText()).replace(/\s+/g, " ");
    await page.locator("[aria-label='ข้อมูลนักศึกษา'] button").first().click();
    await page.click("text=ออกจากระบบ");
    await page.waitForURL(/\/login/, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    await login(page, log, U.A2, PW);
    const me2 = await page.waitForResponse((r) => new URL(r.url()).pathname === "/api/users/me", { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1000);
    const nav2 = (await page.locator("[aria-label='ข้อมูลนักศึกษา'] button").first().innerText()).replace(/\s+/g, " ");
    const s = await shot(page, "it24-switch-account");
    record("IT-24", nav1.includes(U.A) && nav2.includes(U.A2) && !nav2.includes(U.A),
      `Navbar หลัง login A "${nav1.trim()}" · logout แล้ว login A2 Navbar "${nav2.trim()}"${me2 ? "" : " (ไม่เห็น users/me รอบสอง)"}`, [s]);
    await context.close();
  }

  // IT-25
  {
    const { page, log, context } = await newPage();
    await page.goto(`${BASE}/login`);
    execSync("docker stop backend");
    let r;
    try { r = await login(page, log, U.A, PW); } catch (e) { r = { status: "error " + e.message }; }
    await page.waitForTimeout(800);
    const al = await alertText(page);
    const enabled = await page.locator("button[type=submit]").isEnabled();
    const s = await shot(page, "it25-backend-down");
    execSync("docker start backend");
    record("IT-25", al.length > 0 && !al.includes(INVALID_MSG) && enabled, `ปิด backend แล้วกด login → ${r.status} · UI "${al}" · ปุ่มกดได้ ${enabled}`, [s]);
    await context.close();
    for (let i = 0; i < 60; i++) { try { const x = await fetch(`${API}/api/users/me`); if (x.status === 401) break; } catch { /* starting */ } await new Promise((res) => setTimeout(res, 2000)); }
  }

  // IT-26
  {
    const pre = await fetch(`${API}/api/auth/login`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
    const allow = pre.headers.get("access-control-allow-origin");
    const sameOrigin = allLoginRequests.every((e) => e.url.startsWith(BASE));
    const cors = consoleErrors.filter((t) => /CORS|Access-Control/i.test(t));
    record("IT-26", pre.status < 300 && allow === "http://localhost:3000" && cors.length === 0,
      `preflight OPTIONS จาก Origin http://localhost:3000 → ${pre.status} Access-Control-Allow-Origin "${allow}" · หน้าเว็บใน Docker เรียกผ่าน rewrite ของ Next.js (same origin) ทุก request: ${sameOrigin} · console มี CORS error ${cors.length} ครั้ง`);
  }

  // IT-19 (สรุปจาก login request ทั้งหมดของรอบนี้)
  {
    const bad = allLoginRequests.filter((e) => {
      const u = new URL(e.url);
      let keys = [];
      try { keys = Object.keys(JSON.parse(e.postData ?? "")).sort(); } catch { /* */ }
      return e.method !== "POST" || !(e.headers["content-type"] ?? "").includes("application/json") || u.search !== "" || keys.join() !== "password,username";
    });
    record("IT-19", allLoginRequests.length > 0 && bad.length === 0, `ตรวจ login request ${allLoginRequests.length} รายการ: ทุกรายการ POST, Content-Type application/json, body มีแค่ username/password, URL ไม่มี query string · ไม่ตรง ${bad.length} รายการ`);
  }
}

async function it22(code, username, password, check) {
  const { page, log, context } = await newPage();
  await page.route("**/api/auth/login", async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    body.detail = "ข้อความทดสอบ IT-22 ที่เปลี่ยนแล้ว";
    await route.fulfill({ response: res, json: body });
  });
  await page.goto(`${BASE}/login`);
  const r = await login(page, log, username, password);
  const ok = r.body?.code === code && (await check(page));
  record(`IT-22:${code}`, ok, `${r.status} ${r.body?.code} detail ถูกเปลี่ยน → UI ${ok ? "ยังแสดงหน้าถูก" : "แสดงผิด"}`, [await shot(page, `it22-${code.toLowerCase()}`)]);
  await context.close();
}

async function runUnlock() {
  resetAttempts();
  const { page, log, context } = await newPage();
  await page.goto(`${BASE}/login`);
  let last;
  for (let i = 0; i < 5; i++) last = await login(page, log, U.D, `wrong-${i}`);
  await page.waitForTimeout(1000);
  const timer = (await page.locator("[role=timer]").innerText()).replace(/\s+/g, " ");
  const s1 = await shot(page, "it16-1-locked-short");
  const secs = last.body?.retryAfterSeconds ?? 0;
  await page.waitForSelector("text=ปลดการระงับการเข้าสู่ระบบแล้ว", { timeout: (secs + 15) * 1000 }).catch(() => {});
  const heading = await h1(page);
  const s2 = await shot(page, "it16-2-unlocked");
  const r = await login(page, log, U.D, PW);
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
  const s3 = await shot(page, "it16-3-login-after-unlock");
  record("IT-16", last.status === 429 && heading.includes("ปลดการระงับการเข้าสู่ระบบแล้ว") && r.status === 200,
    `ครั้งที่ 5 → ${last.status} retryAfterSeconds ${secs} ตัวนับเริ่ม "${timer}" · ตัวนับถึง 0 → UI "${heading}" · login รหัสถูก → ${r.status} URL ${new URL(page.url()).pathname}`, [s1, s2, s3]);
  await context.close();
  resetAttempts();
}

try {
  if (PHASE === "unlock") await runUnlock(); else await runMain();
} finally {
  await browser.close();
  fs.writeFileSync(path.join(EVIDENCE, `results-${PHASE}.json`), JSON.stringify(results, null, 2));
}
