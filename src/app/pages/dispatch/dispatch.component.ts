import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Order } from '../../core/models/order.model';
import { Plan, RouteRequest, StopRequest } from '../../core/models/plan.model';
import { DEFAULT_SETTING, SHOP, Setting } from '../../core/models/setting.model';
import { OrderService } from '../../core/services/order.service';
import { PlanService } from '../../core/services/plan.service';
import { RoadService } from '../../core/services/road.service';
import { SettingService } from '../../core/services/setting.service';
import { LIMIT_MIN, Solution, clock, optimize, summarize } from '../../core/utils/optimizer';
import { MapComponent, MapLine, MapPin } from '../../shared/map/map.component';

// ใบงานที่แสดงบนหน้าจอ: ถ้ายืนยันแล้วจะมี code (รหัสใบงาน) และ done (ส่งแล้ว) มาด้วย
type ViewStop = StopRequest & { done?: boolean };
type ViewRoute = Omit<RouteRequest, 'stops'> & { code?: string; stops: ViewStop[] };

// หน้าจัดเส้นทาง: คำนวณแบ่งออเดอร์ให้ไรเดอร์ → ดูบนแผนที่ + สรุปกำไร → ยืนยันออกรหัสใบงาน
@Component({
  selector: 'app-dispatch',
  imports: [DecimalPipe, RouterLink, MapComponent],
  templateUrl: './dispatch.component.html',
  styleUrl: './dispatch.component.css',
})
export class DispatchComponent implements OnInit {
  private orderApi = inject(OrderService);
  private settingApi = inject(SettingService);
  private planApi = inject(PlanService);
  private road = inject(RoadService);

  readonly LIMIT_MIN = LIMIT_MIN;
  readonly maxOrders = SHOP.maxOrdersPerRider;

  // ---- state ----
  orders = signal<Order[]>([]);
  setting = signal<Setting>(DEFAULT_SETTING);
  solutions = signal<Solution[]>([]); // ผลจาก optimize() เรียงจากดีสุด
  sel = signal(0);                    // ทางเลือกที่กำลังดู
  plan = signal<Plan | null>(null);   // แผนที่ยืนยันแล้วของวันนี้ (มีรหัสใบงาน)
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  success = signal('');
  draft = signal<Setting>(DEFAULT_SETTING); // ค่าตั้งที่กำลังแก้ในฟอร์ม (ยังไม่บันทึก)
  roads = signal<Record<string, [number, number][]>>({}); // เส้นตามถนนจาก OSRM (key = จุดที่วิ่งผ่าน)


  // ---- computed (คำนวณจาก state อัตโนมัติ) ----
  boxes = computed(() => this.orders().reduce((a, o) => a + o.boxes, 0));

  // ใบงานที่โชว์: ถ้าเพิ่งคำนวณ → ทางเลือกที่เลือกอยู่, ถ้าไม่ → แผนที่ยืนยันแล้ว
  routes = computed<ViewRoute[]>(() => {
    const s = this.solutions()[this.sel()];
    if (s) return s.routes;
    return (this.plan()?.routes ?? []).map((r) => ({ ...r, stops: r.stops.map((x) => ({ ...x, id: x.id ?? 0 })) }));
  });

  confirmed = computed(() => !this.solutions().length && !!this.plan()); // กำลังดูแผนที่ยืนยันแล้ว
  sum = computed(() => summarize(this.routes()));                       // ตัวเลขสรุป (กำไร ฯลฯ)

  // หมุดบนแผนที่: สีตามไรเดอร์ เลขในหมุด = ลำดับจุด
  pins = computed<MapPin[]>(() =>
    this.routes().flatMap((r) =>
      r.stops.map((x, i) => ({
        lat: x.lat, lng: x.lng, color: r.color, label: String(i + 1),
        tooltip: `ไรเดอร์ ${r.rider} · จุดที่ ${i + 1} · ${x.name} · ${x.boxes} กล่อง · ถึง ${this.t(x.at)}`,
      })),
    ),
  );

  // เส้นทาง: ใช้เส้นตามถนนถ้าโหลดมาแล้ว ไม่งั้นใช้เส้นตรงไปก่อน
  lines = computed<MapLine[]>(() =>
    this.routes().map((r) => {
      const pts = this.stopPoints(r);
      return { color: r.color, points: this.roads()[pts.join(';')] ?? pts };
    }),
  );

  constructor() {
    // ทุกครั้งที่ใบงานเปลี่ยน → ขอเส้นตามถนนทีละคัน (ไม่ยิงพร้อมกัน OSRM จะได้ไม่บล็อก)
    effect(() => {
      const all = this.routes().map((r) => this.stopPoints(r));
      (async () => {
        for (const pts of all) {
          const line = await this.road.path(pts);
          if (line) this.roads.update((m) => ({ ...m, [pts.join(';')]: line }));
        }
      })();
    });
  }

  // จุดที่ไรเดอร์วิ่งผ่าน: ร้าน → จุด 1 → จุด 2 → จุด 3 (และกลับร้านถ้าตั้ง back)
  private stopPoints(r: ViewRoute): [number, number][] {
    const shop: [number, number] = [SHOP.lat, SHOP.lng];
    const pts = r.stops.map((x) => [x.lat, x.lng] as [number, number]);
    return [shop, ...pts, ...(this.setting().back ? [shop] : [])];
  }

  ngOnInit(): void {
    this.load();
  }

  // โหลดออเดอร์วันนี้ + ค่าตั้ง + แผนที่ยืนยันแล้ว (ถ้ามี)
  load(): void {
    this.loading.set(true);
    this.orderApi.getByDate().subscribe({
      next: (rows) => { this.orders.set(rows); this.loading.set(false); },
      error: (e: Error) => { this.error.set(e.message); this.loading.set(false); },
    });
    this.settingApi.get().subscribe({
      next: (s) => {
        const v = { ...s, speed: +s.speed, road: +s.road, stopMin: +s.stopMin }; // DECIMAL จาก MySQL มาเป็นข้อความ → แปลงเป็นตัวเลข
        this.setting.set(v);
        this.draft.set(v);
      },
      error: () => { }, // ไม่มี = ใช้ค่าเริ่มต้น
    });
    this.planApi.getLatest().subscribe({ next: (p) => this.plan.set(p), error: () => this.plan.set(null) }); // 404 = ยังไม่มีแผน
  }


  // ปุ่ม "จัดเส้นทาง" / "คำนวณใหม่" (seed ใหม่ทุกครั้ง → กดซ้ำ = ได้ทางเลือกชุดใหม่)
  run(): void {
    this.clearMessages();
    if (!this.orders().length) {
      this.error.set('ยังไม่มีออเดอร์ของวันนี้ ไปเพิ่มหรือจำลองที่หน้าออเดอร์ก่อน');
      return;
    }
    this.solutions.set(optimize(this.orders(), this.setting(), Date.now()));
    this.sel.set(0); // เริ่มที่ทางเลือกที่ดีที่สุด
  }

  // ปุ่ม "ยืนยัน" → server ออกรหัสใบงาน 4 หลักให้ไรเดอร์ทุกคน
  confirm(): void {
    const s = this.solutions()[this.sel()];
    if (!s || this.sum().late) return; // ส่งไม่ทัน = ห้ามยืนยัน
    if (this.plan() && !confirm('วันนี้มีแผนที่ยืนยันแล้ว รหัสใบงานเดิมจะใช้ไม่ได้ ยืนยันแผนใหม่แทน?')) return;
    this.clearMessages();
    this.busy.set(true);
    this.planApi.confirm({ sig: s.sig, depart: this.setting().depart, routes: s.routes }).subscribe({
      next: (p) => {
        this.plan.set(p);       // แผนที่ server ส่งกลับมา มีรหัสใบงานแล้ว
        this.solutions.set([]); // กลับไปโชว์แผนที่ยืนยันแล้ว
        this.busy.set(false);
        this.success.set('ออกใบงานแล้ว แจ้งรหัส 4 หลักให้ไรเดอร์แต่ละคน');
      },
      error: (e: Error) => { this.error.set(e.message); this.busy.set(false); },
    });
  }

  // นับจุดที่ไรเดอร์กด "ส่งแล้ว"
  doneCount(r: ViewRoute): number {
    return r.stops.filter((x) => x.done).length;
  }

  // นาทีหลังออกร้าน → เวลา เช่น 12 → "11:42"
  t(min: number): string {
    return clock(this.setting().depart, min);
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }

  // แก้ค่าในฟอร์มทีละช่อง เช่น patch('speed', 25)
  patch<K extends keyof Setting>(key: K, value: Setting[K]): void {
    this.draft.update((d) => ({ ...d, [key]: value }));
  }

  // บันทึกค่าตั้งลง server แล้วคำนวณเส้นทางใหม่ด้วยค่าใหม่ (ถ้ากำลังดูผลคำนวณอยู่)
  saveSetting(): void {
    const d = this.draft();
    this.clearMessages();
    if (!(d.speed > 0) || !(d.road >= 1) || !Number.isInteger(d.stopMin) || d.stopMin < 0 || !d.depart) {
      this.error.set('ค่าตั้งไม่ถูกต้อง: ความเร็ว > 0, ตัวคูณถนน ≥ 1, นาทีจอดเป็นจำนวนเต็ม ≥ 0 และต้องใส่เวลาออก');
      return;
    }
    this.busy.set(true);
    this.settingApi.update(d).subscribe({
      next: () => {
        this.setting.set(d);
        this.busy.set(false);
        if (this.solutions().length) this.run(); // คำนวณใหม่ให้เลย ตัวเลขจะได้ตรงกับค่าใหม่
        this.success.set('บันทึกค่าตั้งแล้ว');
      },
      error: (e: Error) => { this.error.set(e.message); this.busy.set(false); },
    });
  }
}