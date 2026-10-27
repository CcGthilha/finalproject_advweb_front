import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// แปลง error ทุกตัวจาก HttpClient ให้เป็น Error ที่มีข้อความภาษาไทยอ่านง่าย
// หน้าจอจึงแค่ทำ  error: (e: Error) => this.message.set(e.message)
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message: string;
      if (err.status === 0) {
        // status 0 = เบราว์เซอร์ไม่ได้รับคำตอบ: เน็ตหลุด / server ปิดอยู่ / CORS ไม่อนุญาตเว็บนี้
        message = 'ติดต่อ server ไม่ได้ (server อาจกำลังเปิดเครื่อง หรือยังไม่ได้เพิ่ม URL เว็บนี้ใน CORS_ORIGINS)';
      } else if (err.error && typeof err.error.error === 'string') {
        message = err.error.error; // server ส่ง { error: "..." }
      } else {
        message = `เกิดข้อผิดพลาด (${err.status})`;
      }
      return throwError(() => Object.assign(new Error(message), { status: err.status }));
    }),
  );
