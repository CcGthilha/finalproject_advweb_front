import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WriteResult } from '../models/api.model';
import { Setting } from '../models/setting.model';

@Injectable({ providedIn: 'root' })
export class SettingService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/settings`;

  get(): Observable<Setting> {
    return this.http.get<Setting>(this.url);
  }

  update(body: Setting): Observable<WriteResult> {
    return this.http.put<WriteResult>(this.url, body);
  }
}
