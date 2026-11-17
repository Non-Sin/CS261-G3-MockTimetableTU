# US6-T17 — ร่างการ์ด fix สำหรับผลที่ไม่ผ่าน

ทั้ง 3 ใบเป็น **ร่างพร้อมนำไปสร้างบนบอร์ด** ผู้ใช้เลือกให้เก็บไว้ในรายงานก่อน ยังไม่มี external card URL และยังไม่ได้ส่งข้อความแจ้งผู้พัฒนา ไม่แก้บั๊กใน branch ทดสอบนี้

Owner ที่เสนอ: **sitch28-nin / เจ้าของ US6-T07** อ้างอิง [PR #112](https://github.com/Non-Sin/CS261-G3-MockTimetableTU/pull/112) ผู้ตรวจสเปกควรช่วยยืนยันความต่างที่เป็น UX/ข้อความ

Source ที่ทดสอบ: `79df2b8ed551d6241d3da7572d2138eb79b48a91`; ระบบ Docker แยก profile `stub-tu`, ปี/ภาค 2568/1; หลักฐานและ request/status ดู [รายงาน](./US6-T17-Integration-Test-Result.md)

## FIX-US6-T17-01 — เพิ่มวิชาเกินหน่วยกิตไม่ได้รับข้อความอธิบายตาม T13

- Label: `Maintenance`
- Priority: **P2**
- Owner: `sitch28-nin` (US6-T07)
- เคสที่ไม่ผ่าน: **IT-UI-API-US6-26**
- จุดที่เกี่ยวข้อง: `frontend/features/electives/components/ElectiveDetailModal.tsx` บรรทัด 119–129 (`creditLimitExceeded` เป็นส่วนหนึ่งของ `cannotAdd`)

ขั้นตอนทำซ้ำ:

1. จัดตาราง 2568/1 เป็น T-FULL: TU100, CS100, CS101, CS102, ST216, EL105 และ TU107 รวม 21 หน่วยกิต
2. เปิดเมนูวิชาเสรี แล้วเปิด FR205 ซึ่งมี 3 หน่วยกิต
3. Sec 260001 ถูกเลือกอัตโนมัติ ตรวจปุ่ม “+ เพิ่มลงตาราง” และ Network

Expected ตาม T13 IT-26 และ T05 ตาราง response ของ POST: ปุ่มยังกดได้ ส่ง POST แล้ว API ตอบ 409 `CREDIT_LIMIT_EXCEEDED`; modal คงอยู่และแสดง detail ว่าเพิ่มแล้วจะเป็น 24 เกินกำหนด 22 หน่วยกิต ตารางเดิมไม่เปลี่ยน

Actual: ปุ่มถูก disabled ตั้งแต่ก่อนส่งคำขอ ไม่มี POST จาก UI และไม่มีข้อความบอกสาเหตุหน่วยกิตเกิน จึงตรวจ flow 409 ผ่าน UI ตาม T13 ไม่ได้ การยิง API เสริมบน fixture เดียวกันตอบ 409 พร้อม `currentCredits=21`, `courseCredits=3`, `maxCredits=22` ถูกต้อง จัดเป็นประเด็น UI ไม่ใช่ backend

หลักฐาน:

- [DOM ปุ่ม disabled และไม่มีข้อความ error](./evidence/26-credit-limit-blocked.ax.txt)
- [Network](./evidence/network.jsonl): `caseId=26` ไม่มี POST; `caseId=26-api-supplement` มี POST 409 และรายละเอียดจริง

Retest: IT-26 ผ่านครบ request/response/UI และตารางยังมี 7 วิชา 21 หน่วยกิต พร้อมตรวจว่าเคสหน่วยกิตไม่เกินยังเพิ่มได้

## FIX-US6-T17-02 — Sec อีกกลุ่มถูกปิดทั้งที่ T13 ระบุว่ายังเลือกได้

- Label: `Maintenance`
- Priority: **P3 — ผลต่างจากสเปก; การป้องกันเพิ่มซ้ำยังทำงาน**
- Owner: `sitch28-nin` (US6-T07) + ผู้ดูแล T13 เพื่อยืนยัน UX
- เคสที่ไม่ผ่าน: **IT-UI-API-US6-22**
- จุดที่เกี่ยวข้อง: `ElectiveDetailModal.tsx` บรรทัด 258–277 (`alreadyAdded` ปิด radio ทุก Sec และล้าง checked)

ขั้นตอนทำซ้ำ:

1. ตารางมี FR205 Sec 260001 แล้ว
2. เปิดรายละเอียด FR205 และตรวจ API flags ของทั้งสอง Sec
3. ลองเลือก Sec 260002 ซึ่งเป็นภาค 1 เช่นกัน

Expected ตาม T13 IT-22: Sec 260001 แสดง “เพิ่มแล้ว”; แม้จะเลือก Sec 260002 ได้ ปุ่มเพิ่มต้อง disabled และไม่ส่ง POST; conflictWith ไม่รวม FR205 เอง

Actual: ทั้ง Sec 260001 และ 260002 ถูก disabled จึงเลือกอีกกลุ่มไม่ได้ แม้ `selectable=true` และ `inTimetable=false` ของ Sec 260002 ส่วนปุ่มเพิ่มถูกปิดและไม่มี POST ซ้ำถูกต้อง

หลักฐาน: [DOM](./evidence/22-disabled-alternative.ax.txt), [ภาพ](./evidence/22-disabled-alternative.jpg), Network `caseId=22` และ [API readback แยกบน fixture T-FR205](./evidence/22-api-readback.json)

Retest: ให้เจ้าของ UI/สเปกยืนยันว่าจะปรับการเลือก Sec ให้ตาม T13 หรือแก้ข้อตกลง UX ผ่าน review อย่างชัดเจน แล้วทดสอบ IT-22 ซ้ำ การเพิ่มวิชาเดิมคนละ Sec ต้องยังถูกป้องกัน

## FIX-US6-T17-03 — ข้อความ error ไม่ตรงข้อตกลงทีมใน T13

- Label: `Maintenance`
- Priority: **P3 — ข้อความไม่ตรง; error handling และ recovery ยังทำงาน**
- Owner: `sitch28-nin` (US6-T07)
- เคสที่ไม่ผ่าน: **IT-UI-API-US6-33 และ 36**
- จุดที่เกี่ยวข้อง: `ElectiveDetailModal.tsx:89` และ `ElectivesPage.tsx:156`

Expected ตาม T13 หัวข้อ 6 ข้อ 3: ทั้งกรณีโหลดรายละเอียดได้ 404 และเครือข่ายล่ม แสดง “ไม่สามารถโหลดข้อมูลวิชาได้ กรุณาลองใหม่อีกครั้ง”

วิธีทำซ้ำ IT-33:

1. โหลดรายการที่มี PY250
2. สำรอง info/tags/reviews แล้วลบ elective_info ของ PY250 เฉพาะฐานทดสอบ
3. กดอ่านรีวิว PY250 เพื่อให้ backend ตอบ 404 จริง
4. คืนข้อมูลหลังทดสอบ

Actual IT-33: แสดง **“ไม่พบรายละเอียดวิชาเสรีนี้”** modal ยังปิดได้ หน้าไม่ crash

วิธีทำซ้ำ IT-36: ตัดการเชื่อมต่อเฉพาะ GET /api/electives แล้วกดค้นหา หลังจากนั้นคืนเครือข่ายและกดลองใหม่

Actual IT-36: แสดง **“โหลดวิชาเสรีแนะนำไม่สำเร็จ กรุณาลองใหม่”** ไม่มีการ์ดเก่าหรือ Empty State ปน และ retry หลังคืนเครือข่ายสำเร็จ

หลักฐาน: [404 DOM](./evidence/33-detail-404.ax.txt), [404 ภาพ](./evidence/33-detail-404.jpg), [network error DOM](./evidence/36-network-error.ax.txt), [network error ภาพ](./evidence/36-network-error.jpg), [recovery](./evidence/36-recovered.ax.txt)

Retest: ยืนยันข้อความตามข้อตกลงทีมแล้วรัน IT-33/36 ใหม่ โดยยังปิด modal ได้ ไม่แสดงข้อมูลเก่าปน error และ retry สำเร็จ
