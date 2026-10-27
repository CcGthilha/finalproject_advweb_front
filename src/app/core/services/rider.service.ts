import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Rider, RiderRequest } from '../models/rider.model';

// ไรเดอร์ (/riders) — หน้า dispatch ใช้ getAll() เอา riderId ไปผูกกับใบงาน
@Injectable({ providedIn: 'root' })
export class RiderService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/riders`;

  getAll(): Observable<Rider[]> {
    return this.http.get<Rider[]>(this.url);
  }

  getById(id: number): Observable<Rider> {
    return this.http.get<Rider>(`${this.url}/${id}`);
  }

  create(body: RiderRequest): Observable<WriteResult> {
    return this.http.post<WriteResult>(this.url, body);
  }

  update(id: number, body: Partial<RiderRequest>): Observable<WriteResult> {
    return this.http.put<WriteResult>(`${this.url}/${id}`, body);
  }

  // soft delete
  delete(id: number): Observable<WriteResult> {
    return this.http.delete<WriteResult>(`${this.url}/${id}`);
  }
}
