// US3-T17: ภาพ dropdown ของ Navbar หลัง login บัญชี A (หลักฐานเสริมของ IT-02) ใช้: node run-navbar-dialog.mjs <evidenceDir>
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage();
await p.goto("http://localhost:3000/login");
await p.fill("#login-username", "6609000001"); await p.fill("#login-password", "Passw0rd!");
await p.click("button[type=submit]");
await p.waitForSelector("text=6609000001", { timeout: 15000 });
await p.locator("[aria-label='ข้อมูลนักศึกษา'] button").first().click();
await p.waitForTimeout(500);
console.log((await p.locator("[role=dialog]").innerText()).replace(/\s+/g, " "));
await p.screenshot({ path: process.argv[2] + "/it02-navbar-dialog.png" });
await b.close();
