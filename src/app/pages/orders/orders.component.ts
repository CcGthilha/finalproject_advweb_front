import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { WriteResult } from '../../core/models/api.model';
import { Customer } from '../../core/models/customer.model';
import { MAX_BOXES_PER_ORDER, MIN_BOXES, ORDER_STATUS_LABEL, Order } from '../../core/models/order.model';
import { CustomerService } from '../../core/services/customer.service';
import { OrderService } from '../../core/services/order.service';
import { SettingService } from '../../core/services/setting.service';
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
  private settingApi = inject(SettingService);
  private fb = inject(FormBuilder);

  readonly shop = this.settingApi.shop;
  readonly statusLabel = ORDER_STATUS_LABEL;
  readonly today = todayBangkok();

  // ---- state ----
  date = signal(this.today);
  orders = signal<Order[]>([]);
  customers = signal<Customer[]>([]);
  loading = signal(false);
  busy = signal(false); // กำลังส่งคำสั่งเขียนข้อมูล
  error = signal('');
  success = signal('');
  simulateCount = signal<number | null>(null);

  isToday = computed(() => this.date() === this.today);

  // ตัวเลือกจำนวนกล่อง [1..maxBoxesPerOrder] ตามค่าตั้งของร้าน
  boxOptions = computed(() => {
    const max = Math.min(MAX_BOXES_PER_ORDER, this.shop().maxBoxesPerOrder);
    return Array.from({ length: max - MIN_BOXES + 1 }, (_, i) => MIN_BOXES + i);
  });

  // ลูกค้าที่ยังไม่มีออเดอร์ในวันนั้น (กันสั่งซ้ำ)
  availableCustomers = computed(() => {
    const ordered = new Set(this.orders().map((o) => o.customerId));
    return this.customers().filter((c) => !ordered.has(c.customerId));
  });

  // สรุปยอดของวัน (ค่าส่งคำนวณในหน้า dispatch)
  summary = computed(() => {
    const boxes = this.orders().reduce((sum, o) => sum + o.quantity, 0);
    return {
      orders: this.orders().length,
      boxes,
      revenue: boxes * this.shop().boxPrice,
      foodCost: boxes * this.shop().boxCost,
    };
  });

  pins = computed<MapPin[]>(() =>
    this.orders().map((o) => ({
      lat: o.lat,
      lng: o.lng,
      label: String(o.quantity),
      tooltip: `#${o.orderId} ${o.customerName} · ${o.quantity} กล่อง`,
    })),
  );

  addForm = this.fb.nonNullable.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(MIN_BOXES), Validators.max(MAX_BOXES_PER_ORDER)]],
  });

  ngOnInit(): void {
    this.settingApi.get().subscribe({ error: () => {} });
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
    const { customerId, quantity } = this.addForm.getRawValue();
    this.run(
      this.orderApi.create({ customerId: +customerId, quantity: +quantity, deliveryDate: this.date() }),
      'เพิ่มออเดอร์แล้ว',
      () => this.addForm.reset(),
    );
  }

  changeQuantity(o: Order, value: string): void {
    const quantity = +value;
    if (quantity === o.quantity) return;
    this.clearMessages();
    this.run(this.orderApi.update(o.orderId, { quantity }), `แก้ออเดอร์ #${o.orderId} เป็น ${quantity} กล่องแล้ว`);
  }

  remove(o: Order): void {
    if (!confirm(`ลบออเดอร์ #${o.orderId} ของ ${o.customerName} ?`)) return;
    this.clearMessages();
    this.run(this.orderApi.delete(o.orderId), `ลบออเดอร์ #${o.orderId} แล้ว`);
  }

  clearAll(): void {
    if (!confirm(`ล้างออเดอร์ทั้งหมดของวันที่ ${this.date()} ?\nแผนที่เลือกไว้ของวันนั้นจะถูกยกเลิกด้วย`)) return;
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
  private run(req$: Observable<WriteResult>, okMessage: string, after?: () => void): void {
    this.busy.set(true);
    req$.subscribe({
      next: () => {
        this.success.set(okMessage);
        this.busy.set(false);
        after?.();
        this.load();
      },
      error: (e: Error) => {
        this.error.set(e.message); // เช่น ออเดอร์สถานะ ASSIGNED แก้ไขไม่ได้ (409)
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
