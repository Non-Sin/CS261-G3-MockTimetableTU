# US4-T20 สคริปต์รัน UAT

สคริปต์ puppeteer ที่ทำตามขั้นใน [US4-T16](../../US4-T16-uat-test-cases.md) ครบ 3 เคส เก็บภาพหน้าจอทุกขั้นไว้ที่ `../evidence/` และสรุปผลเป็น `uat-results.json`

## เตรียมระบบ

1. ใน `.env` ที่ root ตั้ง `SPRING_PROFILES_ACTIVE=stub-tu` (ใช้บัญชีทดสอบ `6609000000` / `Passw0rd!`)
2. `docker compose up -d --build` แล้วเปิด http://localhost:3000 ได้

## รัน

```bash
cd .doc/US4/T20/uat
npm install
node run-uat.mjs              # ครบ 3 เคส ใช้เวลาราว 16 นาที (TC3 รอ 15 นาทีจริง)
CASES=1,2 node run-uat.mjs    # เฉพาะ TC1, TC2 (ไม่ถึง 1 นาที)
```

PowerShell: `$env:CASES="1,2"; node run-uat.mjs`

| ตัวแปร | ค่าเริ่มต้น | ใช้ทำอะไร |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | URL ของ frontend |
| `UAT_USERNAME` / `UAT_PASSWORD` | `6609000000` / `Passw0rd!` | บัญชีทดสอบ |
| `CASES` | `1,2,3` | เลือกเคสที่จะรัน |
| `INACTIVITY_TIMEOUT_MS` | `900000` (15 นาที) | ต้องตรงกับค่าที่ frontend ใช้จริง |
| `BROWSER` | `chrome` | `firefox` ใช้ Firefox (ติดตั้งก่อนด้วย `npx puppeteer browsers install firefox`) ไฟล์หลักฐานจะขึ้นต้นด้วย `firefox-` |
| `HEADLESS` | `true` | `false` เปิดหน้าต่าง browser ให้เห็น (ระหว่าง TC3 ห้ามขยับเมาส์บนหน้าต่างนั้น) |

## สิ่งที่สคริปต์ทำ

| เคส | ขั้นตอน | ภาพหลักฐาน |
| --- | --- | --- |
| UAT-US4-01 | Login → เปิดเมนูบัญชี → กด "ออกจากระบบ" → ตรวจว่าอยู่ `/login`, token ถูกล้าง, ใช้เวลาไม่เกิน 3 วินาที | `uat01-*.png` |
| UAT-US4-02 | Login → เพิ่ม CS180 820001 ผ่าน API (409 = มีอยู่แล้ว) → เปิดหน้าตาราง → Logout → กด Back → ตรวจว่ากลับหน้า Login และไม่เห็น CS180 / รหัสนักศึกษา → พิมพ์ `/` และ `/dashboard` ตรง ๆ | `uat02-*.png` |
| UAT-US4-03 | Login → ไม่ส่ง input ใด ๆ → ตรวจว่าก่อนครบเวลายังอยู่ในระบบ → รอจนถูกพากลับ `/login` และเวลาที่ผ่านไป ≥ timeout → กด Back แล้วไม่กลับเข้าระบบ | `uat03-*.png` |

หมายเหตุ

- Login และ Logout ใช้ `router.replace` จึงไม่มีหน้าตารางค้างใน history ถ้ากด Back ทันที browser จะออกจากเว็บไป ใน TC2 สคริปต์จึงเปิดหน้าตารางซ้ำทาง `/dashboard` ก่อน Logout ให้ Back กลับไปหน้าตารางได้จริง ซึ่งเป็นกรณีที่ต้องทดสอบ
- TC2 เช็กเพิ่มว่า token เดิมที่คัดลอกไว้ก่อน Logout ยังเรียก API ได้หรือไม่ ผลนี้บันทึกใน notes ไม่นับเป็น Pass/Fail เพราะ T16 ทดสอบผ่านหน้าจอ
- แต่ละครั้งที่รันจะเขียนทับภาพและ `uat-results.json` เดิม
