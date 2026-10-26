import { Component } from '@angular/core';

// TODO (ส่วนของเพื่อน): หน้าไรเดอร์ (มือถือ)
// - กรอกรหัสใบงาน 4 หลัก → PlanService.getRouteByCode(code)
// - แสดงจำนวนกล่องที่ต้องหยิบ ลำดับจุดส่ง เวลาที่ควรถึง
// - ปุ่มนำทาง Google Maps: https://www.google.com/maps/dir/?api=1&destination=lat,lng
// - ปุ่มโทร (tel:) และปุ่ม "ส่งแล้ว" → PlanService.markStop(code, seq, true)
@Component({
  selector: 'app-rider',
  template: `
    <div class="card">
      <h1>ใบงานไรเดอร์</h1>
      <p class="muted">หน้านี้ยังไม่ได้ทำ — รอเพื่อนในกลุ่มพัฒนาต่อ</p>
    </div>
  `,
})
export class RiderComponent {}
