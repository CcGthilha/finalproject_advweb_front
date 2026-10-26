// วันที่วันนี้ตามเวลาไทย รูปแบบ YYYY-MM-DD (เหมือน todayBangkok() ฝั่ง server)
export function todayBangkok(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}
