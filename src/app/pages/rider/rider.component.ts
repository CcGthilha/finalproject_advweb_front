import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Route, Stop } from '../../core/models/plan.model';
import { SHOP } from '../../core/models/setting.model';
import { PlanService } from '../../core/services/plan.service';
import { SettingService } from '../../core/services/setting.service';
import { LIMIT_MIN, clock } from '../../core/utils/optimizer';

// หน้าไรเดอร์ (มือถือ): กรอกรหัสใบงาน 4 หลัก → ดูกล่องที่ต้องหยิบ ลำดับจุดส่ง → นำทาง / โทร / กดส่งแล้ว
@Component({
  selector: 'app-rider',
  templateUrl: './rider.component.html',
  styleUrl: './rider.component.css',
})
export class RiderComponent implements OnInit {
  private planApi = inject(PlanService);
  private settingApi = inject(SettingService);
  private router = inject(Router);
  private query = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly LIMIT_MIN = LIMIT_MIN;

  // ---- state ----
  code = signal('');                  // รหัสที่พิมพ์ในช่อง
  route = signal<Route | null>(null); // ใบงานที่เปิดอยู่
  depart = signal<string>(SHOP.dispatchTime);
  loading = signal(false);
  busy = signal(false);
  error = signal('');

  done = computed(() => this.route()?.stops.filter((s) => s.done).length ?? 0); // ส่งแล้วกี่จุด

  ngOnInit(): void {
    this.settingApi.get().subscribe({ next: (s) => this.depart.set(s.depart), error: () => {} });
    // เปิดจากลิงก์หน้า dispatch (/rider?code=5098) → โหลดใบงานให้เลย
    const c = this.query.get('code');
    if (c) {
      this.code.set(c);
      this.open();
    }
  }

  // ปุ่ม "ดูใบงาน"
  open(): void {
    const c = this.code().trim();
    this.error.set('');
    if (!/^\d{4}$/.test(c)) {
      this.error.set('รหัสใบงานต้องเป็นตัวเลข 4 หลัก');
      return;
    }
    this.loading.set(true);
    this.planApi.getRouteByCode(c).subscribe({
      next: (r) => {
        this.route.set(r);
        this.loading.set(false);
        this.router.navigate([], { queryParams: { code: c } }); // ใส่รหัสใน URL → รีเฟรชแล้วไม่หาย
      },
      error: (e: Error) => { this.error.set(e.message); this.route.set(null); this.loading.set(false); },
    });
  }

  // ปุ่ม "ส่งแล้ว" / "ยกเลิก" → บันทึกที่ server แล้วอัปเดตบนจอ
  toggle(s: Stop): void {
    const r = this.route();
    if (!r) return;
    this.busy.set(true);
    this.planApi.markStop(r.code, s.seq, !s.done).subscribe({
      next: () => {
        this.route.set({ ...r, stops: r.stops.map((x) => (x.seq === s.seq ? { ...x, done: !s.done } : x)) });
        this.busy.set(false);
      },
      error: (e: Error) => { this.error.set(e.message); this.busy.set(false); },
    });
  }

  // ออกจากใบงาน กลับไปหน้ากรอกรหัส
  close(): void {
    this.route.set(null);
    this.code.set('');
    this.router.navigate([]);
  }

  // ลิงก์ Google Maps นำทางจากตำแหน่งปัจจุบันไปบ้านลูกค้า
  nav(s: Stop): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=driving`;
  }

  // ลิงก์ Google Maps ทั้งเส้น: ร้าน → จุด 1 → จุด 2 → จุดสุดท้าย
  navAll(r: Route): string {
    const pts = r.stops.map((s) => `${s.lat},${s.lng}`);
    const way = pts.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${SHOP.lat},${SHOP.lng}&destination=${pts[pts.length - 1]}`
      + (way ? `&waypoints=${encodeURIComponent(way)}` : '') + '&travelmode=driving';
  }

  t(min: number): string {
    return clock(this.depart(), min);
  }
}