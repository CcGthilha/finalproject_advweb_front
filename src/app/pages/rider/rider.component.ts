import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Trip, TripStop } from '../../core/models/plan.model';
import { PlanService } from '../../core/services/plan.service';
import { SettingService } from '../../core/services/setting.service';

// หน้าไรเดอร์ (มือถือ): กรอกเลขใบงาน → ดูกล่องที่ต้องหยิบ ลำดับจุดส่ง → นำทาง / โทร / กดส่งแล้ว
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

  readonly shop = this.settingApi.shop;

  // ---- state ----
  code = signal(''); // เลขใบงานที่พิมพ์ในช่อง
  trip = signal<Trip | null>(null); // ใบงานที่เปิดอยู่
  loading = signal(false);
  busy = signal(false);
  error = signal('');

  done = computed(() => this.trip()?.stops.filter((s) => s.deliveredAt).length ?? 0); // ส่งแล้วกี่จุด

  ngOnInit(): void {
    this.settingApi.get().subscribe({ error: () => {} });
    // เปิดจากลิงก์หน้า dispatch (/rider?code=J26102702-01) → โหลดใบงานให้เลย
    const c = this.query.get('code');
    if (c) {
      this.code.set(c);
      this.open();
    }
  }

  // ปุ่ม "ดูใบงาน"
  open(): void {
    const c = this.code().trim().toUpperCase();
    this.error.set('');
    if (!/^[A-Z0-9-]{1,20}$/.test(c)) {
      this.error.set('เลขใบงานไม่ถูกต้อง เช่น J26102702-01');
      return;
    }
    this.loading.set(true);
    this.planApi.getTrip(c).subscribe({
      next: (t) => {
        this.trip.set(t);
        this.loading.set(false);
        this.router.navigate([], { queryParams: { code: c } }); // ใส่เลขใน URL → รีเฟรชแล้วไม่หาย
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.trip.set(null);
        this.loading.set(false);
      },
    });
  }

  // ปุ่ม "ส่งแล้ว" / "ยกเลิก" → server บันทึก delivered_at แล้วคืนใบงานที่อัปเดตแล้ว
  toggle(s: TripStop): void {
    const t = this.trip();
    if (!t) return;
    this.busy.set(true);
    this.planApi.markDelivered(t.jobCode, s.stopSeq, !s.deliveredAt).subscribe({
      next: (updated) => {
        this.trip.set(updated);
        this.busy.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.busy.set(false);
      },
    });
  }

  // ออกจากใบงาน กลับไปหน้ากรอกเลข
  close(): void {
    this.trip.set(null);
    this.code.set('');
    this.router.navigate([]);
  }

  // ลิงก์ Google Maps ทั้งเส้น: ร้าน → จุด 1 → จุด 2 → จุดสุดท้าย
  navAll(t: Trip): string {
    const pts = t.stops.map((s) => `${s.lat},${s.lng}`);
    const way = pts.slice(0, -1).join('|');
    return (
      `https://www.google.com/maps/dir/?api=1&origin=${this.shop().shopLat},${this.shop().shopLng}` +
      `&destination=${pts[pts.length - 1]}` +
      (way ? `&waypoints=${encodeURIComponent(way)}` : '') +
      '&travelmode=driving'
    );
  }
}
