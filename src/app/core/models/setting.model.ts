// ค่าตั้งการคำนวณเส้นทาง — GET/PUT /settings
export interface Setting {
  speed: number; // กม./ชม. (rider_speed_kmh)
  road: number; // ตัวคูณระยะเส้นตรง → ระยะถนน
  stopMin: number; // นาทีที่จอดต่อจุด
  depart: string; // "HH:MM" เวลาออกจากร้าน (dispatch_time)
  back: boolean; // นับระยะขากลับร้านด้วยไหม
}

// กฎธุรกิจของร้าน — ค่าเดียวกับแถวใน shop_settings (lunch_route.sql)
// ใช้คำนวณรายได้/ต้นทุน/ค่าส่งฝั่งหน้าจอ
export const SHOP = {
  name: 'ข้าวกล่องเดลิเวอรี ส่งด่วนมื้อเที่ยง',
  lat: 16.246,
  lng: 103.2515,
  boxPrice: 65, // ราคาขาย/กล่อง
  boxCost: 40, // ต้นทุน/กล่อง
  riderBaseFee: 15, // ค่าเรียกไรเดอร์/ครั้ง
  riderRatePerKmBox: 2, // บาท/กม./กล่อง
  maxOrdersPerRider: 3,
  dispatchTime: '11:30',
  deadlineTime: '12:30',
} as const;

export const DEFAULT_SETTING: Setting = {
  speed: 30,
  road: 1.3,
  stopMin: 2,
  depart: SHOP.dispatchTime,
  back: false,
};

// สีเส้นทางของไรเดอร์แต่ละคน (route_color)
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
