// ค่าตั้งของร้าน — ตาราง shop_settings (แถวเดียว) / GET, PUT /settings
// กฎธุรกิจทั้งหมดเก็บที่ server ไม่ hard-code ในหน้าจอ
export interface ShopSetting {
  shopName: string;
  shopLat: number; // จุดเริ่มต้นของทุกเส้นทาง
  shopLng: number;
  boxPrice: number; // ราคาขาย/กล่อง
  boxCost: number; // ต้นทุน/กล่อง
  riderBaseFee: number; // ค่าเรียกไรเดอร์/ครั้ง
  riderRatePerKmBox: number; // บาท/กม./กล่อง
  riderSpeedKmh: number;
  maxOrdersPerRider: number;
  maxBoxesPerOrder: number;
  serviceRadiusKm: number; // รับลูกค้าในรัศมีนี้จากร้าน
  dispatchTime: string; // "HH:MM" เวลาออกจากร้าน
  deadlineTime: string; // "HH:MM" ต้องถึงทุกจุดก่อนเวลานี้
}

// ค่าเริ่มต้น (ตรงกับ seed ใน lunch_route.sql) ใช้ระหว่างรอโหลดจาก server
export const DEFAULT_SHOP: ShopSetting = {
  shopName: 'ข้าวกล่องเดลิเวอรี ส่งด่วนมื้อเที่ยง',
  shopLat: 16.246,
  shopLng: 103.2515,
  boxPrice: 65,
  boxCost: 40,
  riderBaseFee: 15,
  riderRatePerKmBox: 2,
  riderSpeedKmh: 30,
  maxOrdersPerRider: 3,
  maxBoxesPerOrder: 3,
  serviceRadiusKm: 3,
  dispatchTime: '11:30',
  deadlineTime: '12:30',
};

// จุดตั้งต้นแผนที่ (ร้าน)
export const SHOP = { name: DEFAULT_SHOP.shopName, lat: DEFAULT_SHOP.shopLat, lng: DEFAULT_SHOP.shopLng };

// ตัวเลือกการคำนวณเส้นทางที่ใช้เฉพาะฝั่งหน้าจอ (server ไม่ได้เก็บ)
export interface RouteOptions {
  road: number; // ตัวคูณระยะเส้นตรง → ระยะถนน
  stopMin: number; // นาทีที่จอดส่งต่อจุด
  back: boolean; // นับระยะขากลับร้านด้วยไหม
}

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = { road: 1.3, stopMin: 2, back: false };

// สีเส้นทางของไรเดอร์แต่ละคน (route_color ต้องเป็น #RRGGBB)
export const ROUTE_COLORS = [
  '#E53935',
  '#43A047',
  '#1E88E5',
  '#FB8C00',
  '#8E24AA',
  '#00897B',
  '#6D4C41',
  '#C2185B',
  '#5E35B1',
  '#7CB342',
];
