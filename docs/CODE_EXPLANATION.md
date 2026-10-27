# เอกสารอธิบายโค้ด Frontend — final_project

ระบบจัดเส้นทางและแบ่งงานไรเดอร์ (ข้าวกล่องส่งด่วนมื้อเที่ยง)
Angular 19 (standalone component + signals) + Leaflet / OpenStreetMap

- Backend: https://github.com/CcGthilha/avdweb_backend (deploy ที่ https://finalproject-advweb.onrender.com)
- ฐานข้อมูล: `lunch_route.sql` (customers, riders, orders, shop_settings, route_plans, trips, trip_stops)

---

## 1. สถานะงาน

| ส่วน | สถานะ | ไฟล์ |
|---|---|---|
| สร้างโปรเจค + Leaflet | ✅ | `package.json`, `angular.json` |
| Models ตาม API ของ backend | ✅ | `src/app/core/models/*` |
| Services เรียก API ครบทุก endpoint | ✅ | `src/app/core/services/*` |
| Error interceptor (ข้อความ error ภาษาไทย) | ✅ | `src/app/core/interceptors/error.interceptor.ts` |
| Layout + เมนู + Routing (lazy load) | ✅ | `src/app/layout/*`, `src/app/app.routes.ts` |
| แผนที่ใช้ซ้ำ `<app-map>` | ✅ | `src/app/shared/map/map.component.ts` |
| หน้าจัดการลูกค้า `/customers` | ✅ | `src/app/pages/customers/*` |
| หน้าจัดการออเดอร์ `/orders` | ✅ | `src/app/pages/orders/*` |
| อัลกอริทึมจัดเส้นทาง (Simulated Annealing) | ✅ | `src/app/core/utils/optimizer.ts` |
| เส้นทางตามถนนจริง (OSRM) | ✅ | `src/app/core/services/road.service.ts` |
| หน้าจัดเส้นทาง `/dispatch` + ตั้งค่า + เทียบเวอร์ชัน | ✅ | `src/app/pages/dispatch/*` |
| หน้าไรเดอร์ `/rider` (มือถือ) | ✅ | `src/app/pages/rider/*` |
| หน้าจัดการไรเดอร์ (เพิ่ม/แก้/ลบ) | ⬜ ยังไม่มีหน้า (มี `RiderService` แล้ว) | – |
| Deploy frontend + เพิ่ม URL ใน `CORS_ORIGINS` ของ backend | ⬜ | ดูข้อ 2 |

---

## 2. วิธีรัน และเรื่อง CORS

```bash
npm install
npm start          # http://localhost:4200
```

| คำสั่ง | ใช้ไฟล์ | เรียก API ที่ |
|---|---|---|
| `npm start` (ng serve) | `src/environments/environment.development.ts` | `/api` → dev server ส่งต่อไป Render ตาม `proxy.conf.json` |
| `npm run build` | `src/environments/environment.ts` | `https://finalproject-advweb.onrender.com` ตรง ๆ |

**ทำไมตอน dev ต้องผ่าน proxy:** backend บน Render อนุญาตเฉพาะเว็บที่อยู่ใน `CORS_ORIGINS`
ตอนนี้ยังไม่มี `http://localhost:4200` เบราว์เซอร์เลยเรียกตรงไม่ได้ (server ตอบ 500 "Not allowed by CORS")
`proxy.conf.json` ให้ dev server เป็นคนเรียกแทนและลบ header `Origin` ออก จึงใช้ได้

**ก่อน deploy frontend:** คนดูแล backend ต้องเพิ่ม URL ของ frontend (เช่น `https://xxx.vercel.app`) ใน `CORS_ORIGINS` บน Render
คั่นด้วย `,` ไม่มี `/` ปิดท้าย ไม่งั้นเว็บที่ deploy แล้วจะเรียก API ไม่ได้

---

## 3. โครงสร้างโฟลเดอร์

```
src/
├── environments/               ← URL ของ backend (prod / dev)
├── styles.css                  ← CSS กลาง: .card .btn .alert ตาราง หมุดแผนที่
└── app/
    ├── app.config.ts           ← Router, HttpClient, interceptor
    ├── app.routes.ts           ← ตาราง route
    ├── core/
    │   ├── models/             ← interface ตาม JSON ของ API
    │   ├── services/           ← เรียก API ผ่าน HttpClient
    │   ├── interceptors/       ← แปลง error
    │   └── utils/              ← date.ts, optimizer.ts
    ├── layout/                 ← เมนูด้านบน
    ├── shared/map/             ← แผนที่ Leaflet
    └── pages/                  ← customers, orders, dispatch, rider, not-found
```

หน้าจอ **ไม่เรียก HttpClient เอง** — เรียกผ่าน service เท่านั้น ถ้า API เปลี่ยน แก้ที่ service/model ที่เดียว

---

## 4. Models ↔ ตาราง ↔ API

ชื่อฟิลด์ใน JSON = camelCase ของคอลัมน์ (`customer_id` → `customerId`), เวลาเป็น `"HH:MM"`

| Model | ตาราง | API |
|---|---|---|
| `Customer` | `customers` | `GET /customers` |
| `Rider` | `riders` | `GET /riders` |
| `Order` (+ ชื่อ/พิกัดลูกค้า) | `orders` + `customers` | `GET /orders?date=` |
| `ShopSetting` | `shop_settings` | `GET /settings` |
| `Plan` | `route_plans` / `v_plan_compare` | `GET /plans?date=`, `/plans/latest`, `/plans/:id` |
| `Trip` | `trips` | อยู่ใน `Plan.trips`, `GET /trips/:jobCode` |
| `TripStop` | `trip_stops` | อยู่ใน `Trip.stops` |
| `PlanMapPoint` | `v_plan_map_points` | `GET /plans/:id/map` |
| `RouteOptions` (ตัวคูณถนน, เวลาจอด, ขากลับ) | – ใช้เฉพาะหน้าจอ เก็บใน localStorage | – |

สถานะออเดอร์: `PENDING` (รอจัดส่ง) → `ASSIGNED` (อยู่ในแผนที่เลือกใช้) → `DELIVERING` → `DELIVERED` / `CANCELLED`
**แก้จำนวนกล่อง / ลบ ได้เฉพาะ `PENDING`** (server ตอบ 409 ถ้าไม่ใช่)

---

## 5. Services

ทุกเมธอดคืน `Observable` → หน้าจอต้อง `.subscribe()`

**CustomerService** `/customers` — `getAll(includeDeleted?)`, `getById`, `search(q)`, `findByPhone`, `nearby(lat,lng,km)`, `create`, `update`, `restore(id)`, `delete(id)` (soft delete)

**OrderService** `/orders` — `getByDate(date?, status?)`, `getById`, `create({customerId, quantity, deliveryDate?})`, `update(id, {quantity})`, `delete(id)`, `clear(date?)`, `simulate(n?)`

**SettingService** `/settings` — `get()`, `update(partial)` และมี signal `shop` เก็บค่าล่าสุดให้ทุกหน้าใช้ร่วมกัน

**RiderService** `/riders` — `getAll`, `getById`, `create`, `update`, `delete`

**PlanService** `/plans`, `/trips`

| เมธอด | HTTP | ใช้ที่ |
|---|---|---|
| `list(date?)` | `GET /plans?date=` | dispatch ตารางเทียบเวอร์ชัน |
| `getLatest(date?)` | `GET /plans/latest` | dispatch |
| `getById(id)` | `GET /plans/:id` | dispatch ปุ่ม "ดู" |
| `create(body)` | `POST /plans` → เวอร์ชันใหม่ (DRAFT) | dispatch |
| `select(id)` | `PUT /plans/:id/select` → SELECTED | dispatch |
| `delete(id)` | `DELETE /plans/:id` | – |
| `getTrip(jobCode)` | `GET /trips/:jobCode` | rider |
| `markDelivered(jobCode, seq, delivered)` | `PUT /trips/:jobCode/stops/:seq` | rider |

**RoadService** — ขอเส้นตามถนนจาก OSRM ใช้วาดเส้นบนแผนที่เท่านั้น

---

## 6. Error interceptor

แปลง error ทุก request เป็น `Error` ที่อ่านง่าย: `status 0` → "ติดต่อ server ไม่ได้", server ส่ง `{ error: "..." }` → ใช้ข้อความนั้น
หน้าจอจึงเขียนแค่ `error: (e: Error) => this.error.set(e.message)`

---

## 7. MapComponent `<app-map>`

```html
<app-map [pins]="pins()" [lines]="lines()" [fitBounds]="true" (pick)="onMapPick($event)" />
```

- `pins` หมุด `{lat, lng, label, color?, tooltip?, draft?}`, `lines` เส้น `{color, points}`, `(pick)` คลิกแผนที่ได้ `{lat, lng}`
- `effect()` วาดใหม่ทุกครั้งที่ input เปลี่ยน, `ResizeObserver` กันแผนที่เทา, หมุดใช้ `divIcon` + `escapeHtml()`

---

## 8. หน้าจัดการลูกค้า `/customers`

- signal: `customers`, `keyword`, `editingId` (null = เพิ่มใหม่), `draftPoint`
- ฟอร์ม: `fullName`, `phone` (`/^0\d{8,9}$/`), `address`, `lat`, `lng` (ได้จากคลิกแผนที่)
- server ตรวจว่าบ้านต้องอยู่ในรัศมี `serviceRadiusKm` (3 กม.) จากร้าน และเบอร์ห้ามซ้ำ (409) → แสดงข้อความในกล่องแดง
- ลบ = soft delete (ออเดอร์เก่ายังอยู่)

## 9. หน้าจัดการออเดอร์ `/orders`

- เลือกวันที่ได้ เพิ่มออเดอร์ให้วันที่เลือก (`deliveryDate`), จำลองได้เฉพาะวันนี้
- ตารางมีคอลัมน์สถานะ แก้จำนวนกล่อง / ลบ ได้เฉพาะ "รอจัดส่ง"
- สรุป ออเดอร์ / กล่อง / รายได้ (× `boxPrice`) / ค่าอาหาร (× `boxCost`) จากค่าตั้งของร้าน

## 10. หน้าจัดเส้นทาง `/dispatch`

1. โหลด ค่าตั้ง, ไรเดอร์ที่ใช้งาน, ออเดอร์วันนี้, แผนล่าสุด, ทุกเวอร์ชันของวันนี้
2. "จัดเส้นทาง" → `optimize(orders, {shop, opt}, จำนวนไรเดอร์)` ได้หลายทางเลือก เรียงจากดีสุด
   - ใช้เฉพาะออเดอร์ `PENDING` / `ASSIGNED`, ถ้าไรเดอร์ไม่พอ (ออเดอร์ > ไรเดอร์ × 3) จะเตือน
3. แสดงใบงาน + แผนที่ (สีตามไรเดอร์, เส้นตามถนน) + สรุปกำไร, ถ้ามีจุดถึงหลังเส้นตายจะกดบันทึกไม่ได้
4. "บันทึกและเลือกใช้แผนนี้" → `POST /plans` (ส่ง `riderId`, `routeColor`, `orderId`, `legDistanceKm`, `etaMin`)
   แล้ว `PUT /plans/:id/select` → server คิดค่าส่ง/กำไรเอง และออกเลขใบงาน เช่น `J26102703-01`
5. ตาราง "เทียบแผนของวันนี้" (v_plan_compare) ดูกำไร/ค่าส่งต่อกล่อง/เวลาถึงช้าสุดของแต่ละเวอร์ชัน กด "ดู" หรือ "เลือกใช้" ได้
6. ตั้งค่า: ความเร็ว / เวลาออก / เส้นตาย บันทึกที่ server, ตัวคูณถนน / เวลาจอด / ขากลับ จำไว้ในเบราว์เซอร์

### optimizer.ts (ฟังก์ชันล้วน ไม่ผูก Angular)
- ระยะ = Haversine × ตัวคูณถนน, เวลา = ระยะ ÷ ความเร็ว + เวลาจอด
- ค่าส่ง = `riderBaseFee + riderRatePerKmBox × กล่อง × กม.` (สูตรเดียวกับ server)
- ลองทุกลำดับจุดในกลุ่ม (≤ 3 จุด = ≤ 6 แบบ) แล้วใช้ Simulated Annealing ย้าย/สลับออเดอร์ระหว่างกลุ่ม
  คะแนน = ค่าส่ง + โทษหนักถ้าถึงหลังเส้นตาย, ไม่ใช้ไรเดอร์เกินจำนวนที่มี
- ทดสอบกับออเดอร์จริงวันที่ 2026-10-21 (20 ออเดอร์ 43 กล่อง): ได้ 7 ไรเดอร์ ค่าส่ง 245.61 ฿ กำไร 829.39 ฿ ทุกจุดทันเวลา
  (ดีกว่าแผนเวอร์ชัน 2 ใน seed ที่กำไร 823.70 ฿)

## 11. หน้าไรเดอร์ `/rider`

- กรอกเลขใบงาน (เช่น `J261002-01`) หรือเปิดจากลิงก์ `/rider?code=...` → `GET /trips/:jobCode` (เฉพาะแผนที่เลือกใช้)
- แสดงกล่องที่ต้องหยิบ, ลำดับจุด, เวลาถึง (`eta`), ปุ่มนำทาง (`navUrl`), โทร, "ส่งแล้ว" / "ยกเลิก"
- กด "ส่งแล้ว" → server บันทึก `delivered_at` และอัปเดตสถานะใบงาน/ออเดอร์ แล้วคืนใบงานใหม่มาแสดง

---

## 12. ผลทดสอบกับ backend จริง (2026-10-27)

| หน้า | ทดสอบ | ผล |
|---|---|---|
| ลูกค้า | เพิ่ม / ปักหมุดเกินรัศมี / เบอร์ซ้ำ / แก้ชื่อ / ลบ | ✅ server ตอบถูก ข้อความ error ขึ้นถูก |
| ออเดอร์ | จำลอง 9 ออเดอร์ / แก้จำนวนกล่อง / ลบ / เพิ่ม | ✅ |
| ออเดอร์ | หลังเลือกแผนแล้ว แก้/ลบไม่ได้, ล้างทั้งหมดตอนไรเดอร์เริ่มส่ง | ✅ ซ่อนปุ่ม / server ตอบ 409 |
| จัดเส้นทาง | คำนวณ → บันทึกและเลือกใช้ → ได้เลขใบงาน `J26102701-01..04` | ✅ |
| จัดเส้นทาง | บันทึกเวอร์ชัน 2 แล้วสลับกลับไปเลือกเวอร์ชัน 1 จากตารางเทียบ | ✅ |
| ไรเดอร์ | เปิดใบงาน (พิมพ์ตัวเล็กได้) / ส่งแล้ว / ส่งครบ / ยกเลิก | ✅ สถานะออเดอร์เปลี่ยนตาม |

ตัวเลขระยะ/ค่าส่งในหน้าจอก่อนบันทึกอาจต่างจากหลังบันทึกเล็กน้อย (เช่น 9.0 กับ 9.07 กม.)
เพราะ server ปัดระยะแต่ละช่วงเป็น 2 ตำแหน่งก่อนรวม — ตัวเลขที่บันทึกจริงคือของ server

ข้อมูลทดสอบที่ยังอยู่ในฐานข้อมูล: ออเดอร์จำลองวันที่ 2026-10-27, แผนเวอร์ชัน 1 (เลือกใช้) และ 2,
ลูกค้า "ทดสอบ แก้ชื่อ (Claude)" เบอร์ 0800000999 (ถูกลบแบบ soft delete แล้ว)
