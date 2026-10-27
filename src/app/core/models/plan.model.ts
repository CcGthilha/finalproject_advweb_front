// แผนจัดส่ง — ตาราง route_plans / trips / trip_stops (lunch_route.sql)
// API: /plans และ /trips

export type PlanStatus = 'DRAFT' | 'SELECTED' | 'REJECTED';
export type TripStatus = 'ASSIGNED' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';

// จุดส่ง 1 จุดในใบงาน (trip_stops + ข้อมูลออเดอร์/ลูกค้า)
export interface TripStop {
  stopId: number;
  tripId: number;
  orderId: number;
  stopSeq: number; // 1 → 2 → 3
  legDistanceKm: number; // จากจุดก่อนหน้า
  cumDistanceKm: number; // สะสมจากร้าน
  eta: string; // "HH:MM"
  deliveredAt: string | null; // null = ยังไม่ส่ง
  quantity: number;
  customerName: string;
  phone: string;
  address: string | null;
  lat: number;
  lng: number;
  navUrl: string; // ลิงก์ Google Maps นำทาง
}

// ใบงานไรเดอร์ 1 ใบ (trips)
export interface Trip {
  tripId: number;
  planId: number;
  riderId: number;
  riderName: string;
  riderPhone: string;
  plateNo: string | null;
  jobCode: string; // เลขใบงาน เช่น J26102102-01
  routeColor: string;
  orderCount: number;
  boxCount: number; // ต้องหยิบกี่กล่อง
  distanceKm: number;
  durationMin: number;
  deliveryFee: number; // 15 + 2 × boxCount × distanceKm (server คำนวณ)
  departTime: string; // "HH:MM"
  estFinishTime: string; // "HH:MM"
  status: TripStatus;
  stops: TripStop[];
}

// แผนของวัน 1 เวอร์ชัน (route_plans / v_plan_compare)
export interface Plan {
  planId: number;
  planDate: string;
  versionNo: number;
  algorithm: string;
  status: PlanStatus;
  riderCount: number;
  totalBoxes: number;
  totalDistanceKm: number;
  revenue: number;
  foodCost: number;
  deliveryCost: number;
  profit: number;
  deliveryCostPerBox: number;
  latestEta: string; // "HH:MM" ไรเดอร์ที่ถึงจุดสุดท้ายช้าสุด
  isOnTime: boolean;
  createdAt?: string;
  trips?: Trip[]; // มีเฉพาะ GET /plans/:id, /plans/latest
}

// body ของ POST /plans — หน้าจอส่งแค่ลำดับจุด ระยะ เวลา
// server ดึงจำนวนกล่องจาก DB แล้วคำนวณค่าส่ง กำไร เวลาถึง และเลขใบงานเอง
export interface PlanRequest {
  algorithm: string;
  planDate?: string; // ไม่ใส่ = วันนี้
  departTime?: string; // ไม่ใส่ = dispatchTime ของร้าน
  trips: TripRequest[];
}

export interface TripRequest {
  riderId: number;
  routeColor: string; // "#RRGGBB"
  stops: { orderId: number; legDistanceKm: number; etaMin: number }[];
}

// แถวของ v_plan_map_points (GET /plans/:id/map)
export interface PlanMapPoint {
  planId: number;
  tripId: number;
  routeColor: string;
  riderName: string;
  stopSeq: number;
  customerName: string;
  lat: number;
  lng: number;
  eta: string;
}
