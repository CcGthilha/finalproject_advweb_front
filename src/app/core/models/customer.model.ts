// ลูกค้า — ตาราง customers (lunch_route.sql) / JSON จาก GET /customers
export interface Customer {
  customerId: number;
  fullName: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
  isActive: boolean; // false = ถูกลบแล้ว (soft delete)
  createdAt: string;
  updatedAt: string;
}

// body ที่ส่งไป POST /customers และ PUT /customers/:id
// server ตรวจว่าพิกัดต้องอยู่ในรัศมี serviceRadiusKm จากร้าน
export interface CustomerRequest {
  fullName: string;
  phone: string;
  address?: string | null;
  lat: number;
  lng: number;
}

// ผลจาก GET /customers/nearby มีระยะทางจากจุดที่ค้นเพิ่มมา
export interface NearbyCustomer extends Customer {
  distanceKm: number;
}
