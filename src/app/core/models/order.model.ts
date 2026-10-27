export type OrderStatus = 'PENDING' | 'ASSIGNED' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';

// ออเดอร์ที่ join ข้อมูลลูกค้ามาแล้ว — ตาราง orders + customers / JSON จาก GET /orders
export interface Order {
  orderId: number;
  customerId: number;
  deliveryDate: string; // "YYYY-MM-DD"
  quantity: number; // 1-3 กล่อง
  status: OrderStatus; // แก้/ลบได้เฉพาะ PENDING
  isSimulated: boolean; // มาจากปุ่มจำลองออเดอร์
  note: string | null;
  createdAt: string;
  updatedAt: string;
  customerName: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
}

// body ของ POST /orders (ไม่ใส่ deliveryDate = วันนี้)
export interface OrderRequest {
  customerId: number;
  quantity: number;
  deliveryDate?: string;
  note?: string;
}

// body ของ PUT /orders/:id
export interface OrderUpdate {
  quantity?: number;
  note?: string;
}

export const MIN_BOXES = 1;
export const MAX_BOXES_PER_ORDER = 3;

// ชื่อสถานะภาษาไทยสำหรับแสดงบนจอ
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'รอจัดส่ง',
  ASSIGNED: 'จัดไรเดอร์แล้ว',
  DELIVERING: 'กำลังส่ง',
  DELIVERED: 'ส่งแล้ว',
  CANCELLED: 'ยกเลิก',
};
