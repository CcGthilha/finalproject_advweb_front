// รูปแบบคำตอบทั่วไปจาก server ตอน เพิ่ม/แก้/ลบ
export interface WriteResult {
  affected_row: number;
  last_idx?: number; // id ที่เพิ่งสร้าง (POST)
}

// server ส่ง error กลับมาเป็น { error: "ข้อความ" }
export interface ApiError {
  error: string;
}
