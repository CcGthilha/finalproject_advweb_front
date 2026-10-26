import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Customer, CustomerRequest } from '../../core/models/customer.model';
import { CustomerService } from '../../core/services/customer.service';
import { MapComponent, MapPin } from '../../shared/map/map.component';

// หน้าจัดการลูกค้า: ดูรายชื่อ ค้นหา เพิ่ม แก้ ลบ และคลิกแผนที่เพื่อปักหมุดบ้าน
@Component({
  selector: 'app-customers',
  imports: [ReactiveFormsModule, MapComponent],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.css',
})
export class CustomersComponent implements OnInit {
  private api = inject(CustomerService);
  private fb = inject(FormBuilder);

  // ---- state (signals) ----
  customers = signal<Customer[]>([]);
  keyword = signal('');
  editingId = signal<number | null>(null); // null = โหมดเพิ่มใหม่
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');

  // ---- ฟอร์ม ----
  form = this.fb.nonNullable.group({
    firstname: ['', Validators.required],
    lastname: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^0\d{8,9}$/)]],
    address: [''],
    lat: [0, [Validators.required, Validators.min(-90), Validators.max(90)]],
    lng: [0, [Validators.required, Validators.min(-180), Validators.max(180)]],
  });

  // ตำแหน่งที่กำลังเลือกในฟอร์ม (ยังไม่บันทึก) อัปเดตตามการคลิกแผนที่
  draftPoint = signal<{ lat: number; lng: number } | null>(null);

  // กรองรายชื่อตามคำค้นฝั่งหน้าจอ (ชื่อ/นามสกุล/เบอร์)
  filtered = computed(() => {
    const q = this.keyword().trim().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  });

  // หมุดลูกค้าทุกคน + หมุดชั่วคราวของฟอร์ม
  pins = computed<MapPin[]>(() => {
    const pins: MapPin[] = this.filtered().map((c) => ({
      lat: c.lat,
      lng: c.lng,
      label: String(c.id),
      color: c.id === this.editingId() ? '#E53935' : undefined,
      tooltip: `${c.name} (${c.phone})`,
    }));
    const p = this.draftPoint();
    if (p) pins.push({ ...p, label: '+', draft: true, tooltip: 'ตำแหน่งที่เลือก' });
    return pins;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.getAll().subscribe({
      next: (rows) => {
        this.customers.set(rows);
        this.loading.set(false);
      },
      error: (e: Error) => {
        this.error.set(e.message);
        this.loading.set(false);
      },
    });
  }

  // คลิกแผนที่ → ใส่ lat/lng ลงฟอร์ม (ปัด 6 ตำแหน่งให้ตรง DECIMAL(9,6))
  onMapPick(p: { lat: number; lng: number }): void {
    const lat = +p.lat.toFixed(6);
    const lng = +p.lng.toFixed(6);
    this.form.patchValue({ lat, lng });
    this.draftPoint.set({ lat, lng });
  }

  edit(c: Customer): void {
    this.clearMessages();
    this.editingId.set(c.id);
    this.form.setValue({
      firstname: c.firstname,
      lastname: c.lastname,
      phone: c.phone,
      address: c.address ?? '',
      lat: c.lat,
      lng: c.lng,
    });
    this.draftPoint.set(null);
  }

  resetForm(): void {
    this.editingId.set(null);
    this.form.reset();
    this.draftPoint.set(null);
  }

  save(): void {
    this.clearMessages();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!this.form.value.lat && !this.form.value.lng) {
      this.error.set('กรุณาคลิกบนแผนที่เพื่อปักหมุดบ้านลูกค้า');
      return;
    }
    const body: CustomerRequest = this.form.getRawValue();
    const id = this.editingId();
    const req$ = id === null ? this.api.create(body) : this.api.update(id, body);

    this.saving.set(true);
    req$.subscribe({
      next: () => {
        this.success.set(id === null ? 'เพิ่มลูกค้าเรียบร้อย' : 'บันทึกการแก้ไขเรียบร้อย');
        this.saving.set(false);
        this.resetForm();
        this.load();
      },
      error: (e: Error) => {
        this.error.set(e.message); // เช่น 409 เบอร์โทรนี้มีอยู่แล้ว
        this.saving.set(false);
      },
    });
  }

  remove(c: Customer): void {
    if (!confirm(`ลบ "${c.name}" ?\nออเดอร์ของลูกค้าคนนี้จะถูกลบด้วย`)) return;
    this.clearMessages();
    this.api.delete(c.id).subscribe({
      next: () => {
        this.success.set(`ลบ ${c.name} แล้ว`);
        if (this.editingId() === c.id) this.resetForm();
        this.load();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  // ใช้ใน template แสดงข้อความ error ใต้ช่อง
  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  private clearMessages(): void {
    this.error.set('');
    this.success.set('');
  }
}
