// ตอน ng serve ใช้ไฟล์นี้แทน environment.ts (ตั้งใน angular.json → fileReplacements)
// เรียกผ่าน /api แล้ว dev server ส่งต่อไป Render ตาม proxy.conf.json
// (เลี่ยง CORS ที่ server ยังไม่ได้อนุญาต http://localhost:4200)
export const environment = {
  apiUrl: '/api',
};
