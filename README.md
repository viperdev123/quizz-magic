# ลุ้นทายเลข เสกคำนาม

เครื่องมือในห้องเรียนภาษาไทยสำหรับนักเรียน ม.1: นักเรียนเปิดลิงก์ กรอกคำตอบแล้วส่งให้ครู ครูตรวจทีละคำ และนักเรียนกลับมาดูคะแนนได้ นักเรียน **ไม่มีบัญชี** ส่วนครู **มีบัญชี**

- **Frontend:** Vue 3 + Vite + TypeScript, Pinia, Vue Router, Tailwind CSS (ฟอนต์ Noto Sans Thai)
- **API สำหรับนักเรียน:** Cloudflare Pages Functions (`/functions`) → `POST /api/submit`, `POST /api/score`
- **ฐานข้อมูลและบัญชีครู:** Supabase (Postgres + Auth + Realtime)
- **ตรวจสอบข้อมูล:** zod (ใช้ร่วมกันทั้งหน้าเว็บและ Functions ใน `/shared`)
- **ทดสอบ:** Vitest (unit + ทดสอบกับฐานข้อมูลจริง)

---

## 1. หลักความปลอดภัย (อ่านก่อน)

| ข้อ | รายละเอียด |
|---|---|
| นักเรียนไม่คุยกับ Supabase โดยตรง | ผ่าน Pages Functions เท่านั้น ซึ่งถือ **service_role key** ไว้เป็น secret ใน Cloudflare |
| คีย์ anon อ่านอะไรไม่ได้ | เปิด RLS ทุกตาราง **ไม่มี policy และไม่มีสิทธิ์สำหรับ anon เลย** (พิสูจน์ด้วยเทสต์ `tests/integration/rls-matrix.int.test.ts`) |
| ครู | ล็อกอินด้วย Supabase Auth แล้วใช้สิทธิ์ของตัวเอง RLS ตรวจด้วยฟังก์ชัน `is_teacher()` (ต้องอยู่ในตาราง `teachers`) |
| ป้องกันบอท | Cloudflare Turnstile ทุกครั้งที่ส่งงาน/ดูคะแนน |
| จำกัดอัตรา | ตัวนับบน Workers KV ต่อ IP (แฮชก่อนเก็บ): `/api/score` 5 ครั้ง/นาที, `/api/submit` 10 ครั้ง/10 นาที ค่านี้เป็นค่าประมาณ (KV ไม่ตรงทันที) Turnstile คือด่านหลัก |
| ไม่ log ข้อมูลนักเรียน | โค้ดฝั่งเซิร์ฟเวอร์ไม่บันทึกเนื้อหาคำขอ/คำตอบ |
| กัน XSS | ข้อความนักเรียนแสดงเป็นข้อความล้วนเสมอ (ห้ามใช้ `v-html` — ESLint บังคับ) และมี CSP ใน `public/_headers` |
| CSV | กันสูตร Excel (`=`, `+`, `-`, `@`) ที่นักเรียนอาจพิมพ์มา |

### ความเสี่ยงที่ทราบและยอมรับ
**การดูคะแนนใช้ ชั้น + ห้อง + เลขที่ โดยไม่ต้องกรอกชื่อ** (ตามที่เจ้าของโปรเจกต์เลือก) และผลลัพธ์แสดงชื่อนักเรียน ดังนั้นใครก็ตามที่เดาชั้น/ห้อง/เลขที่ถูก จะเห็นชื่อ คำตอบ และคะแนนของเพื่อนคนนั้นได้ มาตรการลดความเสี่ยงที่มี: Turnstile, จำกัด 5 ครั้ง/นาที/IP และส่งกลับเฉพาะฟิลด์ที่จำเป็น หากต้องการเข้มขึ้น ให้เพิ่มช่องชื่อกลับในหน้าดูคะแนน (ฟังก์ชัน `normalizeName` และสคีมาพร้อมแล้ว)

---

## 2. ตัวแปรสภาพแวดล้อม

| ตัวแปร | สาธารณะ/ลับ | ใช้ที่ | หมายเหตุ |
|---|---|---|---|
| `VITE_SUPABASE_URL` | สาธารณะ | build ของหน้าเว็บ | URL โปรเจกต์ Supabase |
| `VITE_SUPABASE_ANON_KEY` | สาธารณะ | build ของหน้าเว็บ | คีย์ anon สำหรับฝั่งครู (RLS คุ้มครองข้อมูล) |
| `VITE_TURNSTILE_SITE_KEY` | สาธารณะ | build ของหน้าเว็บ | Site key ของ Turnstile |
| `SUPABASE_URL` | ลับ* | Pages Functions | *ไม่ใช่ความลับจริง แต่เก็บคู่กับคีย์ |
| `SUPABASE_SERVICE_ROLE_KEY` | **ลับมาก** | Pages Functions เท่านั้น | ข้าม RLS ทั้งหมด **ห้ามขึ้นต้นด้วย `VITE_` ห้าม commit** |
| `TURNSTILE_SECRET_KEY` | **ลับ** | Pages Functions เท่านั้น | |

ในเครื่อง: `.env.local` (สาธารณะ) และ `.dev.vars` (ลับ) ทั้งคู่ถูก gitignore คัดลอกจาก `.env.example` / `.dev.vars.example`
Turnstile คีย์ทดสอบของ Cloudflare (ผ่านทุกครั้ง) มีอยู่ในไฟล์ตัวอย่าง ใช้ได้เฉพาะตอนพัฒนา

---

## 3. ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com) (แนะนำ Region: Singapore) เก็บรหัสผ่านฐานข้อมูลไว้ใน password manager
   *โปรเจกต์ฟรีจะถูก pause ถ้าไม่มีการใช้งานราว 1 สัปดาห์ ถ้าต้องการให้เว็บเปิดได้ตลอดปิดเทอม ควรใช้แผน Pro*
2. **Authentication → Sign In / Providers → Email:** ปิด *Allow new users to sign up*
3. รัน migrations ตามลำดับใน **SQL Editor** (วางเนื้อหาทีละไฟล์แล้ว Run):
   `supabase/migrations/0001_schema.sql` → `0002_rls.sql` → `0003_submit_rpc.sql` → `0004_realtime.sql` → `0005_service_role_grants.sql`
   (หรือใช้ Supabase CLI ในเทอร์มินัลปกติ: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`)
4. ตรวจผล: `select count(*) from pg_tables where schemaname='public' and rowsecurity;` ต้องได้ 3
5. **สร้างครูคนแรก:** Authentication → Users → *Add user* → *Create new user* (ติ๊ก *Auto Confirm User*) แล้วรัน (แก้อีเมล):
   ```sql
   insert into public.teachers (user_id)
   select id from auth.users where email = 'อีเมลครู@school.ac.th'
   on conflict do nothing;
   select t.user_id, u.email from public.teachers t join auth.users u on u.id = t.user_id;  -- ต้องเห็น 1 แถว
   ```
   (ครูคนถัดไปทำซ้ำแบบเดียวกัน; ถอดสิทธิ์ครูด้วย `delete from public.teachers where user_id = '...'`)
6. คัดลอกคีย์จาก **Project Settings → API Keys** ใส่ `.env.local` (anon) และ `.dev.vars` (service_role) **อย่าสลับกัน**
7. เมื่อมีโดเมนจริง: **Authentication → URL Configuration** ใส่ Site URL และ Redirect URLs ของเว็บ

### ตารางและกฎ
- `submissions` (ไม่ซ้ำตาม ชั้น+ห้อง+เลขที่), `grades` (1 ต่อ 1 กับ submissions, `total` คำนวณจาก `marks` โดย trigger), `teachers`
- ฟังก์ชัน `submit_worksheet` ทำกฎข้อ 2–4 แบบ atomic (ล็อกต่อที่นั่ง): ตรวจชื่อก่อน → ถ้าตรวจแล้วล็อก → ถ้ายังไม่ตรวจและชื่อเดียวกัน เขียนทับ
- เรียกได้เฉพาะ service_role

---

## 4. รันในเครื่อง

ต้องการ Node 20+ และ pnpm (`packageManager` ตรึงไว้ที่ pnpm 9 — Node 22 แนะนำ เพราะ supabase-js เตือนว่าจะเลิกรองรับ Node 20)

```bash
pnpm install
cp .env.example .env.local        # แล้วกรอก
cp .dev.vars.example .dev.vars    # แล้วกรอก
pnpm pages:dev                    # build + wrangler pages dev (หน้าเว็บ + /api) ที่ http://localhost:8788
# หรือ pnpm dev สำหรับหน้าเว็บอย่างเดียว (proxy /api ไป 8788)
```

> ถ้ารัน Supabase ในเครื่องด้วย Docker (`supabase start`) ให้ใส่ URL/คีย์ของ local แล้วใช้ `pnpm seed:demo` เพื่อเติมข้อมูลตัวอย่าง สคริปต์นี้ **ปฏิเสธการรัน** ถ้า `SUPABASE_URL` ไม่ใช่เครื่องตัวเอง

### สคริปต์
| คำสั่ง | ทำอะไร |
|---|---|
| `pnpm run ci` | lint + typecheck + unit tests (ใช้ใน GitHub Actions) |
| `pnpm test` | unit tests (ไม่แตะอินเทอร์เน็ต) |
| `pnpm test:int` | **ทดสอบกับ Supabase จริง** (RLS, สิทธิ์, กฎธุรกิจ) สร้างข้อมูลทดลองที่ ป.1/30/96–99 และผู้ใช้ `itest-…@example.invalid` แล้วลบทิ้ง ไม่รันใน CI |
| `pnpm seed:demo` | ข้อมูลตัวอย่าง (เฉพาะ local) |

---

## 5. Deploy บน Cloudflare Pages

1. สร้าง **KV namespace** สำหรับตัวจำกัดอัตรา: `npx wrangler kv namespace create RATE_LIMIT` แล้วนำ `id` ไปแทน `REPLACE_WITH_KV_NAMESPACE_ID` ใน `wrangler.toml` (ถ้ายังเป็น placeholder การ deploy จะล้มเหลว)
2. สร้าง **Turnstile site** ที่ Cloudflare Dashboard → Turnstile ใส่โดเมนของเว็บ ได้ Site key และ Secret key
3. Dashboard → **Workers & Pages → Create → Pages → Connect to Git** เลือกรีโป แล้วตั้งค่า:
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Environment variable `NODE_VERSION` = `20` (หรือ `22`)
4. **Settings → Variables and Secrets** (ทั้ง Production และ Preview):
   - แบบ Plaintext (ใช้ตอน build): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`
   - แบบ **Secret**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TURNSTILE_SECRET_KEY`
   - (หรือด้วย CLI: `npx wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name lun-thai-lek`)
5. **Settings → Functions → KV namespace bindings:** ผูก `RATE_LIMIT` กับ namespace ข้อ 1 (ทั้ง Production และ Preview)
6. Deploy แล้วทดสอบ: ส่งงานจากมือถือ → ล็อกอินครู → ตรวจงาน → ดูคะแนน

> ใช้โปรเจกต์ Supabase **แยก** สำหรับ Preview ถ้าไม่อยากให้ข้อมูลทดสอบปนกับข้อมูลจริง

---

## 6. กฎธุรกิจ (สรุป)
1. นักเรียนระบุตัวตนด้วย (ชั้น, ห้อง, เลขที่) + ชื่อ
2. ตรวจแล้ว → ส่งใหม่ไม่ได้ (ข้อความภาษาไทย)
3. ที่นั่งเดียวกันแต่ชื่อไม่ตรง → ปฏิเสธและให้ตรวจชั้น/ห้อง/เลขที่หรือถามครู
4. ชื่อเดียวกันและยังไม่ตรวจ → เขียนทับได้
5. ดูคะแนนด้วย ชั้น + ห้อง + เลขที่ (ไม่ต้องกรอกชื่อ) สถานะ: ไม่พบงาน / รอครูตรวจ / ตรวจแล้ว
6. ผลที่ตรวจแล้วมี: คะแนน 0–4, รายคำ (เลข คำนามที่สุ่มได้ คำ เหตุผล ถูก/ไม่ถูก ความเห็น) และความเห็นรวม
7. ครูต้องเลือก ถูก/ไม่ถูก ครบ 4 คำก่อนบันทึก; บันทึกใหม่แทนที่ของเดิม
8. หน้าครู: กรอง, ค้นหา, สถิติ, "บันทึกแล้วไปคนถัดไป", CSV (UTF-8 BOM)
9. อัปเดตสดด้วย Realtime (ถ้าไม่ได้ จะรีเฟรชเมื่อกลับมาที่หน้าต่าง และเช็กทุก 30 วินาที)

---

## 7. ความเป็นส่วนตัวและข้อมูลนักเรียน (PDPA)

นี่คือข้อมูลของเด็กอายุ 12–13 ปี โปรดพิจารณาข้อกำหนดของโรงเรียนและกฎหมายคุ้มครองข้อมูลส่วนบุคคล (PDPA) — เอกสารนี้ไม่ใช่คำแนะนำทางกฎหมาย

**รายการตรวจสำหรับครู**
- [ ] เก็บเฉพาะที่ใบงานต้องใช้ (ชื่อ-สกุล ชั้น ห้อง เลขที่ คำตอบ) ไม่เพิ่มช่องข้อมูลอื่น
- [ ] แจ้งนักเรียน/ผู้ปกครองว่าเก็บข้อมูลอะไร ใช้ทำอะไร เก็บนานแค่ไหน และขออนุญาตตามขั้นตอนของโรงเรียน
- [ ] ตรวจกับฝ่ายบริหาร/ผู้รับผิดชอบด้านข้อมูลของโรงเรียนว่าอนุญาตให้ใช้บริการคลาวด์ (Supabase, Cloudflare) หรือไม่
- [ ] จำกัดบัญชีครูเฉพาะผู้ที่จำเป็น ใช้รหัสผ่านยาวและไม่ซ้ำ ถอดสิทธิ์ (`delete from teachers`) เมื่อครูย้ายหรือออก
- [ ] เก็บ service_role key เป็นความลับ (ไม่ส่งในแชต/อีเมล) หมุนคีย์ทันทีหากหลุด
- [ ] ดาวน์โหลด CSV แล้วเก็บในที่ปลอดภัย (ไฟล์มีชื่อนักเรียน) และลบจากเครื่องที่ใช้ร่วมกัน
- [ ] **สิ้นภาคเรียน: ลบข้อมูล** ด้วย `scripts/purge-class.sql` (ดูตัวอย่างก่อนลบ แล้วค่อยลบ)
- [ ] เปิดการสำรองข้อมูลของ Supabase ตามแผนที่ใช้ และจำไว้ว่าสำรองข้อมูลก็มีข้อมูลนักเรียนอยู่ด้วย
- [ ] ตั้งผู้ติดต่อสำหรับนักเรียน/ผู้ปกครองที่ขอดูหรือลบข้อมูลของตน

---

## 8. สถานะและข้อจำกัดที่ทราบ
- ทดสอบอัตโนมัติ: unit tests (`pnpm test`) และทดสอบกับ Supabase จริง (`pnpm test:int`: RLS, สิทธิ์ทุกบทบาท, กฎข้อ 2–4, `/api/score`)
- ยังไม่ผ่านการทดสอบบนเบราว์เซอร์จริง/Lighthouse/Playwright (ดูหมายเหตุท้ายรายงาน Phase 4)
- Realtime ที่ไม่ส่งข้อมูลให้ผู้ที่ไม่ใช่ครู เป็นกลไกของแพลตฟอร์ม Supabase ที่ชุดทดสอบนี้ไม่ได้พิสูจน์
- ตัวจำกัดอัตรา KV เป็นแบบประมาณ และโรงเรียนที่ใช้ IP ร่วมกัน (NAT) อาจโดนจำกัดพร้อมกัน — ปรับค่าใน `functions/_lib/handlers.ts` (`LIMITS_PER_ROUTE`)
