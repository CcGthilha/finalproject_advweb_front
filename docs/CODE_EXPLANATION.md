# เอกสารอธิบายโค้ด Frontend — final_project

ระบบจัดเส้นทางและแบ่งงานไรเดอร์ (ข้าวกล่องส่งด่วนมื้อเที่ยง)
Angular 19 (standalone component + signals) + Leaflet / OpenStreetMap

---

## 1. สถานะงาน: ทำแล้ว / เหลือให้เพื่อนทำ

| ส่วน | สถานะ | ไฟล์ |
|---|---|---|
| สร้างโปรเจค + ติดตั้ง Leaflet | ✅ ทำแล้ว | `package.json`, `angular.json` |
| Models (ชนิดข้อมูล) ทุกตาราง | ✅ ทำแล้ว | `src/app/core/models/*` |
| Services เรียก Web API ครบทุก endpoint | ✅ ทำแล้ว | `src/app/core/services/*` |
| Error interceptor (ข้อความ error ภาษาไทย) | ✅ ทำแล้ว | `src/app/core/interceptors/error.interceptor.ts` |
| Layout + เมนู + Routing (lazy load) | ✅ ทำแล้ว | `src/app/layout/*`, `src/app/app.routes.ts` |
| คอมโพเนนต์แผนที่ใช้ซ้ำ `<app-map>` | ✅ ทำแล้ว | `src/app/shared/map/map.component.ts` |
| หน้าจัดการลูกค้า `/customers` | ✅ ทำแล้ว | `src/app/pages/customers/*` |
| หน้าจัดการออเดอร์ `/orders` | ✅ ทำแล้ว | `src/app/pages/orders/*` |
| **หน้าจัดเส้นทาง `/dispatch`** | ⬜ **เหลือ** (มีหน้าว่าง + TODO) | `src/app/pages/dispatch/dispatch.component.ts` |
| **อัลกอริทึมแบ่งกลุ่ม/จัดลำดับจุดส่ง** | ⬜ **เหลือ** | (แนะนำสร้าง `src/app/core/utils/optimizer.ts`) |
| **หน้าตั้งค่า (speed, road, stopMin, depart, back)** | ⬜ **เหลือ** | ใช้ `SettingService` ที่ทำไว้แล้ว |
| **หน้าไรเดอร์ `/rider` (มือถือ)** | ⬜ **เหลือ** (มีหน้าว่าง + TODO) | `src/app/pages/rider/rider.component.ts` |
| Deploy (เปลี่ยน `apiUrl`) | ⬜ เหลือ | `src/environments/environment.ts` |

> Service ของส่วนที่เหลือ (`PlanService`, `SettingService`) เขียนไว้ให้แล้ว เพื่อนเรียกใช้ได้เลยโดยไม่ต้องเขียน HTTP เอง

---

## 2. วิธีรัน

```bash
# 1) เปิด backend ก่อน (โฟลเดอร์ FinalProject_AdvWeb-main/server) → http://localhost:3000
cd server
npm install
npm run dev

# 2) เปิด frontend
cd final_project
npm install
npm start          # http://localhost:4200
```

ถ้า backend ไม่ได้เปิด หน้าเว็บจะขึ้นข้อความ "ติดต่อ server ไม่ได้ (เปิด backend ที่ port 3000 แล้วหรือยัง?)"

---

## 3. โครงสร้างโฟลเดอร์

```
src/
├── environments/
│   └── environment.ts          ← URL ของ backend (apiUrl)
├── styles.css                  ← CSS กลาง: .card .btn .alert ตาราง หมุดแผนที่
└── app/
    ├── app.config.ts           ← ลงทะเบียน Router, HttpClient, interceptor
    ├── app.routes.ts           ← ตาราง route ของทุกหน้า
    ├── app.component.ts        ← root มีแค่ <router-outlet>
    ├── core/                   ← ส่วนที่ไม่ใช่หน้าจอ (ข้อมูล + การเรียก API)
    │   ├── models/             ← interface ของข้อมูล + ค่าคงที่ของร้าน
    │   ├── services/           ← เรียก Web API ผ่าน HttpClient
    │   ├── interceptors/       ← ดัก error ของทุก request
    │   └── utils/date.ts       ← todayBangkok()
    ├── layout/                 ← แถบเมนูด้านบน + <router-outlet> ของหน้าย่อย
    ├── shared/map/             ← คอมโพเนนต์แผนที่ Leaflet ใช้ซ้ำ
    └── pages/                  ← 1 โฟลเดอร์ = 1 หน้า
        ├── customers/          ✅
        ├── orders/             ✅
        ├── dispatch/           ⬜ (TODO)
        ├── rider/              ⬜ (TODO)
        └── not-found/
```

แนวคิด: **หน้าจอ (pages) ไม่เรียก HttpClient เอง** — เรียกผ่าน service ใน `core/services` เท่านั้น
ถ้า backend เปลี่ยน URL หรือรูปแบบข้อมูล แก้ที่ service/model ที่เดียว

---

## 4. Models — ข้อมูลแต่ละตัวตรงกับตารางไหน

| Model (frontend) | ตารางใน `lunch_route.sql` | API ที่ส่งข้อมูลนี้ |
|---|---|---|
| `Customer` | `customers` | `GET /customers` |
| `Order` | `orders` (+ join `customers`) | `GET /orders?date=` |
| `Setting` | `shop_settings` (ส่วนค่าความเร็ว/เวลาออก) | `GET /settings` |
| `SHOP` (ค่าคงที่) | `shop_settings` (ราคา 65, ต้นทุน 40, ค่าเรียก 15, 2 บาท/กม./กล่อง) | – |
| `Plan` | `route_plans` | `GET /plan/latest`, `POST /plan` |
| `Route` | `trips` (1 ใบงาน/ไรเดอร์, `code` = `job_code`, `color` = `route_color`) | `GET /route/:code` |
| `Stop` | `trip_stops` (`seq` = `stop_seq`, `done` = `delivered_at`) | อยู่ใน `Route.stops` |

> **ข้อควรรู้:** backend ปัจจุบัน (`server/sql/schema.sql`) ใช้ชื่อตาราง `customer, orders, setting, plan, route, stop`
> ส่วน `lunch_route.sql` เป็นแบบใหม่ที่ละเอียดกว่า (มี `riders`, `version_no`, กำไร ฯลฯ)
> frontend คุยกับ **JSON ของ API** ไม่ได้คุยกับ DB ตรง ๆ ดังนั้นถ้าย้าย backend ไปใช้ `lunch_route.sql`
> ให้ API ส่ง JSON ชื่อฟิลด์เดิม หรือแก้ไฟล์ใน `core/models` ให้ตรงกัน

ตัวอย่าง `Order` (`core/models/order.model.ts`)

```ts
export interface Order {
  id: number;
  customerId: number;
  boxes: number;      // 1-3 กล่อง (quantity)
  orderDate: string;  // "YYYY-MM-DD" (delivery_date)
  name: string; phone: string; address: string; lat: number; lng: number; // จาก customers
}
```

---

## 5. Services — เรียก API อะไรได้บ้าง

ทุก service ใช้ `inject(HttpClient)` และคืนค่าเป็น `Observable` → หน้าจอต้อง `.subscribe()`

### CustomerService (`/customers`)
| เมธอด | HTTP |
|---|---|
| `getAll()` | `GET /customers` |
| `getById(id)` | `GET /customers/:id` |
| `search(q)` | `GET /customers/search?q=` |
| `findByPhone(phone)` | `GET /customers?phone=` |
| `nearby(lat, lng, km)` | `GET /customers/nearby` |
| `create(body)` | `POST /customers` |
| `update(id, body)` | `PUT /customers/:id` |
| `delete(id)` | `DELETE /customers/:id` (ออเดอร์ของคนนั้นหายตาม) |

### OrderService (`/orders`)
| เมธอด | HTTP |
|---|---|
| `getByDate(date?)` | `GET /orders?date=` (ไม่ใส่ = วันนี้) |
| `create({customerId, boxes})` | `POST /orders` (server ใส่วันที่วันนี้เอง) |
| `updateBoxes(id, boxes)` | `PUT /orders/:id` |
| `delete(id)` | `DELETE /orders/:id` |
| `clear(date?)` | `DELETE /orders?date=` |
| `simulate(n?)` | `POST /orders/simulate` ล้างของวันนี้แล้วสุ่มใหม่ |

### SettingService (`/settings`) — สำหรับเพื่อนใช้ในหน้า dispatch
`get()`, `update(setting)`

### PlanService (`/plan`, `/route`) — สำหรับเพื่อนใช้ในหน้า dispatch / rider
| เมธอด | HTTP | ใช้ที่หน้า |
|---|---|---|
| `getLatest()` | `GET /plan/latest` | dispatch |
| `confirm(planRequest)` | `POST /plan` → ได้รหัสใบงาน 4 หลัก | dispatch |
| `getRouteByCode(code)` | `GET /route/:code` | rider |
| `markStop(code, seq, done)` | `PUT /route/:code/stops/:seq` | rider |

---

## 6. Error interceptor

ไฟล์ `core/interceptors/error.interceptor.ts` ดักทุก request ที่พัง แล้วแปลงเป็น `Error` ที่มีข้อความอ่านง่าย

- `status 0` → "ติดต่อ server ไม่ได้ ..."
- server ส่ง `{ error: "เบอร์โทรนี้มีอยู่แล้ว" }` → ใช้ข้อความนั้นเลย
- อื่น ๆ → "เกิดข้อผิดพลาด (500)"

หน้าจอจึงเขียนแค่

```ts
this.api.create(body).subscribe({
  next: () => ...,
  error: (e: Error) => this.error.set(e.message),
});
```

---

## 7. Routing และ Layout

`app.routes.ts` ใช้ `LayoutComponent` เป็นกรอบ แล้วใส่หน้าย่อยเป็น `children`
ทุกหน้าโหลดแบบ **lazy** (`loadComponent`) → เปิดหน้าไหนค่อยโหลดโค้ดหน้านั้น

```
/            → redirect ไป /customers
/customers   → CustomersComponent
/orders      → OrdersComponent
/dispatch    → DispatchComponent   (TODO)
/rider       → RiderComponent      (TODO)
/**          → NotFoundComponent
```

`LayoutComponent` มีเมนูจาก array `menus` ใช้ `routerLinkActive="active"` ไฮไลต์เมนูที่เปิดอยู่

---

## 8. MapComponent `<app-map>` (shared)

ห่อ Leaflet ให้ใช้แบบ Angular ได้ง่าย

```html
<app-map [pins]="pins()" [lines]="lines()" [fitBounds]="true" (pick)="onMapPick($event)" />
```

| Input/Output | ความหมาย |
|---|---|
| `pins: MapPin[]` | หมุด `{lat, lng, label, color?, tooltip?, draft?}` |
| `lines: MapLine[]` | เส้นทาง `{color, points: [lat,lng][]}` — **เตรียมไว้ให้หน้า dispatch** |
| `fitBounds` | ซูมให้เห็นทุกหมุดอัตโนมัติ |
| `(pick)` | คลิกบนแผนที่ → ได้ `{lat, lng}` |

การทำงาน
- `ngAfterViewInit` สร้างแผนที่ ใส่ tile OpenStreetMap และหมุด "ร้าน" (`SHOP.lat/lng`)
- `effect()` คอยดู signal input — `pins`/`lines` เปลี่ยนเมื่อไรก็ลบเลเยอร์แล้ววาดใหม่
- `ResizeObserver` เรียก `invalidateSize()` เมื่อกล่องเปลี่ยนขนาด (ไม่งั้นแผนที่ขึ้นเทา)
- หมุดใช้ `L.divIcon` + class `.pin` ใน `styles.css` (ไม่ใช้รูปไอคอน default ของ Leaflet ที่มักหายตอน build)
- `escapeHtml()` กันชื่อลูกค้าที่มี `<` `>` กลายเป็น HTML

---

## 9. หน้าจัดการลูกค้า `/customers`

ไฟล์ `pages/customers/customers.component.ts | .html | .css`

**State (signal)**
- `customers` รายชื่อจาก server, `keyword` คำค้น, `editingId` (null = เพิ่มใหม่ / ตัวเลข = กำลังแก้)
- `loading`, `saving`, `error`, `success`
- `draftPoint` ตำแหน่งที่เพิ่งคลิกบนแผนที่

**Computed**
- `filtered` กรองรายชื่อด้วยชื่อ/เบอร์ ฝั่งหน้าจอทันทีไม่ต้องยิง API
- `pins` หมุดลูกค้าทุกคน (คนที่กำลังแก้เป็นสีแดง) + หมุด `+` ชั่วคราว

**ฟอร์ม (Reactive Forms)**
- `firstname`, `lastname` ต้องกรอก
- `phone` ต้องตรง `/^0\d{8,9}$/`
- `lat`, `lng` ได้จากการคลิกแผนที่ (`onMapPick` ปัด 6 ตำแหน่งให้ตรง `DECIMAL(9,6)`)

**การทำงาน**
1. `ngOnInit` → `load()` ดึงลูกค้าทั้งหมด
2. กด "แก้ไข" → `edit(c)` เอาข้อมูลใส่ฟอร์ม
3. กด "เพิ่ม/บันทึก" → `save()` ถ้า `editingId` เป็น null เรียก `create` ไม่งั้นเรียก `update` แล้วโหลดใหม่
4. กด "ลบ" → `confirm()` แล้ว `delete` (เตือนว่าออเดอร์ของลูกค้าจะหายด้วย)
5. เบอร์ซ้ำ → server ตอบ 409 → ขึ้นกล่องแดง "เบอร์โทรนี้มีอยู่แล้ว"

---

## 10. หน้าจัดการออเดอร์ `/orders`

ไฟล์ `pages/orders/orders.component.ts | .html | .css`

**State / Computed**
- `date` วันที่ที่ดู (ค่าเริ่ม = วันนี้ตามเวลาไทย `todayBangkok()`)
- `orders`, `customers`, `busy` (กำลังเขียนข้อมูล ปิดปุ่มกันกดซ้ำ)
- `isToday` — server เพิ่มออเดอร์ได้แค่วันนี้ จึงซ่อนฟอร์มเพิ่ม/จำลองเมื่อดูวันอื่น
- `availableCustomers` ลูกค้าที่ยังไม่มีออเดอร์วันนี้ (กันสั่งซ้ำ)
- `summary` จำนวนออเดอร์, กล่อง, รายได้ = กล่อง × 65, ค่าอาหาร = กล่อง × 40
- `pins` หมุดออเดอร์ ตัวเลขในหมุด = จำนวนกล่อง

**การทำงาน**
| ปุ่ม | เมธอด | API |
|---|---|---|
| เปลี่ยนวันที่ | `changeDate()` | `getByDate(date)` |
| เพิ่ม | `add()` | `create({customerId, boxes})` |
| dropdown จำนวนกล่องในตาราง | `changeBoxes()` | `updateBoxes(id, boxes)` |
| ลบ | `remove()` | `delete(id)` |
| ล้างทั้งหมด | `clearAll()` | `clear(date)` |
| จำลอง | `simulate()` | `simulate(n)` (ว่าง = สุ่ม 20-30) |

ทุกปุ่มที่เขียนข้อมูลผ่านเมธอดกลาง `run(req$, okMessage)` → ตั้ง `busy`, แสดงข้อความสำเร็จ/ผิดพลาด แล้ว `load()` ใหม่

---

## 11. คำแนะนำสำหรับเพื่อนที่ทำส่วนที่เหลือ

### หน้า `/dispatch` (จัดเส้นทาง)
1. ดึง `OrderService.getByDate()` + `SettingService.get()`
2. เขียน optimizer เป็นฟังก์ชันล้วนใน `core/utils/optimizer.ts`
   - แบ่งออเดอร์เป็นกลุ่ม กลุ่มละ ≤ `SHOP.maxOrdersPerRider` (3) ออเดอร์
   - ระยะทาง: Haversine × `setting.road` ; เวลา = ระยะ / `setting.speed` + `stopMin` ต่อจุด
   - ค่าส่ง/ไรเดอร์ = `SHOP.riderBaseFee + SHOP.riderRatePerKmBox × กล่อง × กม.` (15 + 2 × กล่อง × กม.)
   - ทุกจุดต้องถึงก่อน `SHOP.deadlineTime` (12:30) = ภายใน 60 นาทีหลังออก 11:30
3. วาดบน `<app-map [pins] [lines]>` ใช้สีจาก `ROUTE_COLORS`
4. สรุป รายได้ − ค่าอาหาร − ค่าส่ง = กำไร
5. ปุ่ม "คำนวณใหม่" (สุ่มคำตอบอื่น) และ "ยืนยัน" → `PlanService.confirm(...)` แล้วแสดงรหัสใบงานที่ได้
6. รูปแบบ body ที่ต้องส่งดูได้ที่ `PlanRequest` ใน `core/models/plan.model.ts`

### หน้า `/rider` (มือถือ)
1. ช่องกรอกรหัส 4 หลัก → `PlanService.getRouteByCode(code)`
2. แสดง `route.boxes` (กล่องที่ต้องหยิบ) และ `route.stops` ตามลำดับ `seq`
3. ปุ่มนำทาง: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
4. ปุ่มโทร: `<a [href]="'tel:' + stop.phone">`
5. ปุ่ม "ส่งแล้ว" → `PlanService.markStop(code, stop.seq, true)`

### หน้า/ส่วนตั้งค่า
ใช้ `SettingService.get()` / `update()` กับฟอร์ม speed, road, stopMin, depart, back

---

## 12. ประวัติ commit (ส่วนที่ทำแล้ว)

1. `chore` สร้างโปรเจค Angular 19 + ติดตั้ง leaflet
2. `feat(core)` models, services, error interceptor, environment
3. `feat(layout)` layout เมนู, routing lazy, MapComponent, CSS กลาง, หน้าว่าง dispatch/rider
4. `feat(customers)` หน้าจัดการลูกค้า
5. `feat(orders)` หน้าจัดการออเดอร์
6. `docs` เอกสารฉบับนี้ + README
