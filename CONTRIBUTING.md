# แนวทางการทำงานร่วมกัน (7 คน)

## TL;DR
```bash
git switch main && git pull
git switch -c feature/<รหัส task>-<ชื่อ task>
# ...ทำงาน และ commit...
git fetch origin && git rebase origin/main
git push -u origin HEAD
gh pr create --fill
```

## Git workflow

- `main` = โค้ดที่ทำงานได้เสมอ **ห้าม push ตรง** — ทุกอย่างเข้าผ่าน Pull Request
- 1 task = 1 branch แตกจาก `main` ล่าสุด
- ชื่อ branch: `<ประเภท>/<สิ่งที่ทำ>` เช่น `feature/login`, `fix/item-validation`, `docs/readme`
- ก่อนเปิด PR: `git pull origin main` (หรือ rebase) แล้วรันเทสต์/lint ให้ผ่าน
- PR ต้องมีเพื่อน review อย่างน้อย 1 คน แล้วค่อย merge (แนะนำ *Squash and merge*)
- ลบ branch หลัง merge

### Commit message

```
<ประเภท>:[รหัส task] <ชื่อ Task>

feat: เพิ่มหน้า login
fix: แก้ validation 
refactor / test / docs / chore: ...
```

## การเพิ่มฟีเจอร์ใหม่ (เช่น `order`)

**Backend** — สร้าง package ใหม่ `backend/src/main/java/th/ac/tu/cs261/group3/backend/order/`
ตามแบบ `item/`: `Order.java`, `OrderRepository`, `OrderService`, `OrderController`, `dto/`
พร้อมเทสต์ใน `backend/src/test/java/.../order/`

**Frontend** — สร้าง `frontend/features/order/` ที่มี `api.ts`, `types.ts`, `components/`
แล้วเพิ่ม route ใน `frontend/app/orders/page.tsx` (ไฟล์ใน `app/` ให้บางที่สุด แค่เรียก component)

**ไฟล์ที่ใช้ร่วมกัน** (`common/`, `config/`, `lib/`, `app/layout.tsx`, `compose.yaml`, `pom.xml`, `package.json`)
แก้ได้แต่ให้บอกในกลุ่มก่อน และแยกเป็น PR เล็ก ๆ เพื่อลด conflict

## Database migration (Flyway) — สำคัญมาก

- ห้าม **แก้** หรือ **ลบ** ไฟล์ migration ที่ merge เข้า `main` แล้ว → ถ้าต้องเปลี่ยน ให้สร้างไฟล์ใหม่
- ตั้งชื่อด้วย **วันเวลา** เพื่อไม่ให้เลข version ชนกันเมื่อหลายคนสร้างพร้อมกัน:
  `V<ปีเดือนวัน>_<ชั่วโมงนาที>__<คำอธิบาย>.sql` เช่น `V20261011_1430__create_orders_table.sql`
- ใช้ `NVARCHAR` สำหรับข้อความ (รองรับภาษาไทย)
- ถ้า DB ในเครื่องพังจาก migration ระหว่างพัฒนา: `docker compose down -v && docker compose up -d`

## Checklist ก่อนเปิด PR

- [ ] `cd backend && ./mvnw test` ผ่าน
- [ ] `cd frontend && npm run lint && npx tsc --noEmit` ผ่าน
- [ ] ไม่มีไฟล์ `.env`, `target/`, `.next/`, `node_modules/` ติดเข้าไป
- [ ] ถ้าเปลี่ยน API → อัปเดต `types.ts` ฝั่ง frontend และตาราง API ใน README
