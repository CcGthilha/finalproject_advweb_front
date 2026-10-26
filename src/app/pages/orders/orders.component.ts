import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Customer } from '../../core/models/customer.model';
import { MAX_BOXES_PER_ORDER, MIN_BOXES, Order } from '../../core/models/order.model';
import { SHOP } from '../../core/models/setting.model';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { todayBangkok } from '../../core/utils/date';
import { MapComponent, MapPin } from '../../shared/map/map.component';

// หน้าจัดการออเดอร์: ดูออเดอร์รายวัน เพิ่ม แก้จำนวนกล่อง ลบ ล้างทั้งหมด และจำลองออเดอร์
@Component({
  selector: 'app-orders',
  imports: [ReactiveFormsModule, DecimalPipe, MapComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  private orderApi = inject(OrderService);
  private customerApi = inject(CustomerService);
  private fb = inject(FormBuilder);

  readonly boxOptions = Array.from(
    { length: MAX_BOXES_PER_ORDER - MIN_BOXES + 1 },
    (_, i) => MIN_BOXES + i,
  ); // [1, 2, 3]
  readonly today = todayBangkok();

  // ---- state ----
  date = signal(this.today);
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  loading = signal(false);
  busy = signal(false); // กำลังส่งคำสั่งเขียนข้อมูล
  error = signal('');
  success = signal('');

  isToday = computed(() => this.date() === this.today);

  // server เพิ่มออเดอร์ได้เฉพาะวันนี้ → ลูกค้าที่สั่งแล้วไม่ต้องให้เลือกซ้ำ
  availableCustomers = computed(() => {
    const ordered = new Set(this.orders().map((o) => o.customerId));
    return this.customers().filter((c) => !ordered.has(c.id));
  });

  // สรุปยอดของวัน (ยังไม่รวมค่าส่ง — ค่าส่งคำนวณในหน้า dispatch)
  summary = computed(() => {
    const boxes = this.orders().reduce((sum, o) => sum + o.boxes, 0);
    return {
      orders: this.orders().length,
      boxes,
      revenue: boxes * SHOP.boxPrice,
      foodCost: boxes * SHOP.boxCost,
    };
  });

  pins = computed<MapPin[]>(() =>
    this.orders().map((o) => ({
      lat: o.lat,
      lng: o.lng,
      label: String(o.boxes),
      tooltip: `#${o.id} ${o.name} · ${o.boxes} กล่อง`,
    })),
  );

  addForm = this.fb.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    boxes: [1, [Validators.required, Validators.min(MIN_BOXES), Validators.max(MAX_BOXES_PER_ORDER)]],
  });

  simulateCount = signal<number | null>(null);

  ngOnInit(): void {
    this.customerApi.getAll().subscribe({
      next: (rows) => this.customers.set(rows),
      error: (e: Error) => this.error.set(e.message),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.orderApi.getByDate(this.date()).subscribe({
      next: (rows) => {
        this.orders.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  changeDate(value: string): void {
    if (!value) return;
    this.date.set(value);
    this.clearMessages();
    this.load();
  }

  add(): void {
    this.clearMessages();
    if (this.addForm.invalid) {
      this.error.set('กรุณาเลือกลูกค้าและจำนวนกล่อง');
      return;
    }
    const { customerId, boxes } = this.addForm.getRawValue();
    this.run(this.orderApi.create({ customerId: +customerId, boxes: +boxes }), 'เพิ่มออเดอร์แล้ว', () =>
      this.addForm.reset(),
    );
  }

  changeBoxes(o: Order, value: string): void {
    const boxes = +value;
    if (boxes === o.boxes) return;
    this.clearMessages();
    this.run(this.orderApi.updateBoxes(o.id, boxes), `แก้ออเดอร์ #${o.id} เป็น ${boxes} กล่องแล้ว`);
  }

  remove(o: Order): void {
    if (!confirm(`ลบออเดอร์ #${o.id} ของ ${o.name} ?`)) return;
    this.clearMessages();
    this.run(this.orderApi.delete(o.id), `ลบออเดอร์ #${o.id} แล้ว`);
  }

  clearAll(): void {
    if (!confirm(`ล้างออเดอร์ทั้งหมดของวันที่ ${this.date()} ?`)) return;
    this.clearMessages();
    this.run(this.orderApi.clear(this.date()), 'ล้างออเดอร์ทั้งหมดแล้ว');
  }

  // จำลองลูกค้าสั่งพร้อมกัน (server ล้างออเดอร์วันนี้แล้วสุ่มใหม่)
  simulate(): void {
    const n = this.simulateCount() || undefined;
    const msg = n ? `${n} ออเดอร์` : 'แบบสุ่ม 20-30 ออเดอร์';
    if (this.orders().length && !confirm(`ออเดอร์วันนี้จะถูกล้างแล้วสุ่มใหม่ ${msg} ต่อไหม?`)) return;
    this.clearMessages();
    this.run(this.orderApi.simulate(n), 'จำลองออเดอร์เรียบร้อย');
  }

  // ส่งคำสั่งเขียนข้อมูล แล้วโหลดตารางใหม่
  private run(req$: ReturnType<OrderService['delete']>, okMessage: string, after?: () => void): void {
    this.busy.set(true);
    req$.subscribe({
      next: () => {
        this.success.set(okMessage);
        this.busy.set(false);
        after?.();
        this.load();
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.busy.set(false);
        this.load(); // คืนค่าในตารางให้ตรงกับ server
      },
    });
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
}
