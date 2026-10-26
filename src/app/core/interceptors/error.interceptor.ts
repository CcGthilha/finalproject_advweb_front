import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

// แปลง error ทุกตัวจาก HttpClient ให้เป็น Error ที่มีข้อความภาษาไทยอ่านง่าย
// หน้าจอจึงแค่ทำ  error: (e: Error) => this.message.set(e.message)
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      let message: string;
      if (err.status === 0) {
        message = 'ติดต่อ server ไม่ได้ (เปิด backend ที่ port 3000 แล้วหรือยัง?)';
      } else if (err.error && typeof err.error.error === 'string') {
        message = err.error.error; // server ส่ง { error: "..." }
      } else {
        message = `เกิดข้อผิดพลาด (${err.status})`;
      }
      return throwError(() => Object.assign(new Error(message), { status: err.status }));
    }),
  );
