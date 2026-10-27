import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Order } from '../../core/models/order.model';
import { Plan, PlanRequest } from '../../core/models/plan.model';
import { Rider } from '../../core/models/rider.model';
import { DEFAULT_ROUTE_OPTIONS, RouteOptions } from '../../core/models/setting.model';
import { OrderService } from '../../core/services/order.service';
import { PlanService } from '../../core/services/plan.service';
import { RiderService } from '../../core/services/rider.service';
import { RoadService } from '../../core/services/road.service';
import { SettingService } from '../../core/services/setting.service';
import { todayBangkok } from '../../core/utils/date';
import { ALGORITHM, Solution, clock, limitMin, optimize, summarize } from '../../core/utils/optimizer';
import { MapComponent, MapLine, MapPin } from '../../shared/map/map.component';

// ใบงานที่แสดงบนหน้าจอ ใช้ได้ทั้งผลคำนวณ (ยังไม่บันทึก) และแผนจาก server (มีเลขใบงาน)
interface ViewStop {
  name: string;
  quantity: number;
  lat: number;
  lng: number;
  at: number; // นาทีหลังออกร้าน
  done?: boolean;
}
interface ViewTrip {
  key: string;
  title: string; // "ไรเดอร์ 1" หรือชื่อไรเดอร์จริง
  color: string;
  boxes: number;
  km: number;
  fee: number;
  code?: string; // เลขใบงาน (มีเมื่อบันทึกแล้ว)
  stops: ViewStop[];
}

const OPTIONS_KEY = 'dispatch.routeOptions';

// หน้าจัดเส้นทาง: คำนวณแบ่งออเดอร์ให้ไรเดอร์ → ดูบนแผนที่ + สรุปกำไร → บันทึกเป็นเวอร์ชัน → เลือกใช้ ออกเลขใบงาน
@Component({
  selector: 'app-dispatch',
  imports: [DecimalPipe, RouterLink, MapComponent],
  templateUrl: './dispatch.component.html',
  styleUrl: './dispatch.component.css',
})
export class DispatchComponent implements OnInit {
  private orderApi = inject(OrderService);
  private settingApi = inject(SettingService);
  private riderApi = inject(RiderService);
  private planApi = inject(PlanService);
  private road = inject(RoadService);

  readonly shop = this.settingApi.shop;
  readonly today = todayBangkok();

  // ---- state ----
  orders = signal<Order[]>([]);
  riders = signal<Rider[]>([]);
  opt = signal<RouteOptions>(loadOptions()); // ตัวเลือกเส้นทางฝั่งหน้าจอ (จำไว้ในเบราว์เซอร์)
  solutions = signal<Solution[]>([]); // ผลจาก optimize() เรียงจากดีสุด
  sel = signal(0); // ทางเลือกที่กำลังดู
  plan = signal<Plan | null>(null); // แผนจาก server ที่กำลังดู (มีเลขใบงาน)
  versions = signal<Plan[]>([]); // ทุกเวอร์ชันของวันนี้ ไว้เทียบกำไร
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  success = signal('');
  roads = signal<Record<string, [number, number][]>>({}); // เส้นตามถนนจาก OSRM (key = จุดที่วิ่งผ่าน)

  // ฟอร์มตั้งค่า (ยังไม่บันทึก)
  draft = signal({ speed: 30, depart: '11:30', deadline: '12:30', ...DEFAULT_ROUTE_OPTIONS });

  // ---- computed ----
  limit = computed(() => limitMin(this.shop()));
  boxes = computed(() => this.orders().reduce((a, o) => a + o.quantity, 0));

  // ออเดอร์ที่ใส่ในแผนได้ (server ไม่รับ CANCELLED / DELIVERING / DELIVERED)
  plannable = computed(() => this.orders().filter((o) => o.status === 'PENDING' || o.status === 'ASSIGNED'));

  // ใบงานที่โชว์: ถ้าเพิ่งคำนวณ → ทางเลือกที่เลือกอยู่, ถ้าไม่ → แผนจาก server
  trips = computed<ViewTrip[]>(() => {
    const s = this.solutions()[this.sel()];
    if (s) {
      return s.trips.map((t) => ({
        key: 'd' + t.rider,
        title: this.riders()[t.rider - 1]?.fullName ?? `ไรเดอร์ ${t.rider}`,
        color: t.color,
        boxes: t.boxes,
        km: t.km,
        fee: t.fee,
        stops: t.stops.map((x) => ({ name: x.customerName, quantity: x.quantity, lat: x.lat, lng: x.lng, at: x.at })),
      }));
    }
    const p = this.plan();
    if (!p?.trips) return [];
    return p.trips.map((t) => ({
      key: t.jobCode,
      title: t.riderName,
      color: t.routeColor,
      boxes: t.boxCount,
      km: t.distanceKm,
      fee: t.deliveryFee,
      code: t.jobCode,
      stops: t.stops.map((x) => ({
        name: x.customerName,
        quantity: x.quantity,
        lat: x.lat,
        lng: x.lng,
        at: minutesBetween(t.departTime, x.eta),
        done: !!x.deliveredAt,
      })),
    }));
  });

  viewingPlan = computed(() => !this.solutions().length && !!this.plan()); // กำลังดูแผนจาก server

  // ตัวเลขสรุป: ผลคำนวณ → คำนวณในหน้าจอ, แผนจาก server → ใช้ตัวเลขที่ server คิดไว้
  sum = computed(() => {
    const s = this.solutions()[this.sel()];
    if (s) return summarize(s.trips, this.shop());
    const p = this.plan();
    if (!p) return null;
    const late = this.trips().reduce((a, t) => a + t.stops.filter((x) => x.at > this.limit()).length, 0);
    return {
      riders: p.riderCount,
      orders: this.trips().reduce((a, t) => a + t.stops.length, 0),
      boxes: p.totalBoxes,
      km: p.totalDistanceKm,
      revenue: p.revenue,
      food: p.foodCost,
      fee: p.deliveryCost,
      profit: p.profit,
      end: minutesBetween(this.shop().dispatchTime, p.latestEta),
      late,
    };
  });

  // หมุดบนแผนที่: สีตามไรเดอร์ เลขในหมุด = ลำดับจุด
  pins = computed<MapPin[]>(() =>
    this.trips().flatMap((r) =>
      r.stops.map((x, i) => ({
        lat: x.lat,
        lng: x.lng,
        color: r.color,
        label: String(i + 1),
        tooltip: `${r.title} · จุดที่ ${i + 1} · ${x.name} · ${x.quantity} กล่อง · ถึง ${this.t(x.at)}`,
      })),
    ),
  );

  // เส้นทาง: ใช้เส้นตามถนนถ้าโหลดมาแล้ว ไม่งั้นใช้เส้นตรงไปก่อน
  lines = computed<MapLine[]>(() =>
    this.trips().map((r) => {
      const pts = this.stopPoints(r);
      return { color: r.color, points: this.roads()[pts.join(';')] ?? pts };
    }),
  );

  constructor() {
    // ทุกครั้งที่ใบงานเปลี่ยน → ขอเส้นตามถนนทีละคัน (ไม่ยิงพร้อมกัน OSRM จะได้ไม่บล็อก)
    effect(() => {
      const all = this.trips().map((r) => this.stopPoints(r));
      (async () => {
        for (const pts of all) {
          const line = await this.road.path(pts);
          if (line) this.roads.update((m) => ({ ...m, [pts.join(';')]: line }));
        }
      })();
    });
  }

  // จุดที่ไรเดอร์วิ่งผ่าน: ร้าน → จุด 1 → จุด 2 → จุด 3 (และกลับร้านถ้าตั้ง back)
  private stopPoints(r: ViewTrip): [number, number][] {
    const shop: [number, number] = [this.shop().shopLat, this.shop().shopLng];
    const pts = r.stops.map((x) => [x.lat, x.lng] as [number, number]);
    return [shop, ...pts, ...(this.opt().back ? [shop] : [])];
  }

  ngOnInit(): void {
    this.load();
  }

  // โหลดค่าตั้ง + ไรเดอร์ + ออเดอร์วันนี้ + แผนล่าสุด + ทุกเวอร์ชัน
  load(): void {
    this.loading.set(true);
    this.settingApi.get().subscribe({ next: () => this.resetDraft(), error: () => this.resetDraft() });
    this.riderApi.getAll().subscribe({
      next: (rows) => this.riders.set(rows.filter((r) => r.isActive).sort((a, b) => a.riderId - b.riderId)),
      error: (e: Error) => this.error.set(e.message),
    });
    this.orderApi.getByDate(this.today).subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
    this.loadPlans();
  }

  private loadPlans(): void {
    this.planApi.getLatest(this.today).subscribe({ next: (p) => this.plan.set(p), error: () => this.plan.set(null) }); // 404 = ยังไม่มีแผน
    this.planApi.list(this.today).subscribe({ next: (rows) => this.versions.set(rows), error: () => {} });
  }

  // ปุ่ม "จัดเส้นทาง" / "คำนวณใหม่" (seed ใหม่ทุกครั้ง → กดซ้ำ = ได้ทางเลือกชุดใหม่)
  run(): void {
    this.clearMessages();
    const orders = this.plannable();
    if (!orders.length) {
      this.error.set('ยังไม่มีออเดอร์ที่จัดส่งได้ของวันนี้ ไปเพิ่มหรือจำลองที่หน้าออเดอร์ก่อน');
      return;
    }
    const riders = this.riders().length;
    const need = Math.ceil(orders.length / this.shop().maxOrdersPerRider);
    if (riders < need) {
      this.error.set(`ไรเดอร์ไม่พอ: มี ${orders.length} ออเดอร์ ต้องใช้อย่างน้อย ${need} คน แต่มีไรเดอร์ ${riders} คน`);
      return;
    }
    this.solutions.set(optimize(orders, { shop: this.shop(), opt: this.opt() }, riders, Date.now()));
    this.sel.set(0); // เริ่มที่ทางเลือกที่ดีที่สุด
  }

  // ปุ่ม "บันทึกและเลือกใช้" → POST /plans (เวอร์ชันใหม่) แล้ว PUT /plans/:id/select → ได้เลขใบงาน
  confirm(): void {
    const s = this.solutions()[this.sel()];
    if (!s || this.sum()?.late) return; // ส่งไม่ทัน = ห้ามยืนยัน
    const selected = this.versions().some((v) => v.status === 'SELECTED');
    if (selected && !confirm('วันนี้มีแผนที่เลือกใช้แล้ว เลขใบงานเดิมจะใช้ไม่ได้ เปลี่ยนเป็นแผนนี้แทน?')) return;

    const riders = this.riders();
    const body: PlanRequest = {
      algorithm: ALGORITHM,
      planDate: this.today,
      departTime: this.shop().dispatchTime,
      trips: s.trips.map((t) => ({
        riderId: riders[t.rider - 1].riderId,
        routeColor: t.color,
        stops: t.stops.map((x) => ({ orderId: x.orderId, legDistanceKm: x.legKm, etaMin: x.at })),
      })),
    };

    this.clearMessages();
    this.busy.set(true);
    this.planApi.create(body).subscribe({
      next: (draft) =>
        this.planApi.select(draft.planId).subscribe({
          next: (p) => this.afterSelect(p, `บันทึกแผนเวอร์ชัน ${p.versionNo} และเลือกใช้แล้ว แจ้งเลขใบงานให้ไรเดอร์แต่ละคน`),
          error: (e: Error) => this.fail(e),
        }),
      error: (e: Error) => this.fail(e),
    });
  }

  // ตารางเทียบเวอร์ชัน: ดูรายละเอียดแผนเวอร์ชันนั้น
  view(v: Plan): void {
    this.clearMessages();
    this.planApi.getById(v.planId).subscribe({
      next: (p) => {
        this.plan.set(p);
        this.solutions.set([]);
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  // ตารางเทียบเวอร์ชัน: เลือกเวอร์ชันนี้ไปใช้แทน
  select(v: Plan): void {
    if (!confirm(`เลือกใช้แผนเวอร์ชัน ${v.versionNo} ? เลขใบงานของแผนเดิมจะใช้ไม่ได้`)) return;
    this.clearMessages();
    this.busy.set(true);
    this.planApi.select(v.planId).subscribe({
      next: (p) => this.afterSelect(p, `เลือกใช้แผนเวอร์ชัน ${p.versionNo} แล้ว`),
      error: (e: Error) => this.fail(e),
    });
  }

  private afterSelect(p: Plan, message: string): void {
    this.plan.set(p); // แผนที่ server ส่งกลับมา มีเลขใบงานแล้ว
    this.solutions.set([]); // กลับไปโชว์แผนจาก server
    this.busy.set(false);
    this.success.set(message);
    this.loadPlans();
    this.orderApi.getByDate(this.today).subscribe({ next: (rows) => this.orders.set(rows), error: () => {} });
  }

  private fail(e: Error): void {
    this.error.set(e.message);
    this.busy.set(false);
  }

  // นับจุดที่ไรเดอร์กด "ส่งแล้ว"
  doneCount(r: ViewTrip): number {
    return r.stops.filter((x) => x.done).length;
  }

  // นาทีหลังออกร้าน → เวลา เช่น 12 → "11:42"
  t(min: number): string {
    return clock(this.shop().dispatchTime, min);
  }

  // ---- ตั้งค่า ----
  private resetDraft(): void {
    const s = this.shop();
    this.draft.set({ speed: s.riderSpeedKmh, depart: s.dispatchTime, deadline: s.deadlineTime, ...this.opt() });
  }

  // แก้ค่าในฟอร์มทีละช่อง เช่น patch('speed', 25)
  patch<K extends keyof ReturnType<typeof this.draft>>(key: K, value: ReturnType<typeof this.draft>[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  // ความเร็ว/เวลาออก/เส้นตาย บันทึกที่ server, ตัวคูณถนน/เวลาจอด/ขากลับ จำไว้ในเบราว์เซอร์
  saveSetting(): void {
    const d = this.draft();
    this.clearMessages();
    if (!(d.speed > 0) || !(d.road >= 1) || !Number.isInteger(d.stopMin) || d.stopMin < 0 || !d.depart || !d.deadline) {
      this.error.set('ค่าตั้งไม่ถูกต้อง: ความเร็ว > 0, ตัวคูณถนน ≥ 1, นาทีจอดเป็นจำนวนเต็ม ≥ 0 และต้องใส่เวลาออก/เส้นตาย');
      return;
    }
    const opt: RouteOptions = { road: d.road, stopMin: d.stopMin, back: d.back };
    this.opt.set(opt);
    saveOptions(opt);

    this.busy.set(true);
    this.settingApi.update({ riderSpeedKmh: d.speed, dispatchTime: d.depart, deadlineTime: d.deadline }).subscribe({
      next: () => {
        this.busy.set(false);
        if (this.solutions().length) this.run(); // คำนวณใหม่ให้เลย ตัวเลขจะได้ตรงกับค่าใหม่
        this.success.set('บันทึกค่าตั้งแล้ว');
      },
      error: (e: Error) => this.fail(e),
    });
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
}

// "11:30" → "11:42" = 12 นาที
function minutesBetween(from: string, to: string): number {
  const m = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
  return m(to) - m(from);
}

function loadOptions(): RouteOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    return raw ? { ...DEFAULT_ROUTE_OPTIONS, ...JSON.parse(raw) } : DEFAULT_ROUTE_OPTIONS;
  } catch {
    return DEFAULT_ROUTE_OPTIONS;
  }
}

function saveOptions(o: RouteOptions): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(o));
  } catch {
    // เบราว์เซอร์ปิด storage → ใช้ค่าในหน่วยความจำไปก่อน
  }
}
