import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// โครงหน้าหลัก: แถบเมนูด้านบน + พื้นที่แสดงหน้าย่อย (router-outlet)
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css',
})
export class LayoutComponent {
  menus = [
    { path: '/customers', label: 'ลูกค้า' },
    { path: '/orders', label: 'ออเดอร์' },
    { path: '/dispatch', label: 'จัดเส้นทาง' },
    { path: '/rider', label: 'ไรเดอร์' },
  ];
}
