import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Plan, PlanMapPoint, PlanRequest, Trip } from '../models/plan.model';

// แผนจัดส่ง (/plans) และใบงานไรเดอร์ (/trips)
// ขั้นตอน: create() บันทึกเป็นเวอร์ชันใหม่ (DRAFT) → select() เลือกใช้ (SELECTED) → ไรเดอร์เปิดด้วย jobCode
@Injectable({ providedIn: 'root' })
export class PlanService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  private dateParams(date?: string): HttpParams {
    return date ? new HttpParams().set('date', date) : new HttpParams();
  }

  // ทุกเวอร์ชันของวัน ไว้เทียบกำไร/เวลา (ไม่มี trips)
  list(date?: string): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.api}/plans`, { params: this.dateParams(date) });
  }

  // แผนที่ SELECTED ของวัน (ถ้ายังไม่เลือก = เวอร์ชันล่าสุด) พร้อม trips + stops — 404 ถ้ายังไม่มีแผน
  getLatest(date?: string): Observable<Plan> {
    return this.http.get<Plan>(`${this.api}/plans/latest`, { params: this.dateParams(date) });
  }

  getById(id: number): Observable<Plan> {
    return this.http.get<Plan>(`${this.api}/plans/${id}`);
  }

  getMapPoints(id: number): Observable<PlanMapPoint[]> {
    return this.http.get<PlanMapPoint[]>(`${this.api}/plans/${id}/map`);
  }

  // บันทึกผลคำนวณเป็นเวอร์ชันใหม่ (DRAFT) → server คืนแผนพร้อมเลขใบงาน
  create(body: PlanRequest): Observable<Plan> {
    return this.http.post<Plan>(`${this.api}/plans`, body);
  }

  // เลือกแผนนี้ไปใช้จริง (แผนอื่นของวันเดียวกัน → REJECTED)
  select(id: number): Observable<Plan> {
    return this.http.put<Plan>(`${this.api}/plans/${id}/select`, {});
  }

  // ลบแผนที่ไม่ได้เลือก
  delete(id: number): Observable<WriteResult> {
    return this.http.delete<WriteResult>(`${this.api}/plans/${id}`);
  }

  // หน้าไรเดอร์: เปิดใบงานด้วยเลขใบงาน (เฉพาะแผนที่ SELECTED)
  getTrip(jobCode: string): Observable<Trip> {
    return this.http.get<Trip>(`${this.api}/trips/${encodeURIComponent(jobCode)}`);
  }

  // ไรเดอร์กดส่งแล้ว / ยกเลิก → server คืนใบงานที่อัปเดตแล้ว
  markDelivered(jobCode: string, seq: number, delivered: boolean): Observable<Trip> {
    return this.http.put<Trip>(`${this.api}/trips/${encodeURIComponent(jobCode)}/stops/${seq}`, { delivered });
  }
}
