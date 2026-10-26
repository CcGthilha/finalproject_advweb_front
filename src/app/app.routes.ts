import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

// ทุกหน้าโหลดแบบ lazy (loadComponent) โหลดโค้ดเฉพาะตอนเปิดหน้านั้น
export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'customers' },
      {
        path: 'customers',
        title: 'จัดการลูกค้า',
        loadComponent: () => import('./pages/customers/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'orders',
        title: 'จัดการออเดอร์',
        loadComponent: () => import('./pages/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: 'dispatch',
        title: 'จัดเส้นทาง',
        loadComponent: () => import('./pages/dispatch/dispatch.component').then((m) => m.DispatchComponent),
      },
      {
        path: 'rider',
        title: 'ใบงานไรเดอร์',
        loadComponent: () => import('./pages/rider/rider.component').then((m) => m.RiderComponent),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
