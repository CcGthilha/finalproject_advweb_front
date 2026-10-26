// ออเดอร์ที่ join ข้อมูลลูกค้ามาแล้ว — ตาราง orders (lunch_route.sql) + customers
// boxes = quantity, orderDate = delivery_date
export interface Order {
  id: number;
  customerId: number;
  boxes: number; // 1-3 กล่อง (CHECK quantity BETWEEN 1 AND 3)
  orderDate: string; // "YYYY-MM-DD"
  name: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

// body ของ POST /orders (server ใส่วันที่วันนี้ให้เอง)
export interface OrderRequest {
  customerId: number;
  boxes: number;
}

export const MIN_BOXES = 1;
export const MAX_BOXES_PER_ORDER = 3;
