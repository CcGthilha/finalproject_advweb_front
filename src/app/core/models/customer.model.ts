// ลูกค้า — ตรงกับตาราง customers (lunch_route.sql) และ JSON จาก GET /customers
export interface Customer {
  id: number;
  firstname: string;
  lastname: string;
  name: string; // firstname + ' ' + lastname (server ต่อให้) = full_name ใน lunch_route.sql
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

// body ที่ส่งไป POST /customers และ PUT /customers/:id
export interface CustomerRequest {
  firstname: string;
  lastname: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

// ผลจาก GET /customers/nearby มีระยะทางจากจุดที่ค้นเพิ่มมา
export interface NearbyCustomer extends Customer {
  distance_km: number;
}
