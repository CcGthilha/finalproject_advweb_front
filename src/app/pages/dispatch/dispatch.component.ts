import { Component } from '@angular/core';

// TODO (ส่วนของเพื่อน): หน้าจัดเส้นทาง
// - ดึงออเดอร์วันนี้ (OrderService.getByDate) + ค่าตั้ง (SettingService.get)
// - คำนวณแบ่งกลุ่มไรเดอร์ละไม่เกิน 3 ออเดอร์ หาลำดับจุดที่สั้นที่สุด
// - แสดงแผนที่ <app-map [pins] [lines]> แยกสีตาม ROUTE_COLORS
// - สรุป รายได้ / ค่าอาหาร / ค่าส่ง / กำไร และเวลาถึงจุดสุดท้ายเทียบ 12:30
// - ปุ่ม "คำนวณใหม่" และ "ยืนยัน" (PlanService.confirm) เพื่อออกรหัสใบงาน
@Component({
  selector: 'app-dispatch',
  template: `
    <div class="card">
      <h1>จัดเส้นทาง</h1>
      <p class="muted">หน้านี้ยังไม่ได้ทำ — รอเพื่อนในกลุ่มพัฒนาต่อ</p>
    </div>
  `,
})
export class DispatchComponent {}
