import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Plan, PlanRequest, Route } from '../models/plan.model';

// แผนจัดส่ง (/plan) และใบงานไรเดอร์ (/route)
@Injectable({ providedIn: 'root' })
export class PlanService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // แผนที่ยืนยันแล้วของวันนี้ (404 ถ้ายังไม่มี)
  getLatest(): Observable<Plan> {
    return this.http.get<Plan>(`${this.api}/plan/latest`);
  }

  // ยืนยันแผน → server แทนที่แผนเดิมของวันนี้และออกรหัสใบงาน 4 หลักให้ทุกคัน
  confirm(body: PlanRequest): Observable<Plan> {
    return this.http.post<Plan>(`${this.api}/plan`, body);
  }

  // หน้าไรเดอร์: เปิดใบงานด้วยรหัส 4 หลัก
  getRouteByCode(code: string): Observable<Route> {
    return this.http.get<Route>(`${this.api}/route/${code}`);
  }

  // ไรเดอร์กดส่งแล้ว / ยกเลิกส่งแล้ว (seq เริ่มที่ 1)
  markStop(code: string, seq: number, done: boolean): Observable<WriteResult> {
    return this.http.put<WriteResult>(`${this.api}/route/${code}/stops/${seq}`, { done });
  }
}
